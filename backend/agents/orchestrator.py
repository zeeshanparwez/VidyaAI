"""Orchestration Agent — LangGraph workflow coordinating all agents."""

from __future__ import annotations
import json, logging
from datetime import date
from typing import TypedDict, Optional
from sqlalchemy.orm import Session as DBSession

from langgraph.graph import StateGraph, START, END

from agents.schedule_agent import ScheduleAgent
from agents.syllabus_agent import SyllabusAgent
from agents.session_planning_agent import SessionPlanningAgent
from agents.content_curation_agent import ContentCurationAgent
from agents.feedback_agent import FeedbackAgent
from agents.adaptive_scheduling_agent import AdaptiveSchedulingAgent
from agents.personalization_agent import PersonalizationAgent
from models.session_plan import SessionPlan
from models.subject import Subject
from models.user import User

logger = logging.getLogger(__name__)


class OrchestratorState(TypedDict, total=False):
    """State passed through the orchestration graph."""
    subject_id: int
    teacher_id: int
    target_date: str
    subject_name: str
    schedule_result: dict
    syllabus_result: dict
    session_plan_result: dict
    content_result: dict
    feedback_result: dict
    adaptive_result: dict
    personalization_result: dict
    final_plan: dict
    error: Optional[str]


class OrchestrationAgent:
    """Coordinates all agents in a sequential workflow using LangGraph.

    Flow:
      Schedule → Syllabus → SessionPlanning → ContentCuration
                                                      ↓
         Personalization ← AdaptiveScheduling ← Feedback
    """

    def __init__(self, db: DBSession):
        self.db = db
        self.schedule_agent = ScheduleAgent(db)
        self.syllabus_agent = SyllabusAgent(db)
        self.session_planning_agent = SessionPlanningAgent(db)
        self.content_curation_agent = ContentCurationAgent(db)
        self.feedback_agent = FeedbackAgent(db)
        self.adaptive_agent = AdaptiveSchedulingAgent(db)
        self.personalization_agent = PersonalizationAgent(db)
        
        self.workflow = self._build_graph()

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(OrchestratorState)

        # Add nodes
        workflow.add_node("schedule", self.node_schedule)
        workflow.add_node("syllabus", self.node_syllabus)
        workflow.add_node("session_planning", self.node_session_planning)
        workflow.add_node("content_curation", self.node_content_curation)
        workflow.add_node("feedback", self.node_feedback)
        workflow.add_node("adaptive", self.node_adaptive)
        workflow.add_node("personalization", self.node_personalization)
        workflow.add_node("finalize", self.node_finalize)

        # Add edges
        workflow.add_edge(START, "schedule")
        workflow.add_edge("schedule", "syllabus")
        
        # Conditional routing from syllabus
        workflow.add_conditional_edges(
            "syllabus",
            self.route_after_syllabus,
            {
                "continue": "session_planning",
                "error": END
            }
        )

        workflow.add_edge("session_planning", "content_curation")
        workflow.add_edge("content_curation", "feedback")
        workflow.add_edge("feedback", "adaptive")
        workflow.add_edge("adaptive", "personalization")
        workflow.add_edge("personalization", "finalize")
        workflow.add_edge("finalize", END)

        return workflow.compile()

    def route_after_syllabus(self, state: OrchestratorState) -> str:
        """Route to END if there was an error in syllabus processing."""
        if state.get("error"):
            return "error"
        return "continue"

    def node_schedule(self, state: OrchestratorState) -> dict:
        logger.info("[Orchestrator] Step 1: Schedule Awareness")
        try:
            res = self.schedule_agent.execute({
                "subject_id": state.get("subject_id"),
                "target_date": state.get("target_date"),
            })
            return {"schedule_result": res.data}
        except Exception as e:
            logger.error(f"Schedule node error: {e}")
            return {"error": str(e)}

    def node_syllabus(self, state: OrchestratorState) -> dict:
        if state.get("error"): return {}
        
        logger.info("[Orchestrator] Step 2: Syllabus Progress")
        try:
            res = self.syllabus_agent.execute({
                "subject_id": state.get("subject_id"),
            })
            if not res.success:
                return {"error": res.error, "syllabus_result": res.data}
            return {"syllabus_result": res.data}
        except Exception as e:
            logger.error(f"Syllabus node error: {e}")
            return {"error": str(e)}

    def node_session_planning(self, state: OrchestratorState) -> dict:
        if state.get("error"): return {}
        
        logger.info("[Orchestrator] Step 3: Session Planning")
        try:
            syllabus_result = state.get("syllabus_result", {})
            res = self.session_planning_agent.execute({
                "subject_id": state.get("subject_id"),
                "teacher_id": state.get("teacher_id"),
                "subject_name": state.get("subject_name"),
                "next_units": syllabus_result.get("next_units", []),
            })
            return {"session_plan_result": res.data}
        except Exception as e:
            logger.error(f"Session Planning node error: {e}")
            return {"error": str(e)}

    def node_content_curation(self, state: OrchestratorState) -> dict:
        if state.get("error"): return {}

        logger.info("[Orchestrator] Step 4: Content Curation")
        try:
            session_plan = state.get("session_plan_result", {})
            # Load actual teacher preferences instead of hardcoded empty dict
            teacher_id = state.get("teacher_id")
            preferences = "{}"
            if teacher_id:
                teacher = self.db.query(User).filter(User.id == teacher_id).first()
                if teacher and teacher.preferences_json:
                    preferences = teacher.preferences_json
            res = self.content_curation_agent.execute({
                "subject_id": state.get("subject_id"),
                "session_title": session_plan.get("session_title", ""),
                "scope": session_plan.get("scope", {}),
                "preferences": preferences,
            })
            return {"content_result": res.data}
        except Exception as e:
            logger.error(f"Content Curation node error: {e}")
            return {"error": str(e)}

    def node_feedback(self, state: OrchestratorState) -> dict:
        if state.get("error"): return {}
        
        logger.info("[Orchestrator] Step 5: Feedback Analysis")
        try:
            res = self.feedback_agent.execute({
                "subject_id": state.get("subject_id"),
            })
            return {"feedback_result": res.data}
        except Exception as e:
            logger.error(f"Feedback node error: {e}")
            return {"error": str(e)}

    def node_adaptive(self, state: OrchestratorState) -> dict:
        if state.get("error"): return {}
        
        logger.info("[Orchestrator] Step 6: Adaptive Scheduling")
        try:
            feedback_result = state.get("feedback_result", {})
            res = self.adaptive_agent.execute({
                "subject_id": state.get("subject_id"),
                "weak_concepts": feedback_result.get("weak_concepts", []),
            })
            return {"adaptive_result": res.data}
        except Exception as e:
            logger.error(f"Adaptive node error: {e}")
            return {"error": str(e)}

    def node_personalization(self, state: OrchestratorState) -> dict:
        if state.get("error"): return {}
        
        logger.info("[Orchestrator] Step 7: Personalization")
        try:
            res = self.personalization_agent.execute({
                "teacher_id": state.get("teacher_id"),
                "subject_id": state.get("subject_id"),
                "content": state.get("content_result", {}),
            }) 
            return {"personalization_result": res.data}
        except Exception as e:
            logger.error(f"Personalization node error: {e}")
            return {"error": str(e)}

    def node_finalize(self, state: OrchestratorState) -> dict:
        if state.get("error"): return {}
        
        logger.info("[Orchestrator] Step 8: Finalize and Persist")
        try:
            subject_id = state.get("subject_id")
            target_date = state.get("target_date")
            session_result = state.get("session_plan_result", {})
            syllabus_result = state.get("syllabus_result", {})
            schedule_result = state.get("schedule_result", {})
            feedback_result = state.get("feedback_result", {})
            adaptive_result = state.get("adaptive_result", {})
            content_result = state.get("content_result", {})
            personalization_result = state.get("personalization_result", {})

            final_content = personalization_result.get("personalized_content", content_result)
            unit = session_result.get("unit", {})
            
            plan = SessionPlan(
                subject_id=subject_id,
                syllabus_unit_id=unit.get("unit_id"),
                date=date.fromisoformat(target_date),
                title=session_result.get("session_title", "Session"),
                plan_json=json.dumps(final_content, default=str),
                status="generated",
                coverage_status="pending",
                prep_time_minutes=session_result.get("prep_time_minutes", 30),
                explanation=self._build_explanation(state),
            )
            self.db.add(plan)
            self.db.commit()
            self.db.refresh(plan)

            final_plan = {
                "plan_id": plan.id,
                "title": plan.title,
                "date": plan.date.isoformat(),
                "prep_time_minutes": plan.prep_time_minutes,
                "content": final_content,
                "syllabus_progress": syllabus_result,
                "schedule": schedule_result,
                "feedback_insights": feedback_result,
                "schedule_adjustments": adaptive_result,
                "explanation": plan.explanation,
                "personalization_adjustments": personalization_result.get("adjustments_made", []),
            }
            logger.info(f"[Orchestrator] Session plan #{plan.id} generated successfully.")
            return {"final_plan": final_plan}
        except Exception as e:
            logger.error(f"Finalize node error: {e}")
            return {"error": str(e)}

    def run(self, subject_id: int, teacher_id: int, target_date: str = None) -> dict:
        """Execute the LangGraph orchestration pipeline."""
        if not target_date:
            target_date = date.today().isoformat()

        subject = self.db.query(Subject).filter(Subject.id == subject_id).first()
        subject_name = subject.name if subject else "Unknown"

        initial_state = {
            "subject_id": subject_id,
            "teacher_id": teacher_id,
            "target_date": target_date,
            "subject_name": subject_name,
        }

        try:
            # Invoke the LangGraph workflow
            final_state = self.workflow.invoke(initial_state)
            
            if final_state.get("error"):
                return self._build_error_response(final_state, final_state["error"])
                
            return final_state.get("final_plan", {})

        except Exception as e:
            logger.error(f"[Orchestrator] Pipeline error: {e}")
            return self._build_error_response(initial_state, str(e))

    def _build_explanation(self, state: dict) -> str:
        """Build human-readable explanation of why content was selected."""
        parts = []
        sp = state.get("session_plan_result", {})
        parts.append(f"Session: {sp.get('session_title', 'N/A')}")
        parts.append(f"Explanation: {sp.get('explanation', 'N/A')}")

        syllabus = state.get("syllabus_result", {})
        parts.append(f"Progress: {syllabus.get('progress_percentage', 0)}% complete")

        fb = state.get("feedback_result", {})
        weak = fb.get("weak_concepts", [])
        if weak:
            parts.append(f"Weak areas identified: {', '.join(w.get('topic', '') for w in weak[:3])}")

        return " | ".join(parts)

    def _build_error_response(self, state: dict, error: str) -> dict:
        return {
            "error": error,
            "partial_state": {k: v for k, v in state.items() if v is not None and k != "error"},
        }
