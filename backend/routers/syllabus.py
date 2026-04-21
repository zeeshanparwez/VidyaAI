"""Syllabus management routes — upload (text + file), chunking, topic insights."""

import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.syllabus import SyllabusUnit
from models.subject import Subject
from models.session_plan import SessionPlan
from models.quiz import Quiz, QuizResponse
from models.user import User
from schemas.schemas import (
    SyllabusUnitCreate, SyllabusUnitOut, SyllabusUploadRequest,
    SyllabusStatusUpdate, TopicInsightsOut, SyllabusHierarchyOut,
)
from services.ai_service import ai_service
from services.vector_store import vector_store
from services.chunking_service import (
    chunk_text, extract_text_from_pdf, extract_text_from_docx,
    process_syllabus_chunked, _estimate_tokens,
)

router = APIRouter(prefix="/api/syllabus", tags=["Syllabus"])

LARGE_TEXT_THRESHOLD = 4000  # characters — above this, use chunking


@router.post("/upload", response_model=list[SyllabusUnitOut])
def upload_syllabus(req: SyllabusUploadRequest, db: Session = Depends(get_db)):
    """Upload syllabus text and parse it into units using AI.

    For large inputs (>4000 chars), uses chunking to avoid context window overflow.
    """
    content = req.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty.")

    # Route through chunking for large inputs
    if len(content) > LARGE_TEXT_THRESHOLD:
        units = process_syllabus_chunked(
            subject_id=req.subject_id,
            full_text=content,
            db=db,
            ai_service=ai_service,
            vector_store=vector_store,
        )
        return units

    # Load teacher preferences for personalised parsing
    teacher_prefs = {}
    if req.teacher_id:
        teacher = db.query(User).filter(User.id == req.teacher_id).first()
        if teacher and teacher.preferences_json:
            try:
                teacher_prefs = json.loads(teacher.preferences_json)
            except Exception:
                pass

    style_hint = ""
    if teacher_prefs:
        style = teacher_prefs.get("style", "detailed")
        examples = teacher_prefs.get("examples", "real-world")
        style_hint = f"\nTeacher preference: {style} descriptions, favour {examples} examples when writing topic descriptions."

    # Small input — process directly (original behavior)
    parse_prompt = f"""Parse the following syllabus content into structured units/topics.
Return a JSON array of objects with: title, description, estimated_hours, chapter (parent chapter name if identifiable).
Order them logically as they should be taught.{style_hint}

Syllabus Content:
{content}

Respond with JSON array only:
[{{"title": "...", "description": "...", "estimated_hours": 1.0, "chapter": "Chapter Name"}}]"""

    parsed = ai_service.chat_json(
        system_prompt="You are an expert curriculum designer. Parse syllabus content into structured teaching units.",
        user_prompt=parse_prompt,
    )

    # Handle both list and dict responses
    units_data = parsed if isinstance(parsed, list) else parsed.get("units", parsed.get("topics", [parsed]))

    existing_count = db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == req.subject_id).count()
    created_units = []
    for i, unit_data in enumerate(units_data):
        if isinstance(unit_data, dict) and "title" in unit_data:
            unit = SyllabusUnit(
                subject_id=req.subject_id,
                title=unit_data["title"],
                description=unit_data.get("description", ""),
                order=existing_count + i + 1,
                estimated_hours=float(unit_data.get("estimated_hours", 1.0)),
                status="pending",
            )
            db.add(unit)
            created_units.append(unit)

    db.commit()
    for u in created_units:
        db.refresh(u)

    # Index into vector store for RAG
    texts = [f"{u.title}: {u.description}" for u in created_units]
    if texts:
        embeddings = ai_service.embed(texts)
        metadata = [{"unit_id": u.id, "subject_id": req.subject_id} for u in created_units]
        vector_store.add(texts, embeddings, metadata)

    return created_units


