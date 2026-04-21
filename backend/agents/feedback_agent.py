"""Feedback Analysis Agent — analyzes quiz responses and session coverage."""

from __future__ import annotations
import json
from agents.base import BaseAgent, AgentResult
from models.quiz import Quiz, QuizResponse
from models.session_plan import SessionPlan
from prompts.templates import FEEDBACK_ANALYSIS_PROMPT


class FeedbackAgent(BaseAgent):
    name = "FeedbackAnalysisAgent"

    def execute(self, context: dict) -> AgentResult:
        subject_id = context.get("subject_id")

        # Gather quiz results
        quizzes = self.db.query(Quiz).filter(Quiz.subject_id == subject_id).all()
        quiz_results = []
        for quiz in quizzes:
            responses = self.db.query(QuizResponse).filter(QuizResponse.quiz_id == quiz.id).all()
            if responses:
                avg_score = sum(r.score or 0 for r in responses) / len(responses)
                quiz_results.append({
                    "quiz_title": quiz.title,
                    "num_responses": len(responses),
                    "average_score": round(avg_score, 2),
                    "questions": json.loads(quiz.questions_json) if quiz.questions_json else [],
                })

        # Gather coverage history
        sessions = self.db.query(SessionPlan).filter(
            SessionPlan.subject_id == subject_id
        ).order_by(SessionPlan.date.desc()).limit(10).all()

        coverage_history = []
        for s in sessions:
            coverage_history.append({
                "date": s.date.isoformat() if s.date else "",
                "title": s.title,
                "coverage": s.coverage_status,
                "notes": s.teacher_notes,
            })

        if not quiz_results and not coverage_history:
            return AgentResult(
                success=True,
                data={"weak_concepts": [], "strong_concepts": [], "recommendations": []},
                reasoning="No quiz or coverage data available yet for analysis."
            )

        # Use AI to analyze feedback
        prompt = FEEDBACK_ANALYSIS_PROMPT.format(
            quiz_results=json.dumps(quiz_results, default=str),
            coverage_history=json.dumps(coverage_history, default=str),
        )

        ai_response = self.ai.chat_json(
            system_prompt="You are an expert educational feedback analyst.",
            user_prompt=prompt,
        )

        result = AgentResult(
            success=True,
            data={
                "weak_concepts": ai_response.get("weak_concepts", []),
                "strong_concepts": ai_response.get("strong_concepts", []),
                "recommendations": ai_response.get("recommendations", []),
                "quiz_data_points": len(quiz_results),
                "session_data_points": len(coverage_history),
            },
            reasoning=ai_response.get("reasoning", "Analyzed available feedback data.")
        )
        self.log_decision(context, result, subject_id=subject_id)
        return result
