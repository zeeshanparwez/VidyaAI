"""Authentication routes — JWT-based auth with bcrypt password hashing."""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.quiz import Quiz, QuizResponse
from models.enrollment import Enrollment
from models.subject import Subject
from models.syllabus import SyllabusUnit
from models.session_plan import SessionPlan
import json
from schemas.schemas import (
    LoginRequest, LoginResponse, UserOut, UserPreferencesUpdate,
    TokenRefreshRequest, TokenRefreshResponse,
    RegisterRequest, ChangePasswordRequest,
)
from core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    require_current_user,
)
from jose import JWTError
from services.ai_service import AIService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user account."""
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
    if req.role not in ("teacher", "student", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be teacher, student, or admin.")
    user = User(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password, returns JWT access and refresh tokens."""
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Upgrade legacy mock-hash to real bcrypt on first real login
    if user.password_hash == "mock-hash":
        user.password_hash = hash_password(req.password)
        db.commit()

    return LoginResponse(
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh_token(req: TokenRefreshRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    try:
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type.")
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return TokenRefreshResponse(access_token=create_access_token(user.id, user.role))


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    """Change the authenticated user's password."""
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    current_user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated successfully."}


@router.get("/me/{user_id}", response_model=UserOut)
def get_me(user_id: int, db: Session = Depends(get_db)):
    """Get user info by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    """List all users (admin use)."""
    return db.query(User).all()


@router.put("/me/{user_id}/preferences", response_model=UserOut)
def update_preferences(user_id: int, req: UserPreferencesUpdate, db: Session = Depends(get_db)):
    """Update teacher personalisation preferences."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.preferences_json = json.dumps({
        "style": req.style,
        "examples": req.examples,
        "quiz_difficulty": req.quiz_difficulty,
        "pace": req.pace,
    })
    db.commit()
    db.refresh(user)
    return user


@router.get("/me/{user_id}/notifications")
def get_notifications(user_id: int, db: Session = Depends(get_db)):
    """Return real-time notifications derived from DB state."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    notifications = []
    today = date.today()

    if user.role == "teacher":
        subjects = db.query(Subject).filter(Subject.teacher_id == user_id).all()
        for subj in subjects:
            plan = db.query(SessionPlan).filter(
                SessionPlan.subject_id == subj.id,
                SessionPlan.date == today,
            ).first()
            if not plan:
                notifications.append({
                    "type": "warning",
                    "message": f"No prep plan for {subj.name} today",
                    "link": "/session",
                })
        past_pending = db.query(SessionPlan).filter(
            SessionPlan.coverage_status == "pending",
            SessionPlan.date < today,
        ).count()
        if past_pending > 0:
            notifications.append({
                "type": "info",
                "message": f"{past_pending} past session{' needs' if past_pending == 1 else 's need'} coverage update",
                "link": "/session",
            })
        for subj in subjects:
            completed = db.query(SyllabusUnit).filter(
                SyllabusUnit.subject_id == subj.id,
                SyllabusUnit.status == "completed",
            ).count()
            total = db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == subj.id).count()
            if total > 0 and completed == 0:
                notifications.append({
                    "type": "info",
                    "message": f"{subj.name}: syllabus uploaded but no units covered",
                    "link": "/syllabus",
                })

    elif user.role == "student":
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == user_id,
            Enrollment.status == "active",
        ).all()
        for enr in enrollments:
            quizzes = db.query(Quiz).filter(
                Quiz.subject_id == enr.subject_id,
                Quiz.status == "published",
            ).all()
            for quiz in quizzes:
                resp = db.query(QuizResponse).filter(
                    QuizResponse.quiz_id == quiz.id,
                    QuizResponse.student_id == user_id,
                ).first()
                if not resp:
                    notifications.append({
                        "type": "warning",
                        "message": f"Quiz pending: {quiz.title}",
                        "link": f"/quiz/{quiz.id}",
                    })
        low_scores = db.query(QuizResponse).filter(QuizResponse.student_id == user_id).all()
        for r in low_scores:
            if r.score is not None and r.total_questions and (r.score / r.total_questions) < 0.6:
                quiz = db.query(Quiz).filter(Quiz.id == r.quiz_id).first()
                if quiz:
                    notifications.append({
                        "type": "warning",
                        "message": f"Review needed: {quiz.title} ({round(r.score/r.total_questions*100)}% score)",
                        "link": "/",
                    })

    return {"notifications": notifications[:10], "count": len(notifications)}


@router.get("/me/{student_id}/study-plan")
def get_study_plan(student_id: int, db: Session = Depends(get_db)):
    """Generate a personalised study plan for a student using quiz performance and enrolled courses."""
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.status == "active",
    ).all()
    subject_ids = [e.subject_id for e in enrollments]
    subjects = db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
    subject_map = {s.id: s.name for s in subjects}

    quiz_summaries = []
    for enr in enrollments:
        quizzes = db.query(Quiz).filter(
            Quiz.subject_id == enr.subject_id,
            Quiz.status == "published",
        ).all()
        for quiz in quizzes:
            resp = db.query(QuizResponse).filter(
                QuizResponse.quiz_id == quiz.id,
                QuizResponse.student_id == student_id,
            ).first()
            if resp and resp.score is not None and resp.total_questions:
                pct = round((resp.score / resp.total_questions) * 100, 1)
                quiz_summaries.append({
                    "subject": subject_map.get(enr.subject_id, "Unknown"),
                    "topic": quiz.title,
                    "score_pct": pct,
                    "status": "weak" if pct < 60 else "developing" if pct < 80 else "strong",
                })

    upcoming_units = []
    for sid in subject_ids:
        units = db.query(SyllabusUnit).filter(
            SyllabusUnit.subject_id == sid,
            SyllabusUnit.status.in_(["pending", "partial"]),
        ).order_by(SyllabusUnit.order).limit(3).all()
        for u in units:
            upcoming_units.append({"subject": subject_map.get(sid, "Unknown"), "topic": u.title})

    quiz_context = "\n".join(
        f"- {q['subject']}: {q['topic']} — {q['score_pct']}% ({q['status']})"
        for q in quiz_summaries
    ) or "No quiz results yet."

    upcoming_context = "\n".join(
        f"- {u['subject']}: {u['topic']}" for u in upcoming_units
    ) or "No upcoming topics."

    system_prompt = (
        "You are a personalised study coach for university students. "
        "Given a student's quiz performance and upcoming course topics, "
        "generate a realistic, actionable 1-week study plan. "
        "Return ONLY valid JSON matching the schema provided."
    )

    user_prompt = f"""Student: {student.name}
Enrolled courses: {', '.join(subject_map.values()) or 'None'}

Quiz performance:
{quiz_context}

Upcoming topics to prepare:
{upcoming_context}

Return a JSON object with this exact schema:
{{
  "weekly_goal": "one sentence motivational goal for this week",
  "daily_hours_recommended": <number, 1-4>,
  "focus_areas": [
    {{"topic": "...", "subject": "...", "priority": "high|medium|low", "reason": "...", "suggested_hours": <number>}}
  ],
  "daily_schedule": [
    {{"day": "Monday", "tasks": [{{"time": "e.g. 09:00-10:00", "activity": "...", "subject": "..."}}]}}
  ],
  "strengths": ["..."],
  "improvement_tips": ["..."]
}}"""

    try:
        ai = AIService()
        raw = ai.chat(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.6,
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        plan = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    return {
        "student_id": student_id,
        "student_name": student.name,
        "plan": plan,
        "based_on_quizzes": len(quiz_summaries),
        "enrolled_courses": len(subject_ids),
    }
