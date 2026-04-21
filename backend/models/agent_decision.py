"""Agent decision and feedback signal models — auditability layer."""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from database import Base


class AgentDecision(Base):
    __tablename__ = "agent_decisions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_name = Column(String(100), nullable=False)
    session_plan_id = Column(Integer, ForeignKey("session_plans.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)

    # What was given to the agent
    input_json = Column(Text, default="{}")

    # What the agent produced
    output_json = Column(Text, default="{}")

    # Human-readable reasoning
    reasoning = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())


class FeedbackSignal(Base):
    __tablename__ = "feedback_signals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_plan_id = Column(Integer, ForeignKey("session_plans.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)

    signal_type = Column(String(50), nullable=False)  # quiz_result / coverage_update / teacher_feedback
    data_json = Column(Text, default="{}")

    created_at = Column(DateTime, server_default=func.now())
