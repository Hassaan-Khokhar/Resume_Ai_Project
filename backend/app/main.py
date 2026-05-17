"""Main FastAPI application — The Orchestrator."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import connect_db, close_db
from app.routes import auth, posts, jobs, analyze, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(title="ResumeAI — LinkedIn-Style Platform", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all route modules
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(jobs.router)
app.include_router(analyze.router)
app.include_router(users.router)


@app.get("/")
async def root():
    return {"status": "ok", "app": "ResumeAI Platform", "version": "2.0.0"}
