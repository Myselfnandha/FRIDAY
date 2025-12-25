import logging
import json
import os

# import google.generativeai as genai # Deprecated
from enum import Enum
import asyncio
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
        
        # Local Model Setup
        self.local_model = None
        self.model_path = os.path.join(os.path.dirname(__file__), "models/Qwen3-14B-Gemini-3-Pro-Preview-Distill.q4_k_m.gguf")
        
        try:
            if os.path.exists(self.model_path):
                logger.info(f"Loading local model from {self.model_path}...")
                from llama_cpp import Llama
                self.local_model = Llama(
                    model_path=self.model_path,
                    n_gpu_layers=-1, # Offload all to GPU if possible
                    n_ctx=8192,      # Decent context window
                    verbose=True
                )
                logger.info("Local Qwen3 Model Loaded Successfully.")
            else:
                logger.warning(f"Local model not found at {self.model_path}. Using Cloud APIs.")
        except Exception as e:
            logger.error(f"Failed to load local model: {e}")
    
    async def think(self, user_input, agent_ctx, images: list = None) -> str:
        """
        Core reasoning loop.
        Accepts: str OR UnifiedInputEvent
        """
        # 0. Unpack Input
        if hasattr(user_input, "normalized"):
            text = user_input.normalized
            source = user_input.source
            # Check flags/intent for Mode
            # Simple heuristic: if "deeply" or "analyze" in text, user DEEP mode
            if "deep" in text.lower() or "plan" in text.lower():
                self.mode = "deep"
            elif "debug" in text.lower() or "error" in text.lower():
                self.mode = "debug"
            else:
                self.mode = "fast"
        else:
            text = str(user_input)
            source = "text"
            self.mode = "fast"

        logger.info(f"Thinking [{self.mode.upper()}] about: {text} [{source}]")
        self.memory.log_interaction("user", text)

        # Dispatch
        if self.mode == "deep":
            return await self._think_deep(text, images)
        elif self.mode == "debug":
            return await self._think_debug(text, images)
        else:
            return await self._think_fast(text, images)

    async def _think_fast(self, text: str, images: list = None) -> str:
        """Standard single-pass response (Gemini Flash)."""
        history = self.memory.get_recent_history(limit=5)
        personality = self.memory.get_personality()
        prefs = self.memory.get_long_term("user_preferences")
        
        system_prompt = (
            "You are ALAN. "
            "Role: Advanced AI Assistant. "
            f"Traits: {json.dumps(personality)}. "
            f"User Preferences: {json.dumps(prefs)}. "
            f"Context: {len(history)} recent messages. "
            "Instruction: Reply directly to the user, adhering to your personality traits."
        )
        return await self._generate(system_prompt, text, images)

    async def _think_deep(self, text: str, images: list = None) -> str:
        """Chain-of-Thought / Planning Mode."""
        personality = self.memory.get_personality()
        
        system_prompt = (
            "You are ALAN in DEEP THINKING MODE. "
            f"Traits: {json.dumps(personality)}. "
            "Instruction: First, analyze the user's request step-by-step. "
            "Identify the core problem, any constraints, and potential strategies. "
            "Then, provide a comprehensive solution. "
            "Output Format: "
            "**Analysis**: ... "
            "**Plan**: ... "
            "**Solution**: ..."
        )
        return await self._generate(system_prompt, text, images)

    async def _think_debug(self, text: str, images: list = None) -> str:
        """Forensic Mode."""
        system_prompt = (
            "You are ALAN in DEBUG MODE. "
            "Instruction: Analyze the input as a technical problem. "
            "Look for keywords indicating errors, crashes, or anomalies. "
            "Suggest potential fixes or diagnostic steps. "
            "Be terse and technical."
        )
        return await self._generate(system_prompt, text, images)

    async def _generate(self, system_prompt: str, user_input: str, images: list = None) -> str:
        """Shared Generation Logic with Fallback."""
        
        # 1. Local Model (Priority, if no images)
        # Note: Current GGUF setup implies text-only unless we add vision adapters.
        if self.local_model and not images:
            try:
                logger.info("Using Local Qwen3 Model...")
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ]
                
                # Run blocking inference in thread
                response = await asyncio.to_thread(
                    self.local_model.create_chat_completion,
                    messages=messages,
                    max_tokens=512,
                    temperature=0.7
                )
                
                text_response = response["choices"][0]["message"]["content"]
                self.memory.log_interaction("assistant", text_response)
                return text_response
            except Exception as e:
                logger.error(f"Local model inference failed: {e}. Falling back to Cloud.")

        # 2. Cloud APIs (Gemini / OpenRouter)
        try:
            from google import genai
            api_key = os.getenv("GOOGLE_API_KEY1") or os.getenv("GOOGLE_API_KEY")
            client = genai.Client(api_key=api_key)
            

            
            content_payload = [f"{system_prompt}\n\nUser: {user_input}"]
            if images:
                # Assuming images are already in a format Gemini accepts (PIL Image or similar)
                content_payload.extend(images)

            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=content_payload
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
                        {"role": "user", "content": user_input}
                    ]
                )
                text_response = completion.choices[0].message.content
                self.memory.log_interaction("assistant", text_response)
                return text_response
                
            except Exception as e:
                logger.error(f"Brain total freeze: {e}")
                return "I am unable to process that request safely explicitly."


