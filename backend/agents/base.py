"""Base agent class — all agents inherit from this."""

from __future__ import annotations
import json, logging
from dataclasses import dataclass, field
from typing import Any, Optional
from sqlalchemy.orm import Session
from services.ai_service import ai_service

logger = logging.getLogger(__name__)


@dataclass
class AgentResult:
    """Standard result returned by every agent."""
    success: bool = True
    data: dict = field(default_factory=dict)
    reasoning: str = ""
    error: Optional[str] = None


class BaseAgent:
    """Abstract base for all agents. Provides AI access and decision logging."""

    name: str = "BaseAgent"

    def __init__(self, db: Session):
        self.db = db
        self.ai = ai_service

    def execute(self, context: dict) -> AgentResult:
        """Override in subclasses. Main execution entry point."""
        raise NotImplementedError

    def log_decision(self, context: dict, result: AgentResult,
                     session_plan_id: int = None, subject_id: int = None):
        """Persist agent decision for auditability."""
        from models.agent_decision import AgentDecision
        decision = AgentDecision(
            agent_name=self.name,
            session_plan_id=session_plan_id,
            subject_id=subject_id,
            input_json=json.dumps(context, default=str),
            output_json=json.dumps(result.data, default=str),
            reasoning=result.reasoning,
        )
        self.db.add(decision)
        self.db.commit()
        logger.info(f"[{self.name}] Decision logged — {result.reasoning[:100]}")
