"""Analytics routes — feedback analysis and schedule adjustment views."""

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.syllabus import SyllabusUnit
from models.session_plan import SessionPlan
from models.quiz import Quiz, QuizResponse
from models.agent_decision import AgentDecision
from models.enrollment import Enrollment
from models.user import User
from models.subject import Subject
from schemas.schemas import AnalyticsSummary, AgentDecisionOut
from agents.feedback_agent import FeedbackAgent
from agents.adaptive_scheduling_agent import AdaptiveSchedulingAgent
from services.ai_service import AIService

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/{subject_id}", response_model=AnalyticsSummary)
def get_analytics(subject_id: int, db: Session = Depends(get_db)):
    """Get analytics summary for a subject."""
    units = db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == subject_id).all()
    sessions = db.query(SessionPlan).filter(SessionPlan.subject_id == subject_id).all()
    quizzes = db.query(Quiz).filter(Quiz.subject_id == subject_id).all()

    # Calculate quiz scores
    all_scores = []
    for quiz in quizzes:
        responses = db.query(QuizResponse).filter(QuizResponse.quiz_id == quiz.id).all()
        for r in responses:
            if r.score is not None:
                all_scores.append(r.score)

    avg_score = sum(all_scores) / len(all_scores) if all_scores else None

    # Get weak topics from feedback agent
    feedback_agent = FeedbackAgent(db)
    feedback_result = feedback_agent.execute({"subject_id": subject_id})
    weak_topics = [w.get("topic", "") for w in feedback_result.data.get("weak_concepts", [])]

    # Count agent decisions
    decisions_count = db.query(AgentDecision).filter(AgentDecision.subject_id == subject_id).count()

    return AnalyticsSummary(
        subject_id=subject_id,
        total_units=len(units),
        completed_units=sum(1 for u in units if u.status == "completed"),
        partial_units=sum(1 for u in units if u.status == "partial"),
        pending_units=sum(1 for u in units if u.status == "pending"),
        total_sessions=len(sessions),
        total_quizzes=len(quizzes),
        average_quiz_score=round(avg_score, 1) if avg_score else None,
        weak_topics=weak_topics,
        agent_decisions_count=decisions_count,
    )


@router.get("/schedule/{subject_id}")
def get_schedule_adjustments(subject_id: int, db: Session = Depends(get_db)):
    """Get schedule adjustment recommendations."""
    # Run feedback analysis
    feedback_agent = FeedbackAgent(db)
    feedback_result = feedback_agent.execute({"subject_id": subject_id})

    # Run adaptive scheduling
    adaptive_agent = AdaptiveSchedulingAgent(db)
    adaptive_result = adaptive_agent.execute({
        "subject_id": subject_id,
        "weak_concepts": feedback_result.data.get("weak_concepts", []),
    })

    return {
        "feedback": feedback_result.data,
        "schedule_adjustments": adaptive_result.data,
        "reasoning": adaptive_result.reasoning,
    }


@router.get("/decisions/{subject_id}", response_model=list[AgentDecisionOut])
def get_agent_decisions(subject_id: int, limit: int = 20, db: Session = Depends(get_db)):
    """Get recent agent decisions for auditability."""
    return db.query(AgentDecision).filter(
        AgentDecision.subject_id == subject_id
    ).order_by(AgentDecision.created_at.desc()).limit(limit).all()


