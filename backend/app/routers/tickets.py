import json
import os
from typing import List

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..enums import Category, Priority, Status
from ..models import AIClassification, Comment, Ticket, User
from ..schemas import (
    ClassificationOut,
    CommentOut,
    StatsOut,
    TicketCreate,
    TicketDetail,
    TicketListItem,
    TicketUpdate,
    TopUser,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])
stats_router = APIRouter(prefix="/stats", tags=["stats"])

ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")

CLASSIFY_SYSTEM_PROMPT = (
    "You are a ticket classification assistant. Respond ONLY with a valid JSON object, "
    "no markdown, no explanation."
)


def _classification_out(c: AIClassification) -> ClassificationOut | None:
    if c is None:
        return None
    return ClassificationOut(
        category=c.category,
        priority=c.priority,
        summary=c.summary,
        classified_at=c.classified_at,
    )


def _list_item(ticket: Ticket) -> TicketListItem:
    return TicketListItem(
        id=ticket.id,
        user_name=ticket.user_name,
        text=ticket.text,
        attachment_url=ticket.attachment_url,
        status=ticket.status,
        created_at=ticket.created_at,
        classification=_classification_out(ticket.classification),
        comment_count=len(ticket.comments),
    )


@router.post("", response_model=TicketListItem, status_code=201)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    owner = db.get(User, payload.user_name)
    if not owner:
        raise HTTPException(status_code=400, detail="Owner user does not exist")

    ticket = Ticket(
        user_name=payload.user_name,
        text=payload.text,
        attachment_url=payload.attachment_url,
        status=Status.Open,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return _list_item(ticket)


@router.get("", response_model=List[TicketListItem])
def list_tickets(db: Session = Depends(get_db)):
    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    return [_list_item(t) for t in tickets]


@router.get("/{ticket_id}", response_model=TicketDetail)
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Map author -> name for comments
    authors = {u.username: u.name for u in db.query(User).all()}
    comments = [
        CommentOut(
            id=c.id,
            author=c.author,
            author_name=authors.get(c.author, c.author),
            text=c.text,
            created_at=c.created_at,
        )
        for c in sorted(ticket.comments, key=lambda c: c.created_at)
    ]

    return TicketDetail(
        id=ticket.id,
        user_name=ticket.user_name,
        text=ticket.text,
        attachment_url=ticket.attachment_url,
        status=ticket.status,
        created_at=ticket.created_at,
        classification=_classification_out(ticket.classification),
        comment_count=len(ticket.comments),
        comments=comments,
    )


@router.patch("/{ticket_id}", response_model=TicketListItem)
def update_ticket(ticket_id: str, payload: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if payload.status is not None:
        ticket.status = payload.status

    if payload.user_name is not None:
        owner = db.get(User, payload.user_name)
        if not owner:
            raise HTTPException(status_code=400, detail="Owner user does not exist")
        ticket.user_name = payload.user_name

    db.commit()
    db.refresh(ticket)
    return _list_item(ticket)


@router.post("/{ticket_id}/classify", response_model=ClassificationOut)
def classify_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY is not configured on the server",
        )

    user_prompt = (
        "Classify this support ticket:\n"
        f"{ticket.text}\n\n"
        "Respond with this exact JSON:\n"
        "{\n"
        '  "category": "Finance | Legal | Procurement | Operations",\n'
        '  "priority": "High | Medium | Low",\n'
        '  "summary": "one sentence summary of the ticket"\n'
        "}"
    )

    client = anthropic.Anthropic(api_key=api_key)
    try:
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=512,
            system=CLASSIFY_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except anthropic.APIError as exc:  # network / auth / rate-limit errors
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {exc}")

    raw = "".join(
        block.text for block in message.content if getattr(block, "type", "") == "text"
    ).strip()

    # Be tolerant of accidental markdown fences.
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        data = json.loads(raw)
        category = Category(data["category"].strip())
        priority = Priority(data["priority"].strip())
        summary = str(data["summary"]).strip()
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not parse AI classification response: {exc}. Raw: {raw}",
        )

    # Replace any existing classification (one-to-one).
    if ticket.classification is not None:
        db.delete(ticket.classification)
        db.flush()

    classification = AIClassification(
        ticket_id=ticket.id,
        category=category,
        priority=priority,
        summary=summary,
    )
    db.add(classification)
    db.commit()
    db.refresh(classification)

    return _classification_out(classification)


@stats_router.get("", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    # by_status
    by_status = {s.value: 0 for s in Status}
    for status, count in (
        db.query(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status).all()
    ):
        key = status.value if hasattr(status, "value") else str(status)
        by_status[key] = count

    # by_category and by_priority come from classifications
    by_category = {c.value: 0 for c in Category}
    for category, count in (
        db.query(AIClassification.category, func.count(AIClassification.id))
        .group_by(AIClassification.category)
        .all()
    ):
        key = category.value if hasattr(category, "value") else str(category)
        by_category[key] = count

    by_priority = {p.value: 0 for p in Priority}
    for priority, count in (
        db.query(AIClassification.priority, func.count(AIClassification.id))
        .group_by(AIClassification.priority)
        .all()
    ):
        key = priority.value if hasattr(priority, "value") else str(priority)
        by_priority[key] = count

    # top 5 users by ticket count
    rows = (
        db.query(User.username, User.name, func.count(Ticket.id).label("ticket_count"))
        .join(Ticket, Ticket.user_name == User.username)
        .group_by(User.username, User.name)
        .order_by(func.count(Ticket.id).desc())
        .limit(5)
        .all()
    )
    top_users = [
        TopUser(username=r[0], name=r[1], ticket_count=r[2]) for r in rows
    ]

    return StatsOut(
        by_status=by_status,
        by_category=by_category,
        by_priority=by_priority,
        top_users=top_users,
    )
