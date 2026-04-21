"""Announcement board — teachers post, students read."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models.announcement import Announcement
from models.enrollment import Enrollment
from models.user import User

router = APIRouter(prefix="/api/announcements", tags=["Announcements"])


class AnnouncementCreate(BaseModel):
    teacher_id: int
    subject_id: Optional[int] = None
    title: str
    body: str
    priority: str = "info"  # info | reminder | urgent
    pinned: bool = False


class AnnouncementOut(BaseModel):
    id: int
    subject_id: Optional[int]
    teacher_id: int
    teacher_name: str
    title: str
    body: str
    priority: str
    pinned: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/", response_model=AnnouncementOut, status_code=201)
def create_announcement(req: AnnouncementCreate, db: Session = Depends(get_db)):
    teacher = db.query(User).filter(User.id == req.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found.")
    ann = Announcement(
        teacher_id=req.teacher_id,
        subject_id=req.subject_id,
        title=req.title,
        body=req.body,
        priority=req.priority,
        pinned=req.pinned,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return _out(ann, teacher.name)


@router.get("/teacher/{teacher_id}")
def get_teacher_announcements(teacher_id: int, db: Session = Depends(get_db)):
    """All announcements posted by a teacher."""
    anns = (
        db.query(Announcement)
        .filter(Announcement.teacher_id == teacher_id)
        .order_by(Announcement.pinned.desc(), Announcement.created_at.desc())
        .all()
    )
    teacher = db.query(User).filter(User.id == teacher_id).first()
    name = teacher.name if teacher else "Unknown"
    return [_out(a, name) for a in anns]


@router.get("/student/{student_id}")
def get_student_announcements(student_id: int, db: Session = Depends(get_db)):
    """Announcements for all subjects the student is enrolled in."""
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.status == "active",
    ).all()
    subject_ids = [e.subject_id for e in enrollments]

    anns = (
        db.query(Announcement)
        .filter(Announcement.subject_id.in_(subject_ids))
        .order_by(Announcement.pinned.desc(), Announcement.created_at.desc())
        .all()
    )
    teacher_cache: dict[int, str] = {}
    result = []
    for a in anns:
        if a.teacher_id not in teacher_cache:
            t = db.query(User).filter(User.id == a.teacher_id).first()
            teacher_cache[a.teacher_id] = t.name if t else "Unknown"
        result.append(_out(a, teacher_cache[a.teacher_id]))
    return result


@router.put("/{ann_id}/pin")
def toggle_pin(ann_id: int, db: Session = Depends(get_db)):
    ann = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")
    ann.pinned = not ann.pinned
    db.commit()
    return {"id": ann_id, "pinned": ann.pinned}


@router.delete("/{ann_id}", status_code=204)
def delete_announcement(ann_id: int, db: Session = Depends(get_db)):
    ann = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")
    db.delete(ann)
    db.commit()


def _out(ann: Announcement, teacher_name: str) -> dict:
    return {
        "id": ann.id,
        "subject_id": ann.subject_id,
        "teacher_id": ann.teacher_id,
        "teacher_name": teacher_name,
        "title": ann.title,
        "body": ann.body,
        "priority": ann.priority,
        "pinned": ann.pinned,
        "created_at": ann.created_at,
    }
