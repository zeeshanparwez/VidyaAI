"""Quiz Generation Agent — creates manual or AI-generated quizzes."""

from __future__ import annotations
import json
from agents.base import BaseAgent, AgentResult
from prompts.templates import QUIZ_GENERATION_PROMPT


class QuizAgent(BaseAgent):
    name = "QuizGenerationAgent"

    def execute(self, context: dict) -> AgentResult:
        topic = context.get("topic", "General")
        num_questions = context.get("num_questions", 5)
        subject_id = context.get("subject_id")

        prompt = QUIZ_GENERATION_PROMPT.format(
            topic=topic,
            num_questions=num_questions,
        )

        ai_response = self.ai.chat_json(
            system_prompt="You are an expert quiz creator for educational assessment.",
            user_prompt=prompt,
        )

        questions = ai_response.get("questions", [])
        title = ai_response.get("title", f"Quiz: {topic}")

        result = AgentResult(
            success=True,
            data={
                "title": title,
                "questions": questions,
                "questions_json": json.dumps(questions),
                "num_generated": len(questions),
            },
            reasoning=f"Generated {len(questions)} questions for topic '{topic}' with mixed difficulty."
        )
        self.log_decision(context, result, subject_id=subject_id)
        return result
