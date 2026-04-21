"""Azure OpenAI integration service — chat completions and embeddings.

Supports two API keys for parallel usage (one for chat, one for embeddings).
"""

from __future__ import annotations
import json, logging
from typing import List, Optional
from openai import AzureOpenAI
from config import settings

logger = logging.getLogger(__name__)


class AIService:
    """Wrapper around Azure OpenAI for chat completions and embeddings."""

    def __init__(self):
        # Primary client for chat completions
        self.client = AzureOpenAI(
            api_key=settings.AZURE_API_KEY,
            api_version=settings.AZURE_API_VERSION,
            azure_endpoint=settings.AZURE_API_BASE,
        )
        # Secondary client (key 2) for embeddings — enables parallel usage
        self.embed_client = AzureOpenAI(
            api_key=settings.AZURE_API_KEY_2 or settings.AZURE_API_KEY,
            api_version=settings.AZURE_API_VERSION,
            azure_endpoint=settings.AZURE_API_BASE,
        )
        self.chat_model = settings.AZURE_DEPLOYMENT_NAME
        self.embedding_model = settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT

    # ── Chat Completions ──────────────────────────────────────────────

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: Optional[dict] = None,
    ) -> str:
        """Send a chat completion request and return the assistant reply."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        kwargs = {
            "model": self.chat_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            kwargs["response_format"] = response_format

        try:
            response = self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"Azure OpenAI chat error: {e}")
            return json.dumps({"error": str(e)})

    def chat_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
    ) -> dict:
        """Chat expecting JSON output."""
        raw = self.chat(
            system_prompt=system_prompt + "\n\nRespond ONLY with valid JSON.",
            user_prompt=user_prompt,
            temperature=temperature,
        )
        try:
            # Try to extract JSON from the response
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse JSON from AI response: {raw[:200]}")
            return {"raw_response": raw}

    # ── Embeddings ────────────────────────────────────────────────────

    def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts using the secondary API key."""
        try:
            response = self.embed_client.embeddings.create(
                model=self.embedding_model,
                input=texts,
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error(f"Azure OpenAI embedding error: {e}")
            # Return zero vectors as fallback
            return [[0.0] * 1536 for _ in texts]


# Singleton
ai_service = AIService()
