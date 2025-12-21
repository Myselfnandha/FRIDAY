
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice import Agent, AgentSession
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
import logging
from dotenv import load_dotenv

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
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL) 
    
    system_instructions = (
        "You are Alan, an advanced AI assistant designed by Nandha used in 'FRIDAY'. "
        "Style: Modeled after JARVIS & Friday (Iron Man). Intelligent, witty, concise, cool, and highly capable. "
        "Languages: You are fluent in English, Tamil, and Tanglish (Tamil+English mix). "
        "Behave naturally. Switch languages based on the user's input style. "
        "Capabilities: Memory, System Control, Learning. "
    )

    fnc_ctx = AssistantFnc()
    
    agent = Agent(
        instructions=system_instructions,
        tools=llm.find_function_tools(fnc_ctx),
    )

    session = AgentSession(
        vad=WebRTCVAD(aggressiveness=3), 
        stt=LocalWhisperSTT(model_name="tiny.en"), 
        llm=google.LLM(model="gemini-1.5-flash"),
        tts=EdgeTTS(default_voice="en-US-BrianNeural", tamil_voice="ta-IN-ValluvarNeural"),
    )

    # CRITICAL FIX: await the start method
    await session.start(room=ctx.room, participant=agent)

    await session.say("Systems online. Alan is ready to serve.", allow_interruptions=True)

    @ctx.room.on("data_received")
    def on_data(dp: rtc.DataPacket):
        if dp.data:
            try:
                raw_text = dp.data.decode("utf-8")
                # Handle JSON from Chat
                text_command = raw_text
                try:
                    payload = json.loads(raw_text)
                    if isinstance(payload, dict) and "message" in payload:
                        text_command = payload["message"]
                except json.JSONDecodeError:
                    pass
                
                logger.info(f"Processing command: {text_command}")
                
                # Manually handle chat context for AgentSession
                user_msg = llm.ChatMessage(role=llm.ChatRole.USER, content=text_command)
                agent.chat_ctx.append(user_msg)
                
                asyncio.create_task(session.say(session.llm.chat(chat_ctx=agent.chat_ctx)))
                
            except Exception as e:
                logger.error(f"Failed to process command: {e}")

if __name__ == "__main__":
    # Disable preloading to save memory/startup time
    # Set max_workers to 1 if using 'start' command, though 'dev' implied 1.
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
