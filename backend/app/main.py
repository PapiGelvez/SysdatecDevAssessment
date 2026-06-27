from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import comments, tickets, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="AI Ticket Workspace API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(tickets.stats_router, prefix="/api")
app.include_router(comments.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
