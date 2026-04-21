"""Syllabus Progress Agent — tracks topic completion and identifies next topics."""

from __future__ import annotations
from agents.base import BaseAgent, AgentResult
from models.syllabus import SyllabusUnit
from prompts.templates import SYLLABUS_PROGRESS_PROMPT


class SyllabusAgent(BaseAgent):
    name = "SyllabusProgressAgent"

    def execute(self, context: dict) -> AgentResult:
        subject_id = context.get("subject_id")

        units = self.db.query(SyllabusUnit).filter(
            SyllabusUnit.subject_id == subject_id
        ).order_by(SyllabusUnit.order).all()

        if not units:
            return AgentResult(
                success=False,
                error="No syllabus units found.",
                reasoning="Cannot assess progress without syllabus data."
            )

        completed = [u for u in units if u.status == "completed"]
        partial = [u for u in units if u.status == "partial"]
        pending = [u for u in units if u.status == "pending"]

        # Determine next units to cover (first pending units, or partial ones)
        next_units = []
        for u in units:
            if u.status in ("pending", "partial"):
                next_units.append({
                    "unit_id": u.id,
                    "title": u.title,
                    "description": u.description or "",
                    "status": u.status,
                    "estimated_hours": u.estimated_hours,
                    "priority": "high" if u.status == "partial" else "medium",
                })
                if len(next_units) >= 3:
                    break

        total = len(units)
        progress = (len(completed) / total * 100) if total > 0 else 0

        result = AgentResult(
            success=True,
            data={
                "total_units": total,
                "completed": len(completed),
                "partial": len(partial),
                "pending": len(pending),
                "progress_percentage": round(progress, 1),
                "next_units": next_units,
                "at_risk": progress < (len(completed) + len(partial)) / max(total, 1) * 100 * 0.8,
            },
            reasoning=f"Syllabus is {progress:.1f}% complete. {len(completed)} done, {len(partial)} partial, {len(pending)} pending. Next units: {[u['title'] for u in next_units]}"
        )
        self.log_decision(context, result, subject_id=subject_id)
        return result
