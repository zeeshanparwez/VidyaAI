"""Enrollment model — student-to-course (subject) enrollment."""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint, func
from database import Base


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "subject_id", name="uq_student_subject"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    status = Column(String(20), default="active")  # active / dropped
    enrolled_at = Column(DateTime, server_default=func.now())
