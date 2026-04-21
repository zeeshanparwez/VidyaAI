"""Timetable entry model — weekly schedule slots."""

from sqlalchemy import Column, Integer, String, Time, ForeignKey, DateTime, func
from database import Base


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday ... 6=Sunday
    start_time = Column(String(10), nullable=False)  # "09:00"
    end_time = Column(String(10), nullable=False)    # "10:00"
    room = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
