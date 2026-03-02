import logging
from mem0 import Memory
from config import settings

logger = logging.getLogger(__name__)


class MemoryService:
    def __init__(self):
        self._memory = None

    def _get_memory(self) -> Memory:
        if self._memory is None:
            config = {
                "llm": {
                    "provider": "groq",
                    "config": {
                        "model": settings.GROQ_LLM_MODEL,
                        "temperature": 0.1,
                        "api_key": settings.GROQ_API_KEY,
                    },
                },
                "embedder": {
                    "provider": "google",
                    "config": {
                        "model": settings.EMBEDDING_MODEL,
                        "embedding_dims": settings.EMBEDDING_DIMS,
                        "api_key": settings.GOOGLE_API_KEY,
                    },
                },
                "vector_store": {
                    "provider": "qdrant",
                    "config": {
                        "collection_name": settings.MEM0_COLLECTION,
                        "path": settings.QDRANT_PATH,
                        "embedding_model_dims": settings.EMBEDDING_DIMS,
                    },
                },
                "version": "v1.1",
            }
            self._memory = Memory.from_config(config)
            logger.info("Mem0 initialized (Qdrant local + Google embeddings)")
        return self._memory

    def add(self, messages: list[dict], user_id: str | None = None) -> dict:
        uid = user_id or settings.FRIDAY_USER_ID
        try:
            result = self._get_memory().add(messages, user_id=uid)
            logger.info(f"Added memories for user '{uid}'")
            return result
        except Exception as e:
            logger.error(f"Memory add error: {e}")
            return {}

    def search(self, query: str, user_id: str | None = None, limit: int = 10) -> list[dict]:
        uid = user_id or settings.FRIDAY_USER_ID
        try:
            results = self._get_memory().search(query, user_id=uid, limit=limit)
            logger.info(f"Memory search '{query[:40]}': {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"Memory search error: {e}")
            return []

    def get_all(self, user_id: str | None = None) -> list[dict]:
        uid = user_id or settings.FRIDAY_USER_ID
        try:
            results = self._get_memory().get_all(user_id=uid)
            logger.info(f"Retrieved {len(results)} memories for user '{uid}'")
            return results
        except Exception as e:
            logger.error(f"Memory get_all error: {e}")
            return []

    def get_context_string(self, user_id: str | None = None) -> str:
        memories = self.get_all(user_id)
        if not memories:
            return ""

        lines = []
        for m in memories:
            memory_text = m.get("memory", "")
            if memory_text:
                lines.append(f"- {memory_text}")

        return "\n".join(lines)


memory_service = MemoryService()
