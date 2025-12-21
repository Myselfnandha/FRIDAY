import logging
import os
import json
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import google
from memory import MemoryManager
from local_stt import LocalWhisperSTT
from edge_tts_plugin import EdgeTTS
from system_tools import SystemControl
from custom_vad import WebRTCVAD
from brain import CognitiveEngine
import openwakeword # For future local wake word refinement if needed
from livekit import rtc

# Additional imports for Video
from livekit.agents import utils

load_dotenv()
logger = logging.getLogger("alan-agent")

class AssistantFnc:
    def __init__(self):
        super().__init__()
        self.memory = MemoryManager()
        self.brain = CognitiveEngine(self.memory)
        self.sys_control = SystemControl()

    @llm.function_tool(description="Open a generic application on Windows (e.g., 'Calculator', 'Chrome', 'Spotify').")
    def open_app_windows(self, app_name: str):
        return self.sys_control.open_windows_app(app_name)

    @llm.function_tool(description="Close a generic application on Windows (e.g., 'Calculator', 'Chrome').")
    def close_app_windows(self, app_name: str):
        return self.sys_control.close_windows_app(app_name)

    @llm.function_tool(description="Open an app on connected Android Phone. specific the full package name (e.g., 'com.whatsapp', 'com.instagram.android', 'com.google.android.youtube').")
    def open_app_android(self, package_name: str):
        return self.sys_control.open_android_app(package_name)

    @llm.function_tool(description="Close/Kill an app on connected Android Phone using package name.")
    def close_app_android(self, package_name: str):
        return self.sys_control.close_android_app(package_name)

    @llm.function_tool(description="Ask Google Assistant on Android to perform a system task (e.g., 'Turn on Flashlight', 'Set alarm for 7AM', 'Turn off WiFi').")
    def ask_android_assistant(self, command: str):
        return self.sys_control.command_android_assistant(command)

    @llm.function_tool(description="Save important information or context to long-term memory for future retrieval.")
    def save_memory(self, text: str):
        """Save text to memory."""
        self.memory.add_memory(text)
        return "Memory saved successfully."

    @llm.function_tool(description="Search and recall information from long-term memory based on a query.")
    def recall_memory(self, query: str):
        """Search memory for query."""
        results = self.memory.search_memory(query)
        if results:
            return f"Memory Recall Results: {'; '.join(results)}"
        return "No relevant memories found."

    @llm.function_tool(description="Signal that a task was completed and provide feedback to self-learning engine.")
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

    fnc_ctx = AssistantFnc()
    
    # Create Agent (Logic & Tools)
    agent = Agent(
        instructions=system_instructions,
        tools=llm.find_function_tools(fnc_ctx),
    )

    # Create Agent Session (Pipeline: VAD -> STT -> LLM -> TTS)
    session = AgentSession(
        vad=WebRTCVAD(aggressiveness=3), # Lightweight VAD
        stt=LocalWhisperSTT(model_name="tiny.en"), # Use Tiny model (70MB RAM)
        llm=google.LLM(model="gemini-1.5-flash"),
        tts=EdgeTTS(default_voice="en-US-BrianNeural", tamil_voice="ta-IN-ValluvarNeural"),
    )

    # Start the agent session with the room
    # Start the agent session with the room
    session.start(room=ctx.room, participant=agent)

    # Say initial greeting
    await session.say("Systems online. Alan is ready to serve.", allow_interruptions=True)

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
                # Using agent.chat_ctx if available, otherwise trying session.chat_ctx logic
                # For this specific Agent structure, context management might be on 'agent' 
                # but 'llm' and 'say' are definitely on 'session'.
                
                user_msg = llm.ChatMessage(role=llm.ChatRole.USER, content=text_command)
                
                # Append to context
                agent.chat_ctx.append(user_msg)
                
                # Trigger response
                import asyncio
                async def process_text_command():
                    # Use Session's LLM and Say methods
                    if hasattr(session, 'llm'):
                        stream = session.llm.chat(chat_ctx=agent.chat_ctx)
                        await session.say(stream)
                    else:
                        logger.warning("Session has no LLM attribute, cannot process command.")
                
                asyncio.create_task(process_text_command())
                
            except Exception as e:
                logger.error(f"Failed to process data command: {e}")
if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
