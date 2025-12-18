import logging
from mem0 import Memory
import os
import json

logger = logging.getLogger("brain")

class CognitiveEngine:
    def __init__(self, memory_manager):
        self.memory = memory_manager
        # We use a separate collection or just specific queries for "skills" vs "facts"
        # Mem0 abstracts this, checking user_id. We can use "system_learner" as user_id for global skills.

    def plan_task(self, goal: str, context: dict = None):
        """
        Uses Planning Logic to break down complex goals.
        Checks if we have done this before.
        """
        # 1. Check Memory for similar successful plans
        similar_tasks = self.memory.search_memory(goal, user_id="system_learner", limit=1)
        
        previous_plan = None
        if similar_tasks:
            # Simple heuristic: if we have a robust memory of a plan, use it
            logger.info(f"Recall similar task strategy: {similar_tasks[0]}")
            previous_plan = similar_tasks[0]

        return previous_plan

    def learn_outcome(self, goal: str, plan_executed: str, success: bool, feedback: str = ""):
        """
        Reinforcement step: Save successful plans to 'system_learner' memory.
        Save failures with feedback to avoid repetition.
        """
        status = "SUCCESS" if success else "FAILURE"
        memory_text = f"GOAL: {goal} | PLAN: {plan_executed} | OUTCOME: {status} | FEEDBACK: {feedback}"
        
        # We store this in the "system_learner" user ID, essentially the agent's own experience
        self.memory.add_memory(memory_text, user_id="system_learner")
        logger.info(f"Learned from execution: {status}")

    def detect_language_style(self, text: str):
        """
        Heuristic to detect Tamil vs English vs Tanglish for TTS selection.
        """
        # Simple check for Tamil code range
        tamil_chars = [c for c in text if u'\u0B80' <= c <= u'\u0BFF']
        if len(tamil_chars) > len(text) * 0.1: # If >10% tamil chars
            return "tamil"
        return "english"  # Treat Tanglish (Romanized) as English for TTS usually, or generic
