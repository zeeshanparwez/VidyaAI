"""Vector store abstraction with in-memory FAISS implementation.

Easily swappable to Weaviate / Pinecone by implementing the VectorStore interface.
"""

from __future__ import annotations
import logging
from typing import List, Tuple, Optional, Protocol
import numpy as np

logger = logging.getLogger(__name__)


class VectorStore(Protocol):
    """Abstract vector store interface."""

    def add(self, texts: List[str], embeddings: List[List[float]], metadata: Optional[List[dict]] = None) -> None: ...
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[Tuple[str, float, dict]]: ...
    def clear(self) -> None: ...


class InMemoryVectorStore:
    """Simple in-memory vector store using numpy cosine similarity.

    For production, swap to FAISS, Weaviate, or Pinecone.
    """

    def __init__(self):
        self.texts: List[str] = []
        self.embeddings: List[np.ndarray] = []
        self.metadata: List[dict] = []

    def add(self, texts: List[str], embeddings: List[List[float]], metadata: Optional[List[dict]] = None) -> None:
        for i, (text, emb) in enumerate(zip(texts, embeddings)):
            self.texts.append(text)
            self.embeddings.append(np.array(emb, dtype=np.float32))
            self.metadata.append(metadata[i] if metadata and i < len(metadata) else {})

    def search(self, query_embedding: List[float], top_k: int = 5) -> List[Tuple[str, float, dict]]:
        if not self.embeddings:
            return []

        query = np.array(query_embedding, dtype=np.float32)
        query_norm = query / (np.linalg.norm(query) + 1e-10)

        scores = []
        for i, emb in enumerate(self.embeddings):
            emb_norm = emb / (np.linalg.norm(emb) + 1e-10)
            sim = float(np.dot(query_norm, emb_norm))
            scores.append((sim, i))

        scores.sort(reverse=True)
        results = []
        for sim, idx in scores[:top_k]:
            results.append((self.texts[idx], sim, self.metadata[idx]))
        return results

    def clear(self) -> None:
        self.texts.clear()
        self.embeddings.clear()
        self.metadata.clear()


# Singleton instance
vector_store = InMemoryVectorStore()
