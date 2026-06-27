from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .enums import Category, Priority, Status


# ---------- Users ----------
class UserCreate(BaseModel):
    username: str
    name: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    name: str


# ---------- Classification ----------
class ClassificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: Category
    priority: Priority
    summary: str
    classified_at: datetime


# ---------- Comments ----------
class CommentCreate(BaseModel):
    author: str
    text: str


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author: str
    author_name: str
    text: str
    created_at: datetime


# ---------- Tickets ----------
class TicketCreate(BaseModel):
    user_name: str
    text: str
    attachment_url: Optional[str] = None


class TicketUpdate(BaseModel):
    status: Optional[Status] = None
    user_name: Optional[str] = None


class TicketListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_name: str
    text: str
    attachment_url: Optional[str] = None
    status: Status
    created_at: datetime
    classification: Optional[ClassificationOut] = None
    comment_count: int = 0


class TicketDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_name: str
    text: str
    attachment_url: Optional[str] = None
    status: Status
    created_at: datetime
    classification: Optional[ClassificationOut] = None
    comment_count: int = 0
    comments: List[CommentOut] = []


# ---------- Stats ----------
class TopUser(BaseModel):
    username: str
    name: str
    ticket_count: int


class StatsOut(BaseModel):
    by_status: dict
    by_category: dict
    by_priority: dict
    top_users: List[TopUser]
