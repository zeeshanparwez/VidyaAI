"""Syllabus unit model — individual topics within a subject."""

from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, func
from database import Base


class SyllabusUnit(Base):
    __tablename__ = "syllabus_units"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, nullable=False, default=0)
    estimated_hours = Column(Float, default=1.0)
    status = Column(String(20), default="pending")  # pending / partial / completed
    coverage_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
