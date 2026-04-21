"""Schedule Awareness Agent — detects upcoming sessions from timetable."""

from __future__ import annotations
from datetime import date, timedelta
from agents.base import BaseAgent, AgentResult
from models.timetable import TimetableEntry
from prompts.templates import SCHEDULE_AWARENESS_PROMPT


class ScheduleAgent(BaseAgent):
    name = "ScheduleAwarenessAgent"

    def execute(self, context: dict) -> AgentResult:
        subject_id = context.get("subject_id")
        target_date = context.get("target_date", date.today())

        if isinstance(target_date, str):
            target_date = date.fromisoformat(target_date)

        # Get timetable entries for this subject
        entries = self.db.query(TimetableEntry).filter(
            TimetableEntry.subject_id == subject_id
        ).all()

        if not entries:
            return AgentResult(
                success=False,
                error="No timetable entries found for this subject.",
                reasoning="Cannot determine schedule without timetable data."
            )

        # Find upcoming sessions in the next 7 days
        upcoming = []
        for day_offset in range(7):
            check_date = target_date + timedelta(days=day_offset)
            day_of_week = check_date.weekday()
            for entry in entries:
                if entry.day_of_week == day_of_week:
                    upcoming.append({
                        "subject_id": subject_id,
                        "date": check_date.isoformat(),
                        "day_of_week": day_of_week,
                        "start_time": entry.start_time,
                        "end_time": entry.end_time,
                        "room": entry.room,
                        "needs_prep": True,
                    })

        result = AgentResult(
            success=True,
            data={"upcoming_sessions": upcoming, "target_date": target_date.isoformat()},
            reasoning=f"Found {len(upcoming)} upcoming sessions in the next 7 days for subject {subject_id}."
        )
        self.log_decision(context, result, subject_id=subject_id)
        return result
