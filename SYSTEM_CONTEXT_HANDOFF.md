# System Context & Agent Overview

This document serves as an entry point for other agents to understand the Teching_app project architecture and current state.

## App Overview
**Teching_app** is an AI-Driven Teacher Session Preparation Portal.
- **Frontend**: React + Vite (running on port `2708`).
- **Backend**: FastAPI + SQLAlchemy (running on port `2709`).
- **Database**: SQLite (`backend/teaching_app.db`) with 9 tables (User, Subject, SyllabusUnit, SessionPlan, TimetableEntry, Quiz, QuizResponse, AgentDecision, Enrollment, SyllabusChunk).
- **Core AI**: Azure OpenAI (`gpt-4o-mini` for chat, `text-embedding-ada-002` for embeddings) integrated via `backend/services/ai_service.py`.

## Current AI Agents in the System
The application currently employs a sequential pipeline of 9 agents (8 functional + 1 orchestrator) located in `/backend/agents/`:

1. **Schedule Awareness Agent** (`schedule_agent.py`): Finds upcoming sessions based on teacher timetables.
2. **Syllabus Progress Agent** (`syllabus_agent.py`): Tracks what syllabus topics have been completed and what to teach next.
3. **Session Planning Agent** (`session_planning_agent.py`): Scopes the next class session (topics to cover, estimated time) staying under a 30-min prep cap.
4. **Content Curation Agent** (`content_curation_agent.py`): Uses RAG (Retrieval-Augmented Generation) against an in-memory vector store to pull teaching materials and generate concepts, misconceptions, examples, etc.
5. **Feedback Analysis Agent** (`feedback_agent.py`): Analyzes previous student quiz results to find weak areas in understanding.
6. **Adaptive Scheduling Agent** (`adaptive_scheduling_agent.py`): Adjusts future session schedules to revisit weak areas without extending the term.
7. **Personalization Agent** (`personalization_agent.py`): Adapts the generated content to the specific teaching style preferences of the teacher.
8. **Orchestrator** (`orchestrator.py`): The main controller (`OrchestrationAgent`) that sequentially pipes state from one agent to the next.

## Planned Changes
The next objective is to convert the manual orchestration flow into a fully native **LangGraph** `StateGraph`. This will modernize the workflow with proper cyclical state management, robust graph nodes, and potential tool-based agent implementations.
