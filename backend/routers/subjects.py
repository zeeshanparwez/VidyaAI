"""Subject management routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.subject import Subject
from models.user import User
from schemas.schemas import SubjectCreate, SubjectOut

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])


@router.post("/", response_model=SubjectOut)
def create_subject(req: SubjectCreate, db: Session = Depends(get_db)):
    """Create a new subject. Only teachers are allowed."""
    # Verify the user is a teacher
    user = db.query(User).filter(User.id == req.teacher_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create subjects.")

    subject = Subject(**req.model_dump())
    subject.is_published = True  # Auto-publish so students can browse/enroll
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/", response_model=list[SubjectOut])
def list_subjects(teacher_id: int = None, db: Session = Depends(get_db)):
    """List subjects, optionally filtered by teacher."""
    query = db.query(Subject)
    if teacher_id:
        query = query.filter(Subject.teacher_id == teacher_id)
    return query.all()


@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    """Get a single subject."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")
    return subject
