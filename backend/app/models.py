import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .database import Base
from .enums import Category, Priority, Status


def _utcnow():
    return datetime.now(timezone.utc)


# Store the *values* of the enums (e.g. "In Progress") in the DB columns,
# instead of the member names (e.g. "InProgress").
def _enum_col(py_enum, **kwargs):
    return SQLEnum(
        py_enum,
        values_callable=lambda e: [member.value for member in e],
        **kwargs,
    )


class User(Base):
    __tablename__ = "users"

    username = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    password = Column(String, nullable=False)

    tickets = relationship("Ticket", back_populates="owner")
    comments = relationship("Comment", back_populates="author_user")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_name = Column(String, ForeignKey("users.username"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    attachment_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    status = Column(
        _enum_col(Status),
        default=Status.Open,
        nullable=False,
    )

    owner = relationship("User", back_populates="tickets")
    classification = relationship(
        "AIClassification",
        back_populates="ticket",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    comments = relationship(
        "Comment",
        back_populates="ticket",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Comment.created_at",
    )


class AIClassification(Base):
    __tablename__ = "ai_classifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    category = Column(_enum_col(Category), nullable=False)
    summary = Column(Text, nullable=False)
    priority = Column(_enum_col(Priority), nullable=False)
    classified_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    ticket = relationship("Ticket", back_populates="classification")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author = Column(String, ForeignKey("users.username"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    ticket = relationship("Ticket", back_populates="comments")
    author_user = relationship("User", back_populates="comments")
