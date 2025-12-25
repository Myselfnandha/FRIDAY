import logging
import json
import os
import os
# import google.generativeai as genai # Deprecated
from enum import Enum
from memory import AlanMemory
from dotenv import load_dotenv

load_dotenv()
# genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

logger = logging.getLogger("alan.brain")

class AgentRole(Enum):
    PLANNER = "planner"
    WORKER = "worker"
    REVIEWER = "reviewer"

class AlanBrain:
    def __init__(self):
        self.mode = "fast" 
        self.memory = AlanMemory()
    
    async def think(self, user_input, agent_ctx) -> str:
        """
        Core reasoning loop.
        Accepts: str OR UnifiedInputEvent
        """
        # 0. Unpack Input
        if hasattr(user_input, "normalized"):
            # It's a UnifiedInputEvent
            text = user_input.normalized
            source = user_input.source
            # Check for critical priority
            # if user_input.priority == "critical": ...
        else:
            # Legacy string support
            text = str(user_input)
            source = "text"

        # 1. Perception & Memory Recall
        logger.info(f"Thinking about: {text} [{source}]")
        self.memory.log_interaction("user", text)
        
        history = self.memory.get_recent_history(limit=5)
        user_prefs = self.memory.get_context("user_preferences")
        
        # 2. Planning (Simulated)
        # In a real expanded version, this would call a 'Planner' agent
        plan = "Direct Response"
        if "analyze" in text.lower() or "scan" in text.lower():
            plan = "Decompose -> Scan -> Report"
        
        logger.info(f"Plan formulated: {plan}")

        # 3. Context Construction
        system_prompt = (
            "You are ALAN (Autonomous Logical Agent Network). "
            "Role: Advanced AI Assistant. "
            f"Current Plan: {plan}. "
            f"Context: {len(history)} recent messages. "
            "Traits: Logical, Proactive, Brutally Honest. "
            "Instruction: Reply to the user input based on the plan and context."
        )
        
        # 4. Action (Generate Response)
        try:
            from google import genai
            # PRIORITIZE KEY 1
            api_key = os.getenv("GOOGLE_API_KEY1") or os.getenv("GOOGLE_API_KEY")
            client = genai.Client(api_key=api_key)
            
            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=f"{system_prompt}\n\nUser: {text}"
            )
            
            text_response = response.text
            self.memory.log_interaction("assistant", text_response)
            return text_response

        except Exception as google_e:
            logger.warning(f"Google Brain error: {google_e}. Switch to OpenRouter...")
            try:
                # OPENROUTER FALLBACK
                from openai import OpenAI
                or_key = os.getenv("OPENROUTER_API")
                if not or_key:
                    raise Exception("No OPENROUTER_API key configured.")

                client = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=or_key,
                )
                
                completion = client.chat.completions.create(
                    model="meta-llama/llama-3.2-3b-instruct:free",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": text}
                    ]
                )
                text_response = completion.choices[0].message.content
                self.memory.log_interaction("assistant", text_response)
                return text_response
                
            except Exception as e:
                logger.error(f"Brain total freeze: {e}")
                return "I am unable to process that request safely explicitly."


