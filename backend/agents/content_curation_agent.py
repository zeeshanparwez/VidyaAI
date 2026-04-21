"""Content Curation Agent — uses RAG to generate comprehensive prep content."""

from __future__ import annotations
import json
from agents.base import BaseAgent, AgentResult
from services.vector_store import vector_store
from prompts.templates import CONTENT_CURATION_PROMPT


class ContentCurationAgent(BaseAgent):
    name = "ContentCurationAgent"

    def execute(self, context: dict) -> AgentResult:
        subject_id = context.get("subject_id")
        scope = context.get("scope", {})
        topic = context.get("session_title", "Unknown Topic")
        preferences = context.get("preferences", "{}")

        # RAG: search for relevant content from vector store
        rag_context = ""
        try:
            query_text = f"{topic} {json.dumps(scope.get('topics_to_cover', []))}"
            embeddings = self.ai.embed([query_text])
            if embeddings and embeddings[0]:
                results = vector_store.search(embeddings[0], top_k=3)
                rag_context = "\n\n".join([f"[Source] {text}" for text, score, meta in results])
        except Exception:
            rag_context = "No additional context available."

        if not rag_context:
            rag_context = "No additional context available from knowledge base."

        # Use AI to curate content
        prompt = CONTENT_CURATION_PROMPT.format(
            topic=topic,
            scope=json.dumps(scope, default=str),
            preferences=preferences,
            rag_context=rag_context,
        )

        ai_response = self.ai.chat_json(
            system_prompt="You are an expert educational content curator with deep pedagogical knowledge.",
            user_prompt=prompt,
        )

        result = AgentResult(
            success=True,
            data={
                "key_concepts": ai_response.get("key_concepts", []),
                "common_misconceptions": ai_response.get("common_misconceptions", []),
                "explanation_flow": ai_response.get("explanation_flow", []),
                "examples": ai_response.get("examples", []),
                "quick_questions": ai_response.get("quick_questions", []),
                "rag_sources_used": len(rag_context.split("[Source]")) - 1,
            },
            reasoning=ai_response.get("reasoning", f"Curated content for '{topic}' using RAG and pedagogical best practices.")
        )
        self.log_decision(context, result, subject_id=subject_id)
        return result
