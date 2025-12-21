import logging
import os
import json
from dotenv import load_dotenv

from livekit.agents.pipeline import VoicePipelineAgent
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.plugins import google
from memory import MemoryManager
from local_stt import LocalWhisperSTT
from edge_tts_plugin import EdgeTTS
from system_tools import SystemControl
from custom_vad import WebRTCVAD
from brain import CognitiveEngine
import openwakeword
from livekit import rtc
import asyncio

# Additional imports for Video
from livekit.agents import utils

load_dotenv()
logger = logging.getLogger("alan-agent")

class AssistantFnc(llm.FunctionContext):
    def __init__(self):
        super().__init__()
        self.memory = MemoryManager()
        self.brain = CognitiveEngine(self.memory)
        self.sys_control = SystemControl()

    @llm.ai_callable(description="Open a generic application on Windows (e.g., 'Calculator', 'Chrome', 'Spotify').")
    def open_app_windows(self, app_name: str):
        return self.sys_control.open_windows_app(app_name)

    @llm.ai_callable(description="Close a generic application on Windows (e.g., 'Calculator', 'Chrome').")
    def close_app_windows(self, app_name: str):
        return self.sys_control.close_windows_app(app_name)

    @llm.ai_callable(description="Open an app on connected Android Phone. specific the full package name (e.g., 'com.whatsapp', 'com.instagram.android', 'com.google.android.youtube').")
    def open_app_android(self, package_name: str):
        return self.sys_control.open_android_app(package_name)

    @llm.ai_callable(description="Close/Kill an app on connected Android Phone using package name.")
    def close_app_android(self, package_name: str):
        return self.sys_control.close_android_app(package_name)

    @llm.ai_callable(description="Ask Google Assistant on Android to perform a system task (e.g., 'Turn on Flashlight', 'Set alarm for 7AM', 'Turn off WiFi').")
    def ask_android_assistant(self, command: str):
        return self.sys_control.command_android_assistant(command)

    @llm.ai_callable(description="Save important information or context to long-term memory for future retrieval.")
    def save_memory(self, text: str):
        """Save text to memory."""
        self.memory.add_memory(text)
        return "Memory saved successfully."

    @llm.ai_callable(description="Search and recall information from long-term memory based on a query.")
    def recall_memory(self, query: str):
        """Search memory for query."""
        results = self.memory.search_memory(query)
        if results:
            return f"Memory Recall Results: {'; '.join(results)}"
        return "No relevant memories found."

    @llm.ai_callable(description="Signal that a task was completed and provide feedback to self-learning engine.")
    def task_feedback(self, goal: str, was_successful: bool, notes: str):
        self.brain.learn_outcome(goal, "Executed Plan", was_successful, notes)
        return "Feedback recorded."

async def entrypoint(ctx: JobContext):
    # Subscribe to Audio AND Video
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL) 
    
    # Initial Instructions
    system_instructions = (
        "You are Alan, an advanced AI assistant designed by Nandha used in 'FRIDAY'. "
        "Style: Modeled after JARVIS & Friday (Iron Man). Intelligent, witty, concise, cool, and highly capable. "
        "Languages: You are fluent in English, Tamil, and Tanglish (Tamil+English mix). "
        "Behave naturally. Switch languages based on the user's input style. "
        "Input: You have access to real-time audio and system tools. "
        "Capabilities: "
        "1. Memory: Use 'save_memory' and 'recall_memory' to persistent facts. "
        "2. System: Use 'open_app_windows', 'ask_android_assistant' to control devices. "
        "3. Learning: If you complete a complex task, use 'task_feedback' to learn. "
        "4. Planning: If a user asks a complex goal, break it down. "
        "Awake State: If the user says 'Hey Alan' or 'Wake up', acknowledge readiness. "
        "Otherwise, be responsive but concise."
    )

    initial_ctx = llm.ChatContext().append(
        role="system",
        text=system_instructions
    )

    fnc_ctx = AssistantFnc()
    
    # Create VoicePipelineAgent (Modern SDK)
    agent = VoicePipelineAgent(
        vad=WebRTCVAD(aggressiveness=3), # Lightweight VAD
        stt=LocalWhisperSTT(model_name="tiny.en"), # Use Tiny model (70MB RAM)
        llm=google.LLM(model="gemini-1.5-flash"),
        tts=EdgeTTS(default_voice="en-US-BrianNeural", tamil_voice="ta-IN-ValluvarNeural"),
        chat_ctx=initial_ctx,
        fnc_ctx=fnc_ctx,
    )

    # Start the agent session with the room
    # Check if participant is available (user)
    # Usually we wait for participant or just start. 
    # VoicePipelineAgent.start(room, participant)
    # We can get the participant from the room if available or just wait.
    # Typically:
    await agent.start(ctx.room, participant=None) # Passing None might wait for first participant or handle room event

    # Say initial greeting
    await agent.say("Systems online. Alan is ready to serve.", allow_interruptions=True)

    @ctx.room.on("data_received")
    def on_data(dp: rtc.DataPacket):
        if dp.data:
            try:
                raw_text = dp.data.decode("utf-8")
                logger.info(f"Received data: {raw_text}")
                
                # Try parsing as JSON (LiveKit Chat sends JSON)
                text_command = raw_text
                try:
                    payload = json.loads(raw_text)
                    if isinstance(payload, dict) and "message" in payload:
                        text_command = payload["message"]
                except json.JSONDecodeError:
                    pass
                
                logger.info(f"Processing command: {text_command}")

                # Inject user message into chat context
                user_msg = llm.ChatMessage(role=llm.ChatRole.USER, content=text_command)
                agent.chat_ctx.append(user_msg)
                
                # Trigger response via agent's LLM
                asyncio.create_task(agent.say(agent.llm.chat(chat_ctx=agent.chat_ctx)))
                
            except Exception as e:
                logger.error(f"Failed to process data command: {e}")

if __name__ == "__main__":
    # Disable preloading to save memory/startup time
    # Set max_workers to 1 if using 'start' command, though 'dev' implied 1.
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
