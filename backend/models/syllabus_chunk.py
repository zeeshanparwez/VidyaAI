"""Syllabus chunk model — stores chunked syllabus content for RAG."""

from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, func
from database import Base


class SyllabusChunk(Base):
    __tablename__ = "syllabus_chunks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
