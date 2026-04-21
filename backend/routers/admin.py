"""Admin panel — user management, stats, bulk CSV import."""

import csv, io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models.user import User
from models.subject import Subject
from models.enrollment import Enrollment
from models.session_plan import SessionPlan
from models.quiz import Quiz, QuizResponse
from models.announcement import Announcement
from core.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "student"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_users   = db.query(User).count()
    total_teachers = db.query(User).filter(User.role == "teacher").count()
    total_students = db.query(User).filter(User.role == "student").count()
    total_courses  = db.query(Subject).count()
    published_courses = db.query(Subject).filter(Subject.is_published == True).count()
    total_sessions = db.query(SessionPlan).count()
    completed_sessions = db.query(SessionPlan).filter(SessionPlan.coverage_status == "completed").count()
    total_quizzes  = db.query(Quiz).count()
    total_responses = db.query(QuizResponse).count()
    total_enrollments = db.query(Enrollment).filter(Enrollment.status == "active").count()

    avg_score = None
    responses = db.query(QuizResponse).filter(QuizResponse.score != None, QuizResponse.total_questions != None).all()
    if responses:
        avg_score = round(sum(r.score / r.total_questions * 100 for r in responses) / len(responses), 1)

    return {
        "total_users": total_users,
        "total_teachers": total_teachers,
        "total_students": total_students,
        "total_courses": total_courses,
        "published_courses": published_courses,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "total_quizzes": total_quizzes,
        "total_responses": total_responses,
        "total_enrollments": total_enrollments,
        "avg_quiz_score": avg_score,
    }


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.role, User.name).all()
    result = []
    for u in users:
        courses_taught = 0
        enrolled_in = 0
        if u.role == "teacher":
            courses_taught = db.query(Subject).filter(Subject.teacher_id == u.id).count()
        elif u.role == "student":
            enrolled_in = db.query(Enrollment).filter(
                Enrollment.student_id == u.id, Enrollment.status == "active"
            ).count()
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "courses_taught": courses_taught,
            "enrolled_in": enrolled_in,
            "created_at": u.created_at,
        })
    return result


@router.post("/users", status_code=201)
def create_user(req: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    if req.role not in ("teacher", "student", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role.")
    user = User(
        name=req.name, email=req.email,
        password_hash=hash_password(req.password),
        role=req.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


@router.put("/users/{user_id}")
def update_user(user_id: int, req: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if req.name:
        user.name = req.name
    if req.email:
        existing = db.query(User).filter(User.email == req.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use.")
        user.email = req.email
    if req.role:
        if req.role not in ("teacher", "student", "admin"):
            raise HTTPException(status_code=400, detail="Invalid role.")
        user.role = req.role
    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    db.delete(user)
    db.commit()


@router.post("/bulk-import")
async def bulk_import_users(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    CSV format: name,email,password,role
    Header row is required. Role must be teacher/student/admin.
    """
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    created, skipped, errors = [], [], []
    for i, row in enumerate(reader, start=2):
        name  = (row.get("name") or "").strip()
        email = (row.get("email") or "").strip().lower()
        pwd   = (row.get("password") or "").strip()
        role  = (row.get("role") or "student").strip().lower()

        if not name or not email:
            errors.append({"row": i, "reason": "Missing name or email"})
            continue
        if role not in ("teacher", "student", "admin"):
            errors.append({"row": i, "reason": f"Invalid role '{role}'"})
            continue
        if db.query(User).filter(User.email == email).first():
            skipped.append({"row": i, "email": email, "reason": "Already exists"})
            continue

        user = User(
            name=name, email=email,
            password_hash=hash_password(pwd or "changeme"),
            role=role,
        )
        db.add(user)
        created.append({"row": i, "name": name, "email": email, "role": role})

    db.commit()
    return {
        "created": len(created),
        "skipped": len(skipped),
        "errors": len(errors),
        "details": {"created": created, "skipped": skipped, "errors": errors},
    }


@router.get("/courses")
def list_courses(db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    result = []
    for s in subjects:
        teacher = db.query(User).filter(User.id == s.teacher_id).first()
        enrolled = db.query(Enrollment).filter(
            Enrollment.subject_id == s.id, Enrollment.status == "active"
        ).count()
        result.append({
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "teacher": teacher.name if teacher else "—",
            "teacher_id": s.teacher_id,
            "enrolled_students": enrolled,
            "is_published": s.is_published,
            "term_start": str(s.term_start) if s.term_start else None,
            "term_end": str(s.term_end) if s.term_end else None,
        })
    return result
