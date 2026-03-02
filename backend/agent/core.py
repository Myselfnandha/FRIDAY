import logging
import json
from config import settings
from agent.prompts import get_system_prompt, get_session_greeting_prompt
from agent.memory import memory_service
from services.llm import llm_service
from services.search import search_service
from services.vision import vision_service

logger = logging.getLogger(__name__)

SEARCH_KEYWORDS = [
    "search", "look up", "find", "google", "what is", "who is",
    "latest", "news", "current", "today", "weather", "how to",
    "when did", "where is", "tell me about",
]


class AgentCore:
    def __init__(self):
        self.conversation_history: list[dict] = []
        self._initialized = False

    async def initialize(self) -> str:
        memory_context = memory_service.get_context_string()

        self.conversation_history = [
            {"role": "system", "content": get_system_prompt()},
        ]

        if memory_context:
            self.conversation_history.append({
                "role": "system",
                "content": f"Here are your memories about {settings.FRIDAY_USER_NAME}:\n{memory_context}",
            })

        greeting_messages = self.conversation_history + [
            {"role": "user", "content": get_session_greeting_prompt()},
        ]

        greeting = await llm_service.chat(greeting_messages, temperature=0.8)
        self.conversation_history.append({"role": "assistant", "content": greeting})
        self._initialized = True
        logger.info("Agent initialized with greeting")
        return greeting

    def _needs_search(self, text: str) -> bool:
        text_lower = text.lower()
        return any(kw in text_lower for kw in SEARCH_KEYWORDS)

    async def process_text(self, user_text: str) -> str:
        if not self._initialized:
            await self.initialize()

        self.conversation_history.append({"role": "user", "content": user_text})

        if self._needs_search(user_text):
            search_results = await search_service.search(user_text)
            self.conversation_history.append({
                "role": "system",
                "content": f"Web search results for the user's query:\n{search_results}\n\nUse these results to answer. Cite sources if relevant.",
            })

        response = await llm_service.chat(self.conversation_history)
        self.conversation_history.append({"role": "assistant", "content": response})

        self._save_to_memory(user_text, response)

        return response

    async def process_text_stream(self, user_text: str):
        if not self._initialized:
            await self.initialize()

        self.conversation_history.append({"role": "user", "content": user_text})

        if self._needs_search(user_text):
            search_results = await search_service.search(user_text)
            self.conversation_history.append({
                "role": "system",
                "content": f"Web search results for the user's query:\n{search_results}\n\nUse these results to answer. Cite sources if relevant.",
            })

        full_response = ""
        async for chunk in llm_service.chat_stream(self.conversation_history):
            full_response += chunk
            yield chunk

        self.conversation_history.append({"role": "assistant", "content": full_response})
        self._save_to_memory(user_text, full_response)

    async def process_vision(self, image_bytes: bytes, prompt: str = "") -> str:
        if not self._initialized:
            await self.initialize()

        vision_prompt = prompt or "What do you see in this image? Be concise."
        description = await vision_service.analyze_image(image_bytes, vision_prompt)

        self.conversation_history.append({"role": "user", "content": f"[User showed camera/screen] {prompt or 'What do you see?'}"})
        self.conversation_history.append({"role": "assistant", "content": description})

        return description

    def _save_to_memory(self, user_text: str, assistant_response: str):
        try:
            memory_service.add(
                [
                    {"role": "user", "content": user_text},
                    {"role": "assistant", "content": assistant_response},
                ],
                user_id=settings.FRIDAY_USER_ID,
            )
        except Exception as e:
            logger.warning(f"Memory save failed (non-fatal): {e}")

    def reset(self):
        self.conversation_history = []
        self._initialized = False
        logger.info("Agent reset")
