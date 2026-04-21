"""Adaptive Scheduling Agent — rebalances future sessions without extending timelines."""

from __future__ import annotations
import json
from datetime import date
from agents.base import BaseAgent, AgentResult
from models.subject import Subject
from models.syllabus import SyllabusUnit
from models.session_plan import SessionPlan
from config import settings
from prompts.templates import ADAPTIVE_SCHEDULING_PROMPT


class AdaptiveSchedulingAgent(BaseAgent):
    name = "AdaptiveSchedulingAgent"

    def execute(self, context: dict) -> AgentResult:
        subject_id = context.get("subject_id")
        weak_areas = context.get("weak_concepts", [])

        # Get subject term dates
        subject = self.db.query(Subject).filter(Subject.id == subject_id).first()
        term_end = subject.term_end.isoformat() if subject and subject.term_end else "2025-06-30"

        # Get remaining syllabus units
        remaining = self.db.query(SyllabusUnit).filter(
            SyllabusUnit.subject_id == subject_id,
            SyllabusUnit.status.in_(["pending", "partial"])
        ).order_by(SyllabusUnit.order).all()

        remaining_data = [
            {"id": u.id, "title": u.title, "status": u.status, "estimated_hours": u.estimated_hours}
            for u in remaining
        ]

        # Get current planned sessions
        future_sessions = self.db.query(SessionPlan).filter(
            SessionPlan.subject_id == subject_id,
            SessionPlan.date >= date.today()
        ).order_by(SessionPlan.date).all()

        current_schedule = [
            {"date": s.date.isoformat(), "title": s.title, "prep_time": s.prep_time_minutes}
            for s in future_sessions
        ]

        if not remaining_data and not weak_areas:
            return AgentResult(
                success=True,
                data={"adjusted_schedule": current_schedule, "adjustments_made": []},
                reasoning="No adjustments needed — syllabus is on track."
            )

        # Use AI for adaptive scheduling
        prompt = ADAPTIVE_SCHEDULING_PROMPT.format(
            term_end=term_end,
            max_prep_minutes=settings.MAX_PREP_TIME_MINUTES,
            current_schedule=json.dumps(current_schedule, default=str),
            weak_areas=json.dumps(weak_areas, default=str),
            remaining_units=json.dumps(remaining_data, default=str),
        )

        ai_response = self.ai.chat_json(
            system_prompt="You are an expert adaptive scheduling agent for education.",
            user_prompt=prompt,
        )

        result = AgentResult(
            success=True,
            data={
                "adjusted_schedule": ai_response.get("adjusted_schedule", []),
                "adjustments_summary": ai_response.get("adjustments_summary", []),
                "constraints_respected": ai_response.get("constraints_respected", {}),
            },
            reasoning=ai_response.get("reasoning", "Schedule adjusted based on feedback.")
        )
        self.log_decision(context, result, subject_id=subject_id)
        return result
