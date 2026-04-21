"""Quiz management routes — generate from topics, auto-publish, teacher/student views."""

import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.quiz import Quiz, QuizResponse
from models.subject import Subject
from models.user import User
from models.agent_decision import FeedbackSignal
from models.enrollment import Enrollment
from schemas.schemas import (
    QuizGenerateRequest, QuizOut, QuizTeacherView, StudentQuizView,
    QuizSubmitRequest, QuizResponseOut,
)
from agents.quiz_agent import QuizAgent

router = APIRouter(prefix="/api/quizzes", tags=["Quizzes"])


@router.post("/generate", response_model=QuizOut)
def generate_quiz(req: QuizGenerateRequest, db: Session = Depends(get_db)):
    """AI-generate a quiz from a topic. Auto-publishes immediately.

    Only teachers should call this (enforced via frontend routing).
    """
    agent = QuizAgent(db)
    result = agent.execute({
        "subject_id": req.subject_id,
        "topic": req.topic,
        "num_questions": req.num_questions,
    })

    if not result.success:
        raise HTTPException(status_code=500, detail=result.error)

    quiz = Quiz(
        subject_id=req.subject_id,
        syllabus_unit_id=req.syllabus_unit_id,
        title=result.data.get("title", f"Quiz: {req.topic}"),
        questions_json=result.data.get("questions_json", "[]"),
        quiz_type="ai",
        status="published",  # Auto-publish
        published_at=datetime.utcnow(),
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


@router.get("/teacher/{teacher_id}", response_model=list[QuizTeacherView])
def list_teacher_quizzes(teacher_id: int, db: Session = Depends(get_db)):
    """List all quizzes for a teacher's subjects, with participation stats.

    Sorted by created_at DESC (newest first).
    """
    # Verify teacher
    user = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found.")

    # Get all subjects owned by this teacher
    subjects = db.query(Subject).filter(Subject.teacher_id == teacher_id).all()
    subject_map = {s.id: s.name for s in subjects}
    subject_ids = list(subject_map.keys())

    if not subject_ids:
        return []

    # Get all quizzes for these subjects
    quizzes = db.query(Quiz).filter(
        Quiz.subject_id.in_(subject_ids),
    ).order_by(Quiz.created_at.desc()).all()

    result = []
    for quiz in quizzes:
        # Count enrolled students for this subject
        enrolled_count = db.query(Enrollment).filter(
            Enrollment.subject_id == quiz.subject_id,
            Enrollment.status == "active",
        ).count()

        # Count quiz responses
        responses_count = db.query(QuizResponse).filter(
            QuizResponse.quiz_id == quiz.id,
        ).count()

        # Quiz is complete when all enrolled students have responded
        is_complete = (enrolled_count > 0 and responses_count >= enrolled_count)

        result.append(QuizTeacherView(
            id=quiz.id,
            subject_id=quiz.subject_id,
            syllabus_unit_id=quiz.syllabus_unit_id,
            title=quiz.title,
            questions_json=quiz.questions_json,
            quiz_type=quiz.quiz_type,
            status="completed" if is_complete else quiz.status,
            subject_name=subject_map.get(quiz.subject_id, ""),
            created_at=quiz.created_at,
            published_at=quiz.published_at,
            enrolled_count=enrolled_count,
            responses_count=responses_count,
            is_complete=is_complete,
        ))

    return result


@router.get("/student/{student_id}", response_model=list[StudentQuizView])
def list_student_quizzes(student_id: int, db: Session = Depends(get_db)):
    """List published quizzes available to a student with completion status."""
    # Get enrolled subject IDs
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.status == "active",
    ).all()

    subject_ids = [e.subject_id for e in enrollments]
    if not subject_ids:
        return []

    # Get subject names
    subjects = db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
    subject_map = {s.id: s.name for s in subjects}

    # Get published quizzes for these subjects
    quizzes = db.query(Quiz).filter(
        Quiz.subject_id.in_(subject_ids),
        Quiz.status.in_(["published", "completed"]),
    ).order_by(Quiz.created_at.desc()).all()

    result = []
    for quiz in quizzes:
        # Check if student already submitted
        response = db.query(QuizResponse).filter(
            QuizResponse.quiz_id == quiz.id,
            QuizResponse.student_id == student_id,
        ).first()

        questions = json.loads(quiz.questions_json) if quiz.questions_json else []

        result.append(StudentQuizView(
            id=quiz.id,
            subject_id=quiz.subject_id,
            syllabus_unit_id=quiz.syllabus_unit_id,
            title=quiz.title,
            questions_json=quiz.questions_json,
            quiz_type=quiz.quiz_type,
            subject_name=subject_map.get(quiz.subject_id, ""),
            quiz_status="completed" if response else "not_started",
            score=response.score if response else None,
            total_questions=len(questions),
            created_at=quiz.created_at,
        ))

    return result


