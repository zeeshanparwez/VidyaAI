"""Quiz and QuizResponse models."""

from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, func
from database import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    syllabus_unit_id = Column(Integer, ForeignKey("syllabus_units.id"), nullable=True)
    title = Column(String(500), nullable=False)

    # JSON array of question objects:
    # [{"id":1,"question":"...","options":["A","B","C","D"],"correct":"B","explanation":"..."}]
    questions_json = Column(Text, default="[]")

    quiz_type = Column(String(20), default="manual")  # manual / ai
    status = Column(String(20), default="draft")  # draft / published
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    published_at = Column(DateTime, nullable=True)


class QuizResponse(Base):
    __tablename__ = "quiz_responses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_name = Column(String(200), nullable=True)

    # JSON: {"1": "B", "2": "A", ...}
    answers_json = Column(Text, default="{}")

    score = Column(Float, nullable=True)
    total_questions = Column(Integer, nullable=True)
    submitted_at = Column(DateTime, server_default=func.now())