@router.get("/heatmap/{subject_id}")
def get_heatmap(subject_id: int, db: Session = Depends(get_db)):
    """Student × Topic performance heatmap.

    Returns topics (from quizzes), enrolled students, and each student's
    score per topic. Score is null when no quiz exists for a topic or the
    student has not yet submitted.
    """
    # All quizzes for this subject that have a linked unit
    quizzes = db.query(Quiz).filter(
        Quiz.subject_id == subject_id,
        Quiz.syllabus_unit_id.isnot(None),
    ).order_by(Quiz.created_at).all()

    # Map unit_id → quiz list (multiple quizzes can cover the same unit)
    unit_quiz_map: dict[int, list] = {}
    for q in quizzes:
        unit_quiz_map.setdefault(q.syllabus_unit_id, []).append(q)

    # Ordered topic list
    units = db.query(SyllabusUnit).filter(
        SyllabusUnit.subject_id == subject_id,
        SyllabusUnit.id.in_(list(unit_quiz_map.keys())),
    ).order_by(SyllabusUnit.order).all()

    topics = [{"unit_id": u.id, "title": u.title, "status": u.status} for u in units]

    # Enrolled students
    enrollments = db.query(Enrollment).filter(
        Enrollment.subject_id == subject_id,
        Enrollment.status == "active",
    ).all()
    student_ids = [e.student_id for e in enrollments]
    students_db = db.query(User).filter(User.id.in_(student_ids)).all()
    student_map = {s.id: s.name for s in students_db}

    # Pre-fetch all responses for these quizzes
    quiz_ids = [q.id for q in quizzes]
    responses = db.query(QuizResponse).filter(
        QuizResponse.quiz_id.in_(quiz_ids)
    ).all() if quiz_ids else []

    # Build lookup: (student_id, quiz_id) -> score
    resp_lookup: dict[tuple, float] = {}
    for r in responses:
        if r.score is not None and r.total_questions:
            pct = round((r.score / r.total_questions) * 100, 1)
            resp_lookup[(r.student_id, r.quiz_id)] = pct

    # Build student rows
    student_rows = []
    for sid in student_ids:
        scores = {}
        for unit in units:
            unit_quizzes = unit_quiz_map.get(unit.id, [])
            unit_scores = [
                resp_lookup[(sid, q.id)]
                for q in unit_quizzes
                if (sid, q.id) in resp_lookup
            ]
            scores[unit.id] = round(sum(unit_scores) / len(unit_scores), 1) if unit_scores else None
        student_rows.append({
            "student_id": sid,
            "student_name": student_map.get(sid, f"Student {sid}"),
            "scores": scores,
        })

    # Sort students alphabetically
    student_rows.sort(key=lambda x: x["student_name"])

    return {
        "subject_id": subject_id,
        "topics": topics,
        "students": student_rows,
        "total_students": len(student_rows),
        "total_topics_assessed": len(topics),
    }


@router.get("/report/{subject_id}")
def get_term_report(subject_id: int, db: Session = Depends(get_db)):
    """Generate an AI end-of-term progress report for a subject."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    subject_name = subject.name if subject else "Subject"

    units = db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == subject_id).all()
    sessions = db.query(SessionPlan).filter(SessionPlan.subject_id == subject_id).all()
    quizzes = db.query(Quiz).filter(Quiz.subject_id == subject_id).all()

    completed_units = [u for u in units if u.status == "completed"]
    partial_units = [u for u in units if u.status == "partial"]
    pending_units = [u for u in units if u.status == "pending"]

    # Quiz stats
    all_scores = []
    for quiz in quizzes:
        responses = db.query(QuizResponse).filter(QuizResponse.quiz_id == quiz.id).all()
        for r in responses:
            if r.score is not None and r.total_questions:
                all_scores.append(round((r.score / r.total_questions) * 100, 1))

    avg_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else None
    completed_sessions = [s for s in sessions if s.coverage_status == "completed"]

    # Student count
    from models.enrollment import Enrollment
    enr_count = db.query(Enrollment).filter(
        Enrollment.subject_id == subject_id,
        Enrollment.status == "active",
    ).count()

    context = f"""Subject: {subject_name}
Syllabus: {len(completed_units)}/{len(units)} units completed, {len(partial_units)} partial, {len(pending_units)} pending
Sessions: {len(completed_sessions)}/{len(sessions)} sessions completed
Quizzes: {len(quizzes)} quizzes, {len(all_scores)} responses, average score: {avg_score}%
Enrolled students: {enr_count}"""

    try:
        ai = AIService()
        raw = ai.chat(
            system_prompt=(
                "You are an experienced academic progress reviewer. "
                "Generate a concise but comprehensive end-of-term report for a teacher. "
                "Be factual, encouraging, and constructive. Return only valid JSON."
            ),
            user_prompt=f"""{context}

Return JSON with this schema:
{{
  "headline": "one sentence summary of the term",
  "overall_rating": "excellent|good|satisfactory|needs_improvement",
  "highlights": ["..."],
  "areas_for_improvement": ["..."],
  "student_performance_summary": "2-3 sentences on quiz results and engagement",
  "curriculum_delivery_summary": "2-3 sentences on content coverage",
  "recommendations_for_next_term": ["..."],
  "completion_percentage": <number 0-100>
}}""",
            temperature=0.6,
            max_tokens=800,
            response_format={"type": "json_object"},
        )
        report = json.loads(raw)
    except Exception as e:
        report = {"error": str(e)}

    return {
        "subject_id": subject_id,
        "subject_name": subject_name,
        "stats": {
            "total_units": len(units),
            "completed_units": len(completed_units),
            "total_sessions": len(sessions),
            "completed_sessions": len(completed_sessions),
            "total_quizzes": len(quizzes),
            "average_score": avg_score,
            "enrolled_students": enr_count,
        },
        "report": report,
    }
