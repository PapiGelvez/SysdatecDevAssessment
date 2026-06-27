from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Comment, Ticket, User
from ..schemas import CommentCreate, CommentOut

router = APIRouter(prefix="/tickets", tags=["comments"])


@router.post("/{ticket_id}/comments", response_model=CommentOut, status_code=201)
def create_comment(ticket_id: str, payload: CommentCreate, db: Session = Depends(get_db)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    author = db.get(User, payload.author)
    if not author:
        raise HTTPException(status_code=400, detail="Author user does not exist")

    comment = Comment(ticket_id=ticket.id, author=payload.author, text=payload.text)
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return CommentOut(
        id=comment.id,
        author=comment.author,
        author_name=author.name,
        text=comment.text,
        created_at=comment.created_at,
    )
