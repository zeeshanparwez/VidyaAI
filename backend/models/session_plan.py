"""Session plan model — generated daily preparation plans."""

from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, DateTime, func
from database import Base


class SessionPlan(Base):
    __tablename__ = "session_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    syllabus_unit_id = Column(Integer, ForeignKey("syllabus_units.id"), nullable=True)
    date = Column(Date, nullable=False)
    title = Column(String(500), nullable=True)

    # JSON blob: key_concepts, misconceptions, explanation_flow, examples, quick_questions
    plan_json = Column(Text, default="{}")

    # Status of the session plan
    status = Column(String(20), default="generated")  # generated / reviewed / completed
    coverage_status = Column(String(20), default="pending")  # pending / partial / completed

    # Prep time estimate in minutes (must be <= 30)
    prep_time_minutes = Column(Integer, default=30)

    # Explainability — why this content was chosen
    explanation = Column(Text, nullable=True)

    # Teacher notes after session
    teacher_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
