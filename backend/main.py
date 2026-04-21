"""FastAPI application entry point."""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import init_db

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Driven Teacher Session Preparation Portal — helps teachers prepare for classes using AI agents.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from routers import auth, subjects, syllabus, timetable, sessions, quizzes, analytics, courses, announcements, admin
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(syllabus.router)
app.include_router(timetable.router)
app.include_router(sessions.router)
app.include_router(quizzes.router)
app.include_router(analytics.router)
app.include_router(courses.router)
app.include_router(announcements.router)
app.include_router(admin.router)


@app.on_event("startup")
def on_startup():
    """Initialize database tables on startup."""
    init_db()
    logging.info("Database initialized.")


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=2709, reload=True)
