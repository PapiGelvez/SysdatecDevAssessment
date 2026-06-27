from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.get(User, payload.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(username=payload.username, name=payload.name, password=payload.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.get(User, payload.username)
    if not user or user.password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return user


@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.name).all()
