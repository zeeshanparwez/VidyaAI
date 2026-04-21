"""Personalization Agent — learns teacher preferences and adjusts output."""

from __future__ import annotations
import json
from agents.base import BaseAgent, AgentResult
from models.user import User
from models.agent_decision import FeedbackSignal
from prompts.templates import PERSONALIZATION_PROMPT


class PersonalizationAgent(BaseAgent):
    name = "PersonalizationAgent"

    def execute(self, context: dict) -> AgentResult:
        teacher_id = context.get("teacher_id")
        content = context.get("content", {})
        subject_id = context.get("subject_id")

        # Load teacher preferences
        teacher = self.db.query(User).filter(User.id == teacher_id).first() if teacher_id else None
        preferences = json.loads(teacher.preferences_json) if teacher and teacher.preferences_json else {}

        # Get recent teacher feedback
        recent_feedback = self.db.query(FeedbackSignal).filter(
            FeedbackSignal.subject_id == subject_id,
            FeedbackSignal.signal_type == "teacher_feedback"
        ).order_by(FeedbackSignal.created_at.desc()).limit(5).all()

        past_feedback = [json.loads(f.data_json) for f in recent_feedback] if recent_feedback else []

        if not preferences and not past_feedback:
            # No personalization data yet — return content as-is
            return AgentResult(
                success=True,
                data={"personalized_content": content, "adjustments_made": []},
                reasoning="No personalization data available yet. Content returned as-is."
            )

        # Use AI for personalization
        prompt = PERSONALIZATION_PROMPT.format(
            preferences=json.dumps(preferences, default=str),
            past_feedback=json.dumps(past_feedback, default=str),
            content=json.dumps(content, default=str),
        )

        ai_response = self.ai.chat_json(
            system_prompt="You are a personalization agent that adapts educational content to teacher preferences.",
            user_prompt=prompt,
        )

        result = AgentResult(
            success=True,
            data={
                "personalized_content": ai_response.get("personalized_content", content),
                "adjustments_made": ai_response.get("adjustments_made", []),
            },
            reasoning=ai_response.get("reasoning", "Content personalized based on teacher preferences.")
        )
        self.log_decision(context, result, subject_id=subject_id)
        return result
