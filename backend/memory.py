from mem0 import Memory
import os
import logging

logger = logging.getLogger("memory")

class MemoryManager:
    def __init__(self):
        # LOW RAM CONFIG: 
        # LLM: Gemini Flash (Free, No RAM)
        # Embedder: Gemini Embeddings (Free, No RAM)
        
        self.config = {
            "llm": {
                "provider": "gemini",
                "config": {
                    "model": "gemini-1.5-flash",
                    "api_key": os.getenv("GOOGLE_API_KEY")
                }
            },
            "embedder": {
                "provider": "gemini",
                "config": {
                    "model": "models/text-embedding-004",
                    "api_key": os.getenv("GOOGLE_API_KEY")
                }
            },
            "vector_store": {
                "provider": "chroma",
                "config": {
                    "collection_name": "alan_memories",
                    "path": "./memory.db"
                }
            }
        }
        
        try:
            self.memory = Memory.from_config(self.config)
            logger.info("Mem0 initialized with Gemini Embeddings (Low RAM)")
        except Exception as e:
            logger.error(f"Mem0 config failed: {e}")
            self.memory = Memory() 

    def add_memory(self, text, user_id="user"):
        try:
            self.memory.add(text, user_id=user_id)
        except Exception as e:
            logger.error(f"Add memory failed: {e}")

    def search_memory(self, query, user_id="user", limit=3):
        try:
            results = self.memory.search(query, user_id=user_id, limit=limit)
            if results:
                return [r['memory'] for r in results]
            return []
        except Exception as e:
            logger.error(f"Search memory failed: {e}")
            return []
