import logging
import tempfile
import os
from groq import AsyncGroq
from config import settings

logger = logging.getLogger(__name__)


class STTService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_STT_MODEL

    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            with open(tmp_path, "rb") as audio_file:
                response = await self.client.audio.transcriptions.create(
                    file=("audio.webm", audio_file),
                    model=self.model,
                    language=language,
                    response_format="text",
                )

            text = response.strip() if isinstance(response, str) else str(response).strip()
            logger.info(f"STT transcribed: '{text[:80]}...'")
            return text
        except Exception as e:
            logger.error(f"STT error: {e}")
            raise
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)


stt_service = STTService()
