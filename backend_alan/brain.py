import logging
import json
import os
import google.generativeai as genai
from enum import Enum
from memory import AlanMemory
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

logger = logging.getLogger("alan.brain")

class AgentRole(Enum):
    PLANNER = "planner"
    WORKER = "worker"
    REVIEWER = "reviewer"

    def __init__(self):
        self.mode = "fast" 
        self.memory = AlanMemory()
    
    async def think(self, user_input: str, agent_ctx) -> str:
        """
        Core reasoning loop.
        """
        # 1. Perception & Memory Recall
        logger.info(f"Thinking about: {user_input}")
        self.memory.log_interaction("user", user_input)
        
        history = self.memory.get_recent_history(limit=5)
        user_prefs = self.memory.get_context("user_preferences")
        
        # 2. Planning (Simulated)
        # In a real expanded version, this would call a 'Planner' agent
        plan = "Direct Response"
        if "analyze" in user_input.lower() or "scan" in user_input.lower():
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
        # Using standard Gemini Flash for the "Thinking" / Text-Chat layer
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            chat = model.start_chat(history=[])
            response = chat.send_message(f"{system_prompt}\n\nUser: {user_input}")
            
            # Log output context
            self.memory.log_interaction("assistant", response.text)
            return response.text
        except Exception as e:
            logger.error(f"Brain freeze: {e}")
            return "I am unable to process that request safely explicitly."


