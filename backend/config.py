import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    QDRANT_PATH: str = os.getenv("QDRANT_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "qdrant_local"))

    FRIDAY_USER_NAME: str = os.getenv("FRIDAY_USER_NAME", "Boss")
    FRIDAY_USER_ID: str = os.getenv("FRIDAY_USER_ID", "default_user")

    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    GROQ_LLM_MODEL: str = os.getenv("GROQ_LLM_MODEL", "llama-3.3-70b-versatile")
    GROQ_STT_MODEL: str = os.getenv("GROQ_STT_MODEL", "whisper-large-v3")
    GROQ_VISION_MODEL: str = os.getenv("GROQ_VISION_MODEL", "gemma2-9b-it")
    GEMINI_VISION_MODEL: str = os.getenv("GEMINI_VISION_MODEL", "gemini-2.0-flash")

    EDGE_TTS_VOICE: str = os.getenv("EDGE_TTS_VOICE", "en-US-GuyNeural")

    MEM0_COLLECTION: str = os.getenv("MEM0_COLLECTION", "friday_memories")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "models/text-embedding-004")
    EMBEDDING_DIMS: int = int(os.getenv("EMBEDDING_DIMS", "768"))


settings = Settings()
