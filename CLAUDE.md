# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
source venv/bin/activate          # activate virtualenv
pip install -r requirements.txt   # install deps
python seed_data.py               # populate demo data (run once)
python main.py                    # start API on http://localhost:2709
```
FastAPI interactive docs: `http://localhost:2709/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev     # start dev server on http://localhost:2708
npm run build   # production build
```

The Vite dev server (port 2708) proxies `/api` requests to the backend (port 2709) — both must be running for the app to work.

## Architecture

### Tech Stack
- **Backend**: FastAPI + Uvicorn (port 2709), SQLAlchemy 2.0 ORM, SQLite (swappable to PostgreSQL via `DATABASE_URL`)
- **Frontend**: React 18 + Vite (port 2708), react-router-dom v6, vanilla CSS
- **AI**: Azure OpenAI — `gpt-4o-mini` (chat) + `text-embedding-ada-002` (embeddings), dual API keys configured separately
- **Agent framework**: LangGraph `StateGraph` for orchestration, LangChain utilities
- **Vector store**: In-memory NumPy cosine similarity (`services/vector_store.py`), implements a Protocol for drop-in FAISS/Pinecone swap

### Backend Structure

```
backend/
├── main.py          # App init, router registration, CORS
├── config.py        # Pydantic Settings from .env
├── database.py      # SQLAlchemy engine, SessionLocal, Base, init_db()
├── seed_data.py     # Demo users, courses, syllabus units, timetable
├── models/          # 9 SQLAlchemy ORM models
├── schemas/         # Pydantic v2 request/response schemas (schemas.py)
├── routers/         # 8 APIRouter modules (~25 endpoints total)
├── agents/          # 9 AI agents + orchestrator
├── services/        # AIService, ChunkingService, VectorStore
└── prompts/         # Centralized prompt templates (templates.py)
```

### Multi-Agent Pipeline (Core Feature)

Triggered by `POST /api/sessions/generate` → `OrchestrationAgent.run(subject_id, teacher_id, target_date)`.

LangGraph executes 7 nodes in sequence:

1. **ScheduleAgent** — DB query only; finds upcoming timetable sessions
2. **SyllabusAgent** — AI prioritizes next topics from pending/partial units
3. **SessionPlanningAgent** — AI scopes session to ≤30 min (`MAX_PREP_TIME_MINUTES` in config)
4. **ContentCurationAgent** — RAG: embed session topic → cosine search (top-k=3 syllabus chunks) → inject as context → AI generates concepts, misconceptions, teaching flow, examples
5. **FeedbackAgent** — AI identifies weak areas from quiz results
6. **AdaptiveSchedulingAgent** — AI rebalances future schedule around weak areas
7. **PersonalizationAgent** — AI adapts output style to teacher's `preferences_json`

All agents inherit from `BaseAgent` and call `log_decision()` to persist inputs/outputs/reasoning to `agent_decisions` table for full explainability.

### RAG Pipeline

**Ingestion** (syllabus upload):
- `ChunkingService` splits text into 2000-token chunks with 200-token overlap; PDF/DOCX supported
- Each chunk → `AIService.embed()` → stored in `InMemoryVectorStore` + persisted as `SyllabusChunk` in DB

**Retrieval** (during content curation):
- Session topic → embed → cosine similarity search → top-3 chunks injected as LLM context

### Database Models

`Subject` doubles as "course" — `is_published=True` makes it visible to students. Key JSON blob columns: `SessionPlan.plan_data`, `Quiz.questions_json`, `User.preferences_json`.

```
users → subjects → syllabus_units
                 → syllabus_chunks  (RAG)
                 → timetable_entries
                 → session_plans
                 → quizzes → quiz_responses
                 → agent_decisions  (audit log)
enrollments (users ↔ subjects)
feedback_signals
```

### Frontend Structure

`api.js` is the single REST client — all 25+ API calls are exported functions from this file. Role-based routing in `App.jsx` gates teacher vs. student pages. `Sidebar.jsx` renders role-aware navigation.

**Teacher pages**: Dashboard, SyllabusUpload, Timetable, SessionPrep (main AI trigger), QuizManager, Analytics  
**Student pages**: StudentDashboard, CourseBrowser, StudentQuiz

## Configuration

All secrets live in `backend/.env`:

```
AZURE_API_KEY=...                   # chat completions (Key 1)
AZURE_API_KEY_2=...                 # embeddings (Key 2)
AZURE_API_BASE=https://...openai.azure.com/
AZURE_API_VERSION=2024-10-21
AZURE_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
DATABASE_URL=sqlite:///./teaching_app.db
MAX_PREP_TIME_MINUTES=30
CHUNK_MAX_TOKENS=2000
CHUNK_OVERLAP_TOKENS=200
```

## Demo Accounts (seed data, any password accepted — mock auth)

| Role | Email |
|------|-------|
| Teacher | sarah@school.edu, mike@school.edu |
| Student | alice@school.edu, bob@school.edu, carol@school.edu |
| Admin | admin@school.edu |
