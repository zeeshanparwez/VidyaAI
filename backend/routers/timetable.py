"""Timetable management routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.timetable import TimetableEntry
from schemas.schemas import TimetableCreate, TimetableOut

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@router.post("/", response_model=TimetableOut)
def create_entry(req: TimetableCreate, db: Session = Depends(get_db)):
    """Create a timetable entry."""
    entry = TimetableEntry(**req.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{subject_id}", response_model=list[TimetableOut])
def get_timetable(subject_id: int, db: Session = Depends(get_db)):
    """Get timetable for a subject."""
    return db.query(TimetableEntry).filter(
        TimetableEntry.subject_id == subject_id
    ).order_by(TimetableEntry.day_of_week, TimetableEntry.start_time).all()


@router.delete("/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    """Delete a timetable entry."""
    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found.")
    db.delete(entry)
    db.commit()
    return {"message": "Deleted successfully."}