@router.get("/{subject_id}", response_model=list[QuizOut])
def list_quizzes(subject_id: int, db: Session = Depends(get_db)):
    """List quizzes for a subject."""
    return db.query(Quiz).filter(Quiz.subject_id == subject_id).order_by(Quiz.created_at.desc()).all()


@router.get("/detail/{quiz_id}", response_model=QuizOut)
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    """Get quiz detail."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return quiz


@router.post("/{quiz_id}/submit", response_model=QuizResponseOut)
def submit_quiz(quiz_id: int, req: QuizSubmitRequest, db: Session = Depends(get_db)):
    """Submit a student's quiz response and auto-grade."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    # Check if already submitted
    existing = db.query(QuizResponse).filter(
        QuizResponse.quiz_id == quiz_id,
        QuizResponse.student_id == req.student_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted this quiz.")

    # Auto-grade
    questions = json.loads(quiz.questions_json) if quiz.questions_json else []
    answers = json.loads(req.answers_json) if req.answers_json else {}
    correct = 0
    total = len(questions)

    for q in questions:
        q_id = str(q.get("id", ""))
        student_answer = answers.get(q_id, "").strip().upper()
        correct_answer = q.get("correct", "").strip().upper()
        if student_answer and correct_answer:
            if student_answer[0] == correct_answer[0]:
                correct += 1

    score = (correct / total * 100) if total > 0 else 0

    response = QuizResponse(
        quiz_id=quiz_id,
        student_id=req.student_id,
        student_name=req.student_name,
        answers_json=req.answers_json,
        score=score,
        total_questions=total,
    )
    db.add(response)

    # Log feedback signal
    signal = FeedbackSignal(
        subject_id=quiz.subject_id,
        signal_type="quiz_result",
        data_json=json.dumps({
            "quiz_id": quiz_id,
            "student_id": req.student_id,
            "score": score,
            "total": total,
        }),
    )
    db.add(signal)
    db.commit()
    db.refresh(response)
    return response


@router.get("/{quiz_id}/responses", response_model=list[QuizResponseOut])
def get_responses(quiz_id: int, db: Session = Depends(get_db)):
    """Get all responses for a quiz."""
    return db.query(QuizResponse).filter(QuizResponse.quiz_id == quiz_id).all()


@router.post("/{quiz_id}/confidence")
def save_confidence(quiz_id: int, body: dict, db: Session = Depends(get_db)):
    """Save a student's confidence self-rating after a quiz (1–5)."""
    student_id = body.get("student_id")
    rating = body.get("rating")
    if not student_id or rating is None:
        raise HTTPException(status_code=400, detail="student_id and rating required.")
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    from models.agent_decision import FeedbackSignal
    signal = FeedbackSignal(
        session_plan_id=None,
        subject_id=quiz.subject_id,
        signal_type="confidence_rating",
        data_json=json.dumps({"quiz_id": quiz_id, "student_id": student_id, "rating": rating}),
    )
    db.add(signal)
    db.commit()
    return {"saved": True}


@router.get("/leaderboard/{subject_id}")
def get_leaderboard(subject_id: int, db: Session = Depends(get_db)):
    """Quiz leaderboard for a subject — ranked by average quiz score."""
    quizzes = db.query(Quiz).filter(
        Quiz.subject_id == subject_id,
        Quiz.status == "published",
    ).all()
    quiz_ids = [q.id for q in quizzes]

    if not quiz_ids:
        return {"subject_id": subject_id, "leaderboard": [], "total_quizzes": 0}

    responses = db.query(QuizResponse).filter(
        QuizResponse.quiz_id.in_(quiz_ids),
    ).all()

    # Aggregate per student
    student_stats: dict[int, dict] = {}
    for r in responses:
        if r.score is None or not r.total_questions:
            continue
        pct = round((r.score / r.total_questions) * 100, 1)
        if r.student_id not in student_stats:
            student_stats[r.student_id] = {"total_pct": 0, "count": 0, "name": r.student_name or f"Student {r.student_id}"}
        student_stats[r.student_id]["total_pct"] += pct
        student_stats[r.student_id]["count"] += 1

    # Build ranked list
    ranked = []
    for sid, stats in student_stats.items():
        avg = round(stats["total_pct"] / stats["count"], 1)
        ranked.append({
            "student_id": sid,
            "student_name": stats["name"],
            "average_score": avg,
            "quizzes_completed": stats["count"],
        })

    # Try to enrich names from User table
    student_ids = list(student_stats.keys())
    users = db.query(User).filter(User.id.in_(student_ids)).all()
    user_map = {u.id: u.name for u in users}
    for entry in ranked:
        entry["student_name"] = user_map.get(entry["student_id"], entry["student_name"])

    ranked.sort(key=lambda x: (-x["average_score"], -x["quizzes_completed"]))
    for i, entry in enumerate(ranked):
        entry["rank"] = i + 1

    return {
        "subject_id": subject_id,
        "leaderboard": ranked,
        "total_quizzes": len(quiz_ids),
    }
