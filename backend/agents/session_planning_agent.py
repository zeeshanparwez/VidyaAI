"""Session Planning Agent — decides scope for the next class session."""

from __future__ import annotations
from agents.base import BaseAgent, AgentResult
from models.session_plan import SessionPlan
from models.user import User
from config import settings
from prompts.templates import SESSION_PLANNING_PROMPT


class SessionPlanningAgent(BaseAgent):
    name = "SessionPlanningAgent"

    def execute(self, context: dict) -> AgentResult:
        subject_id = context.get("subject_id")
        next_units = context.get("next_units", [])
        subject_name = context.get("subject_name", "Unknown Subject")
        teacher_id = context.get("teacher_id")

        if not next_units:
            return AgentResult(
                success=False,
                error="No units available for planning.",
                reasoning="All syllabus units may be completed or none exist."
            )

        unit = next_units[0]  # Plan for the highest priority unit

        # Get teacher preferences
        preferences = "{}"
        if teacher_id:
            teacher = self.db.query(User).filter(User.id == teacher_id).first()
            if teacher:
                preferences = teacher.preferences_json or "{}"

        # Get previous session notes
        prev_session = self.db.query(SessionPlan).filter(
            SessionPlan.subject_id == subject_id
        ).order_by(SessionPlan.date.desc()).first()
        previous_notes = prev_session.teacher_notes if prev_session else "No previous session"

        # Use AI to plan the session
        prompt = SESSION_PLANNING_PROMPT.format(
            max_prep_minutes=settings.MAX_PREP_TIME_MINUTES,
            subject_name=subject_name,
            unit_title=unit.get("title", ""),
            unit_description=unit.get("description", ""),
            estimated_hours=unit.get("estimated_hours", 1.0),
            previous_notes=previous_notes or "None",
            preferences=preferences,
        )

        ai_response = self.ai.chat_json(
            system_prompt="You are an expert educational session planner.",
            user_prompt=prompt,
        )

        # Ensure prep time respects the 30-minute cap
        scope = ai_response.get("scope", {})
        prep_time = min(scope.get("estimated_prep_time_minutes", 30), settings.MAX_PREP_TIME_MINUTES)
        scope["estimated_prep_time_minutes"] = prep_time

        result = AgentResult(
            success=True,
            data={
                "session_title": ai_response.get("session_title", unit.get("title", "")),
                "scope": scope,
                "unit": unit,
                "prep_time_minutes": prep_time,
                "explanation": ai_response.get("explanation", ""),
            },
            reasoning=ai_response.get("reasoning", f"Planned session for '{unit.get('title')}' within {prep_time} min prep time.")
        )
        self.log_decision(context, result, subject_id=subject_id)
        return result
