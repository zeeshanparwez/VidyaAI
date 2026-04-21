"""Chunking service — splits large text, extracts text from PDF/DOCX files.

Prevents LLM context window overflow by:
1. Splitting text into token-safe chunks
2. Processing each chunk individually
3. Merging structured results
"""

from __future__ import annotations
import io, logging, re, json
from typing import List, Optional
from config import settings

logger = logging.getLogger(__name__)


def _estimate_tokens(text: str) -> int:
    """Rough estimate: 1 token ≈ 4 characters for English text."""
    return len(text) // 4


def chunk_text(
    text: str,
    max_tokens: int = None,
    overlap_tokens: int = None,
) -> List[str]:
    """Split text into chunks respecting sentence boundaries.

    Each chunk will be at most max_tokens (estimated) in size.
    Consecutive chunks overlap by overlap_tokens for context continuity.
    """
    max_tokens = max_tokens or settings.CHUNK_MAX_TOKENS
    overlap_tokens = overlap_tokens or settings.CHUNK_OVERLAP_TOKENS
    max_chars = max_tokens * 4
    overlap_chars = overlap_tokens * 4

    if _estimate_tokens(text) <= max_tokens:
        return [text]

    # Split by sentences (period, newline, or double-newline)
    sentences = re.split(r'(?<=[.!?\n])\s+', text)
    chunks: List[str] = []
    current_chunk = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        test = current_chunk + " " + sentence if current_chunk else sentence
        if len(test) > max_chars and current_chunk:
            chunks.append(current_chunk.strip())
            # Keep overlap from the end of the previous chunk
            overlap_text = current_chunk[-overlap_chars:] if len(current_chunk) > overlap_chars else current_chunk
            current_chunk = overlap_text + " " + sentence
        else:
            current_chunk = test

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    logger.info(f"Chunked {_estimate_tokens(text)} tokens into {len(chunks)} chunks")
    return chunks


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n\n".join(pages)
    except ImportError:
        logger.warning("PyPDF2 not installed — PDF upload won't work")
        return ""
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except ImportError:
        logger.warning("python-docx not installed — DOCX upload won't work")
        return ""
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ""


def process_syllabus_chunked(
    subject_id: int,
    full_text: str,
    db,
    ai_service,
    vector_store,
) -> List[dict]:
    """Process large syllabus text by chunking, AI-parsing each chunk, and merging.

    Returns a list of structured unit dicts: [{title, description, estimated_hours}, ...]
    """
    from models.syllabus import SyllabusUnit
    from models.syllabus_chunk import SyllabusChunk

    chunks = chunk_text(full_text)

    # Store chunks in DB for future RAG retrieval
    for i, chunk in enumerate(chunks):
        db_chunk = SyllabusChunk(
            subject_id=subject_id,
            chunk_index=i,
            chunk_text=chunk,
            token_count=_estimate_tokens(chunk),
        )
        db.add(db_chunk)
    db.flush()

    # Process each chunk through AI separately to avoid context overflow
    all_units_data = []
    for i, chunk in enumerate(chunks):
        logger.info(f"Processing chunk {i+1}/{len(chunks)} (~{_estimate_tokens(chunk)} tokens)")

        parse_prompt = f"""Parse the following syllabus content (chunk {i+1} of {len(chunks)}) into structured units/topics.
Return a JSON array of objects with: title, description, estimated_hours, chapter (parent chapter name if identifiable).
Order them logically. If this is a continuation of a previous chunk, just list the new topics found in THIS chunk.

Syllabus Content (chunk {i+1}):
{chunk}

Respond with JSON array only:
[{{"title": "...", "description": "...", "estimated_hours": 1.0, "chapter": "..."}}]"""

        parsed = ai_service.chat_json(
            system_prompt="You are an expert curriculum designer. Parse syllabus content into structured teaching units. Return ONLY a JSON array.",
            user_prompt=parse_prompt,
        )

        units_data = parsed if isinstance(parsed, list) else parsed.get("units", parsed.get("topics", []))
        if isinstance(units_data, list):
            all_units_data.extend(units_data)

    # De-duplicate by title (in case overlapping chunks produce duplicates)
    seen_titles = set()
    unique_units = []
    for unit in all_units_data:
        if isinstance(unit, dict) and "title" in unit:
            title_key = unit["title"].strip().lower()
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique_units.append(unit)

    # Create SyllabusUnit records
    existing_count = db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == subject_id).count()
    created_units = []
    for i, unit_data in enumerate(unique_units):
        unit = SyllabusUnit(
            subject_id=subject_id,
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
        metadata = [{"unit_id": u.id, "subject_id": subject_id} for u in created_units]
        vector_store.add(texts, embeddings, metadata)

    return created_units
