"""User model — teachers, students, and admins."""

from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False, default="mock-hash")
    role = Column(String(20), nullable=False, default="teacher")  # teacher / student / admin
    preferences_json = Column(Text, default="{}")  # Teacher preferences for personalization
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    announcements = relationship("Announcement", back_populates="teacher", foreign_keys="[Announcement.teacher_id]")
