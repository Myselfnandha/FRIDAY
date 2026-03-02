import logging
import edge_tts
import io
from config import settings

logger = logging.getLogger(__name__)


class TTSService:
    def __init__(self):
        self.voice = settings.EDGE_TTS_VOICE

    async def synthesize(self, text: str) -> bytes:
        try:
            communicate = edge_tts.Communicate(text, self.voice)
            audio_buffer = io.BytesIO()

            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.write(chunk["data"])

            audio_bytes = audio_buffer.getvalue()
            logger.info(f"TTS synthesized {len(audio_bytes)} bytes for '{text[:50]}...'")
            return audio_bytes
        except Exception as e:
            logger.error(f"TTS error: {e}")
            raise

    async def get_voices(self) -> list[dict]:
        voices = await edge_tts.list_voices()
        return [
            {"name": v["Name"], "gender": v["Gender"], "locale": v["Locale"]}
            for v in voices
        ]


tts_service = TTSService()
