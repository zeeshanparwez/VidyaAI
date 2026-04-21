"""Pydantic schemas for all API request/response models."""

from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


# ── Auth ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "student"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    preferences_json: str = "{}"

    class Config:
        from_attributes = True


class UserPreferencesUpdate(BaseModel):
    style: str = "detailed"           # detailed / concise
    examples: str = "real-world"      # real-world / theoretical
    quiz_difficulty: str = "medium"   # easy / medium / hard
    pace: str = "moderate"            # slow / moderate / fast


# ── Subject / Course ─────────────────────────────────────────────────────

class SubjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    teacher_id: int
    term_start: Optional[date] = None
    term_end: Optional[date] = None
    description: Optional[str] = None


class SubjectOut(BaseModel):
    id: int
    name: str
    code: Optional[str]
    teacher_id: int
    term_start: Optional[date]
    term_end: Optional[date]
    description: Optional[str]
    is_published: bool = False

    class Config:
        from_attributes = True


class CourseOut(BaseModel):
    """Course view for students — same as subject but with enrollment info."""
    id: int
    name: str
    code: Optional[str]
    teacher_id: int
    description: Optional[str]
    is_published: bool
    teacher_name: Optional[str] = None
    enrolled_count: int = 0
    is_enrolled: bool = False

    class Config:
        from_attributes = True


# ── Enrollment ────────────────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    student_id: int


class EnrollmentOut(BaseModel):
    id: int
    student_id: int
    subject_id: int
    status: str
    enrolled_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Syllabus ──────────────────────────────────────────────────────────────

class SyllabusUnitCreate(BaseModel):
    subject_id: int
    title: str
    description: Optional[str] = None
    order: int = 0
    estimated_hours: float = 1.0


class SyllabusUnitOut(BaseModel):
    id: int
    subject_id: int
    title: str
    description: Optional[str]
    order: int
    estimated_hours: float
    status: str
    coverage_notes: Optional[str]

    class Config:
        from_attributes = True


class SyllabusUploadRequest(BaseModel):
    subject_id: int
    content: str  # Raw text or parsed PDF content
    teacher_id: Optional[int] = None  # Used to personalize AI parsing style


class SyllabusStatusUpdate(BaseModel):
    status: str  # pending / partial / completed
    coverage_notes: Optional[str] = None


class SyllabusHierarchyOut(BaseModel):
    """Hierarchical syllabus structure: chapters→topics."""
    subject_id: int
    subject_name: str
    chapters: List[dict] = []  # [{name, topics: [{id, title, description, hours, status}]}]
    total_units: int = 0


# ── Topic Insights ────────────────────────────────────────────────────────

class TopicInsightsOut(BaseModel):
    unit_id: int
    title: str
    description: Optional[str]
    status: str
    key_areas: List[dict] = []
    teaching_flow: dict = {}  # {hook, bridge, deep_dive}
    common_misconceptions: List[dict] = []
    progress: dict = {}
    engagement_metrics: dict = {}


# ── Timetable ─────────────────────────────────────────────────────────────

class TimetableCreate(BaseModel):
    subject_id: int
    day_of_week: int = Field(ge=0, le=6)
    start_time: str
    end_time: str
    room: Optional[str] = None


class TimetableOut(BaseModel):
    id: int
    subject_id: int
    day_of_week: int
    start_time: str
    end_time: str
    room: Optional[str]

    class Config:
        from_attributes = True


# ── Session Plans ─────────────────────────────────────────────────────────

class SessionGenerateRequest(BaseModel):
    subject_id: int
    teacher_id: Optional[int] = None
    target_date: Optional[date] = None  # defaults to today


class SessionPlanOut(BaseModel):
    id: int
    subject_id: int
    syllabus_unit_id: Optional[int]
    date: date
    title: Optional[str]
    plan_json: str
    status: str
    coverage_status: str
    prep_time_minutes: int
    explanation: Optional[str]
    teacher_notes: Optional[str]

    class Config:
        from_attributes = True


class CoverageUpdate(BaseModel):
    coverage_status: str  # pending / partial / completed
    teacher_notes: Optional[str] = None


class DailySessionOut(BaseModel):
    """Daily view showing sessions across all subjects."""
    date: str
    total_sessions: int
    sessions: List[dict] = []  # [{time, subject_name, subject_code, topic, status, plan_id}]


# ── Quizzes ───────────────────────────────────────────────────────────────

class QuizCreateRequest(BaseModel):
    subject_id: int
    syllabus_unit_id: Optional[int] = None
    title: str
    questions_json: str = "[]"  # Manual quiz with pre-built questions


class QuizGenerateRequest(BaseModel):
    subject_id: int
    syllabus_unit_id: Optional[int] = None
    topic: str
    num_questions: int = 5


class QuizOut(BaseModel):
    id: int
    subject_id: int
    syllabus_unit_id: Optional[int]
    title: str
    questions_json: str
    quiz_type: str
    status: str = "draft"
    created_by: Optional[int]
    created_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QuizTeacherView(BaseModel):
    """Teacher quiz dashboard view with participation stats."""
    id: int
    subject_id: int
    syllabus_unit_id: Optional[int]
    title: str
    questions_json: str
    quiz_type: str
    status: str
    subject_name: str = ""
    created_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    enrolled_count: int = 0
    responses_count: int = 0
    is_complete: bool = False


class StudentQuizView(BaseModel):
    """Student quiz view with completion status."""
    id: int
    subject_id: int
    syllabus_unit_id: Optional[int]
    title: str
    questions_json: str
    quiz_type: str
    subject_name: str = ""
    quiz_status: str = "not_started"  # not_started / completed
    score: Optional[float] = None
    total_questions: Optional[int] = None
    created_at: Optional[datetime] = None


class QuizSubmitRequest(BaseModel):
    student_id: int
    student_name: Optional[str] = None
    answers_json: str  # {"1": "B", "2": "A", ...}


class QuizResponseOut(BaseModel):
    id: int
    quiz_id: int
    student_id: int
    student_name: Optional[str]
    answers_json: str
    score: Optional[float]
    total_questions: Optional[int]
    submitted_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Analytics ─────────────────────────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    subject_id: int
    total_units: int
    completed_units: int
    partial_units: int
    pending_units: int
    total_sessions: int
    total_quizzes: int
    average_quiz_score: Optional[float]
    weak_topics: List[str] = []
    agent_decisions_count: int = 0


class ScheduleAdjustment(BaseModel):
    subject_id: int
    original_plan: List[dict] = []
    adjusted_plan: List[dict] = []
    adjustments_made: List[str] = []
    explanation: str = ""


# ── Agent ─────────────────────────────────────────────────────────────────

class AgentDecisionOut(BaseModel):
    id: int
    agent_name: str
    session_plan_id: Optional[int]
    subject_id: Optional[int]
    input_json: str
    output_json: str
    reasoning: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
