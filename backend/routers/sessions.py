"""Session management routes — generate and manage prep plans."""

import json
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.session_plan import SessionPlan
from models.subject import Subject
from models.timetable import TimetableEntry
from models.syllabus import SyllabusUnit
from models.agent_decision import FeedbackSignal
from schemas.schemas import SessionGenerateRequest, SessionPlanOut, CoverageUpdate, DailySessionOut
from agents.orchestrator import OrchestrationAgent
from services.ai_service import AIService

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class JournalRequest(BaseModel):
    notes: str


@router.post("/generate")
def generate_session_plan(req: SessionGenerateRequest, db: Session = Depends(get_db)):
    """Generate a daily prep plan using the full agent pipeline."""
    target = req.target_date or date.today()
    # Resolve teacher from request or fall back to subject owner
    teacher_id = req.teacher_id
    if not teacher_id:
        subject = db.query(Subject).filter(Subject.id == req.subject_id).first()
        teacher_id = subject.teacher_id if subject else 1
    orchestrator = OrchestrationAgent(db)
    result = orchestrator.run(
        subject_id=req.subject_id,
        teacher_id=teacher_id,
        target_date=target.isoformat(),
    )
    return result


@router.get("/today")
def get_today_sessions(teacher_id: int, db: Session = Depends(get_db)):
    """Get today's scheduled sessions for a teacher across all subjects.

    Combines timetable entries with session plans and topic info.
    """
    today = date.today()
    day_of_week = today.weekday()  # 0=Monday ... 6=Sunday

    # Get all subjects for this teacher
    subjects = db.query(Subject).filter(Subject.teacher_id == teacher_id).all()

    sessions = []
    for subject in subjects:
        # Find timetable entries for today
        entries = db.query(TimetableEntry).filter(
            TimetableEntry.subject_id == subject.id,
            TimetableEntry.day_of_week == day_of_week,
        ).order_by(TimetableEntry.start_time).all()

        for entry in entries:
            # Find corresponding session plan for today
            plan = db.query(SessionPlan).filter(
                SessionPlan.subject_id == subject.id,
                SessionPlan.date == today,
            ).first()

            # Find next pending topic
            next_topic = db.query(SyllabusUnit).filter(
                SyllabusUnit.subject_id == subject.id,
                SyllabusUnit.status.in_(["pending", "partial"]),
            ).order_by(SyllabusUnit.order).first()

            topic_name = "No topic assigned"
            topic_id = None
            if plan and plan.title:
                topic_name = plan.title
                topic_id = plan.syllabus_unit_id
            elif next_topic:
                topic_name = next_topic.title
                topic_id = next_topic.id

            sessions.append({
                "time": f"{entry.start_time} - {entry.end_time}",
                "start_time": entry.start_time,
                "end_time": entry.end_time,
                "subject_name": subject.name,
                "subject_code": subject.code or "",
                "subject_id": subject.id,
                "topic": topic_name,
                "topic_id": topic_id,
                "room": entry.room or "",
                "status": plan.status if plan else "not_prepared",
                "plan_id": plan.id if plan else None,
                "coverage_status": plan.coverage_status if plan else "pending",
            })

    # Sort by start time
    sessions.sort(key=lambda x: x["start_time"])

    return {
        "date": today.isoformat(),
        "day_name": DAY_NAMES[day_of_week],
        "total_sessions": len(sessions),
        "sessions": sessions,
    }


@router.get("/{subject_id}", response_model=list[SessionPlanOut])
def list_sessions(subject_id: int, db: Session = Depends(get_db)):
    """List session plans for a subject."""
    return db.query(SessionPlan).filter(
        SessionPlan.subject_id == subject_id
    ).order_by(SessionPlan.date.desc()).all()


@router.get("/plan/{plan_id}", response_model=SessionPlanOut)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    """Get a single session plan."""
    plan = db.query(SessionPlan).filter(SessionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")
    return plan


@router.put("/plan/{plan_id}/coverage", response_model=SessionPlanOut)
def update_coverage(plan_id: int, req: CoverageUpdate, db: Session = Depends(get_db)):
    """Mark session coverage status and add teacher notes."""
    plan = db.query(SessionPlan).filter(SessionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    plan.coverage_status = req.coverage_status
    plan.status = "completed"
    if req.teacher_notes:
        plan.teacher_notes = req.teacher_notes

    # Log feedback signal
    signal = FeedbackSignal(
        session_plan_id=plan.id,
        subject_id=plan.subject_id,
        signal_type="coverage_update",
        data_json=json.dumps({
            "coverage_status": req.coverage_status,
            "teacher_notes": req.teacher_notes,
        }),
    )
    db.add(signal)
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/plan/{plan_id}/journal")
def save_journal(plan_id: int, req: JournalRequest, db: Session = Depends(get_db)):
    """Save teacher post-session journal notes and generate AI insights."""
    plan = db.query(SessionPlan).filter(SessionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    plan.teacher_notes = req.notes
    db.commit()

    # Generate AI insights from journal
    try:
        ai = AIService()
        raw = ai.chat(
            system_prompt=(
                "You are an educational coach. Analyse a teacher's post-session journal entry "
                "and extract structured reflection insights. Return only valid JSON."
            ),
            user_prompt=f"""Session title: {plan.title}
Teacher's journal: {req.notes}

Return JSON with this exact schema:
{{
  "what_went_well": ["..."],
  "challenges": ["..."],
  "improvements": ["..."],
  "student_engagement": "high|medium|low",
  "suggested_follow_up": "one sentence on what to do next session"
}}""",
            temperature=0.5,
            max_tokens=600,
            response_format={"type": "json_object"},
        )
        insights = json.loads(raw)
    except Exception:
        insights = {}

    # Persist as feedback signal
    signal = FeedbackSignal(
        session_plan_id=plan.id,
        subject_id=plan.subject_id,
        signal_type="teacher_journal",
        data_json=json.dumps({"notes": req.notes, "insights": insights}),
    )
    db.add(signal)
    db.commit()

    return {"saved": True, "insights": insights}
