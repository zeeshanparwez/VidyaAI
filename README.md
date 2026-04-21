# AI-Driven Teacher Session Preparation Portal

> **Enterprise-grade, AI-powered system** that helps teachers prepare for upcoming classes in a 30-minute window using intelligent agents.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│   React UI   │────▶│  FastAPI Backend  │────▶│  Azure OpenAI (GPT-4o)  │
│  (Vite, SPA) │     │    REST APIs      │     │  Chat + Embeddings      │
└──────────────┘     └────────┬─────────┘     └─────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Agent Orchestrator │
                    │    (LangGraph)      │
                    ├────────────────────┤
                    │ • Schedule Agent    │
                    │ • Syllabus Agent    │
                    │ • Planning Agent    │
                    │ • Content Agent     │
                    │ • Quiz Agent        │
                    │ • Feedback Agent    │
                    │ • Adaptive Agent    │
                    │ • Personal. Agent   │
                    └─────────┬──────────┘
                              │
                   ┌──────────▼──────────┐
                   │  SQLite Database     │
                   │  + Vector Store      │
                   └─────────────────────┘
```

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Azure OpenAI access (credentials already in `.env`)

### 1. Backend Setup

```bash
cd Teching_app/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Seed demo data
python seed_data.py

# Start the API server
python main.py
```

Backend runs at: **http://localhost:8000**  
API docs at: **http://localhost:8000/docs**

### 2. Frontend Setup

```bash
cd Teching_app/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

### 3. Login

Use any demo account (mock auth, any password works):
- **Teacher:** sarah@school.edu
- **Teacher:** mike@school.edu
- **Student:** alice@school.edu

---

## Features

| Feature | Description |
|---------|-------------|
| 📚 Syllabus Upload | AI parses raw text into structured topics |
| 📅 Timetable | Weekly schedule management |
| 🎯 Session Prep | AI generates 30-min prep plans with concepts, misconceptions, flow, examples |
| 📝 Quizzes | Manual + AI-generated quizzes with auto-grading |
| 📊 Analytics | Progress tracking, weak topic detection, agent audit trail |
| 🔄 Adaptive Scheduling | AI rebalances future sessions based on feedback |
| 🧠 Explainability | Every AI decision logged with reasoning |

## Agents

| # | Agent | Responsibility |
|---|-------|---------------|
| 1 | Schedule Awareness | Reads timetable, finds upcoming sessions |
| 2 | Syllabus Progress | Tracks completed/partial/pending topics |
| 3 | Session Planning | Decides scope, respects 30-min cap |
| 4 | Content Curation | RAG-based concept generation |
| 5 | Quiz Generation | Creates assessments with difficulty mix |
| 6 | Feedback Analysis | Identifies weak concepts from quiz data |
| 7 | Adaptive Scheduling | Rebalances without extending dates |
| 8 | Personalization | Adapts output to teacher preferences |
| 9 | Orchestrator | Coordinates all agents in pipeline |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Mock login |
| GET | `/api/subjects/` | List subjects |
| POST | `/api/syllabus/upload` | AI-parse syllabus |
| GET | `/api/syllabus/{id}` | Get syllabus units |
| PUT | `/api/syllabus/units/{id}/status` | Mark coverage |
| POST | `/api/timetable/` | Add schedule slot |
| POST | `/api/sessions/generate` | Generate prep plan |
| GET | `/api/sessions/{subject_id}` | List session plans |
| PUT | `/api/sessions/plan/{id}/coverage` | Mark session coverage |
| POST | `/api/quizzes/generate` | AI quiz generation |
| POST | `/api/quizzes/{id}/submit` | Submit quiz answers |
| GET | `/api/analytics/{subject_id}` | Analytics summary |
| GET | `/api/analytics/decisions/{id}` | Agent audit trail |

## Example API Calls

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sarah@school.edu", "password": "any"}'

# Upload Syllabus
curl -X POST http://localhost:8000/api/syllabus/upload \
  -H "Content-Type: application/json" \
  -d '{"subject_id": 1, "content": "Unit 1: Variables and Data Types\nUnit 2: Control Flow\nUnit 3: Functions"}'

# Generate Session Prep
curl -X POST http://localhost:8000/api/sessions/generate \
  -H "Content-Type: application/json" \
  -d '{"subject_id": 1}'

# AI Quiz Generation
curl -X POST http://localhost:8000/api/quizzes/generate \
  -H "Content-Type: application/json" \
  -d '{"subject_id": 1, "topic": "Functions and Modularity", "num_questions": 5}'

# Submit Quiz
curl -X POST http://localhost:8000/api/quizzes/1/submit \
  -H "Content-Type: application/json" \
  -d '{"student_id": 4, "student_name": "Alice", "answers_json": "{\"1\": \"B\", \"2\": \"A\"}"}'
```

## Database Schema

9 tables: `users`, `subjects`, `syllabus_units`, `timetable_entries`, `session_plans`, `quizzes`, `quiz_responses`, `feedback_signals`, `agent_decisions`

## Environment Variables

```env
AZURE_API_KEY=<your-key>
AZURE_API_BASE=<your-endpoint>
AZURE_API_VERSION=2024-10-21
AZURE_DEPLOYMENT_NAME=gpt-4o-mini
DATABASE_URL=sqlite:///./teaching_app.db  # Change to PostgreSQL for production
```

## Project Structure

```
Teching_app/
├── .env
├── README.md
├── backend/
│   ├── main.py              # FastAPI app
│   ├── config.py             # Settings
│   ├── database.py           # SQLAlchemy
│   ├── seed_data.py          # Demo data
│   ├── models/               # ORM models (7 files)
│   ├── schemas/              # Pydantic schemas
│   ├── routers/              # API routes (7 files)
│   ├── services/             # AI service, vector store
│   ├── agents/               # 9 agent files + orchestrator
│   └── prompts/              # Centralized prompt templates
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── App.css
        ├── api.js
        ├── components/Sidebar.jsx
        └── pages/ (8 pages)
```
