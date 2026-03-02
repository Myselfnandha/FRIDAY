import logging
from groq import AsyncGroq
from config import settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_LLM_MODEL

    async def chat(self, messages: list[dict], temperature: float = 0.7) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=1024,
            )
            content = response.choices[0].message.content
            logger.info(f"LLM response ({len(content)} chars)")
            return content
        except Exception as e:
            logger.error(f"LLM error: {e}")
            raise

    async def chat_stream(self, messages: list[dict], temperature: float = 0.7):
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=1024,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
        except Exception as e:
            logger.error(f"LLM stream error: {e}")
            raise


llm_service = LLMService()