@router.post("/upload-file", response_model=list[SyllabusUnitOut])
async def upload_syllabus_file(
    subject_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a syllabus document (PDF, DOCX, TXT) and parse into units.

    Automatically extracts text and uses chunking for large files.
    """
    file_bytes = await file.read()
    filename = file.filename.lower() if file.filename else ""

    # Extract text based on file type
    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif filename.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
    elif filename.endswith(".txt") or filename.endswith(".md"):
        text = file_bytes.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {filename}. Supported: PDF, DOCX, TXT, MD",
        )

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the file.")

    # Always use chunking for file uploads (files tend to be large)
    units = process_syllabus_chunked(
        subject_id=subject_id,
        full_text=text,
        db=db,
        ai_service=ai_service,
        vector_store=vector_store,
    )
    return units


@router.post("/units", response_model=SyllabusUnitOut)
def create_unit(req: SyllabusUnitCreate, db: Session = Depends(get_db)):
    """Manually create a syllabus unit."""
    unit = SyllabusUnit(**req.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/{subject_id}", response_model=list[SyllabusUnitOut])
def get_syllabus(subject_id: int, db: Session = Depends(get_db)):
    """Get all syllabus units for a subject."""
    return db.query(SyllabusUnit).filter(
        SyllabusUnit.subject_id == subject_id
    ).order_by(SyllabusUnit.order).all()


@router.get("/{subject_id}/hierarchy")
def get_syllabus_hierarchy(subject_id: int, db: Session = Depends(get_db)):
    """Get syllabus as a hierarchical structure (chapters → topics)."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    units = db.query(SyllabusUnit).filter(
        SyllabusUnit.subject_id == subject_id
    ).order_by(SyllabusUnit.order).all()

    # Group units by chapter (extract from description or use "General")
    chapters_map = {}
    for unit in units:
        # Try to find chapter from description or default
        chapter_name = "General"
        if unit.description:
            # Check if the description mentions a chapter
            desc_lower = unit.description.lower()
            if "chapter" in desc_lower or "unit" in desc_lower:
                parts = unit.description.split(":", 1)
                if len(parts) > 1:
                    chapter_name = parts[0].strip()

        if chapter_name not in chapters_map:
            chapters_map[chapter_name] = []

        chapters_map[chapter_name].append({
            "id": unit.id,
            "title": unit.title,
            "description": unit.description,
            "estimated_hours": unit.estimated_hours,
            "status": unit.status,
            "order": unit.order,
        })

    chapters = [
        {"name": name, "topics": topics}
        for name, topics in chapters_map.items()
    ]

    return {
        "subject_id": subject_id,
        "subject_name": subject.name,
        "chapters": chapters,
        "total_units": len(units),
    }


@router.get("/topic/{unit_id}/insights", response_model=TopicInsightsOut)
def get_topic_insights(unit_id: int, db: Session = Depends(get_db)):
    """Get AI-generated topic-level insights: key areas, teaching flow, misconceptions, etc."""
    unit = db.query(SyllabusUnit).filter(SyllabusUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Topic not found.")

    subject = db.query(Subject).filter(Subject.id == unit.subject_id).first()
    subject_name = subject.name if subject else "Unknown"

    # Get quiz performance for this topic
    quizzes = db.query(Quiz).filter(Quiz.syllabus_unit_id == unit_id).all()
    quiz_scores = []
    total_responses = 0
    for quiz in quizzes:
        responses = db.query(QuizResponse).filter(QuizResponse.quiz_id == quiz.id).all()
        for r in responses:
            if r.score is not None:
                quiz_scores.append(r.score)
                total_responses += 1

    avg_score = sum(quiz_scores) / len(quiz_scores) if quiz_scores else None

    # Get session coverage for this topic
    sessions = db.query(SessionPlan).filter(SessionPlan.syllabus_unit_id == unit_id).all()
    sessions_completed = sum(1 for s in sessions if s.coverage_status == "completed")

    # Generate AI insights with chunking-safe prompt (minimal context usage)
    insight_prompt = f"""Generate detailed teaching insights for the topic: "{unit.title}"
Subject: {subject_name}
Topic description: {unit.description or 'No description available'}
Coverage status: {unit.status}
Quiz average score: {f'{avg_score:.0f}%' if avg_score else 'No data yet'}

Return a JSON object with:
1. "key_areas": [{{"area": "...", "importance": "high/medium/low", "description": "..."}}]
2. "teaching_flow": {{
    "hook": "An engaging opening hook (2-3 min)",
    "bridge": "Bridge from prior knowledge to new (5 min)",
    "deep_dive": "Core instruction and practice (20 min)",
    "summary": "Wrap-up and key takeaway (3-5 min)"
}}
3. "common_misconceptions": [{{"misconception": "...", "correction": "...", "how_to_address": "..."}}]

Respond with JSON only."""

    insights = ai_service.chat_json(
        system_prompt="You are an expert pedagogy advisor. Generate actionable teaching insights.",
        user_prompt=insight_prompt,
    )

    return TopicInsightsOut(
        unit_id=unit.id,
        title=unit.title,
        description=unit.description,
        status=unit.status,
        key_areas=insights.get("key_areas", []),
        teaching_flow=insights.get("teaching_flow", {}),
        common_misconceptions=insights.get("common_misconceptions", []),
        progress={
            "coverage_status": unit.status,
            "sessions_generated": len(sessions),
            "sessions_completed": sessions_completed,
        },
        engagement_metrics={
            "total_quizzes": len(quizzes),
            "total_responses": total_responses,
            "average_score": round(avg_score, 1) if avg_score else None,
        },
    )


@router.put("/units/{unit_id}/status", response_model=SyllabusUnitOut)
def update_unit_status(unit_id: int, req: SyllabusStatusUpdate, db: Session = Depends(get_db)):
    """Mark a syllabus unit coverage status."""
    unit = db.query(SyllabusUnit).filter(SyllabusUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found.")
    unit.status = req.status
    if req.coverage_notes:
        unit.coverage_notes = req.coverage_notes
    db.commit()
    db.refresh(unit)
    return unit
