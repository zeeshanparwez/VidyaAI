"""Subject model — also serves as 'Course' when published."""

from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(300), nullable=False)
    code = Column(String(50), nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    term_start = Column(Date, nullable=True)
    term_end = Column(Date, nullable=True)
    description = Column(String(1000), nullable=True)
    is_published = Column(Boolean, default=False)  # When True, students can browse/enroll
    created_at = Column(DateTime, server_default=func.now())

    announcements = relationship("Announcement", back_populates="subject", foreign_keys="[Announcement.subject_id]")

