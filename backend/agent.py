import os
import json
import asyncio
import logging
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning)

from dotenv import load_dotenv
from livekit.agents import VoicePipelineAgent

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit import rtc
from livekit.rtc import VideoStream

from livekit.plugins.google import GeminiLLM

from local_stt import LocalWhisperSTT
from edge_tts_plugin import EdgeTTS
from custom_vad import WebRTCVAD

from core.brain.pipeline import respond
from core.memory.memory_manager import MemoryManager

import numpy as np

# =========================
# INIT
# =========================
load_dotenv()
logger = logging.getLogger("alan-agent")
logging.basicConfig(level=logging.INFO)


# =========================
# HOTWORD LISTENER
# =========================
class HotwordListener:
    def __init__(self, wake_word="alan"):
        self.model = openwakeword.Model()
        self.wake_word = wake_word.lower()
        self.triggered = asyncio.Event()

    async def listen(self):
        loop = asyncio.get_event_loop()

        def callback(indata, frames, time, status):
            audio = np.frombuffer(indata, dtype=np.int16)
            preds = self.model.predict(audio)
            if self.wake_word in preds and preds[self.wake_word] > 0.5:
                loop.call_soon_threadsafe(self.triggered.set)

        with sd.InputStream(
            channels=1,
            samplerate=16000,
            dtype="int16",
            callback=callback,
        ):
            await self.triggered.wait()


# =========================
# FUNCTION CONTEXT (TOOLS)
# =========================
class AssistantFnc(llm.FunctionContext):
    def __init__(self):
        super().__init__()
        self.memory = MemoryManager()

    @llm.ai_callable(description="Save important info to long-term memory.")
    def save_memory(self, key: str, value: str):
        self.memory.remember(key, value)
        return "Memory saved."

    @llm.ai_callable(description="Recall info from long-term memory.")
    def recall_memory(self, query: str):
        res = self.memory.search_similar(query)
        return res if res else "No memory found."


# =========================
# VIDEO PROCESSING HOOK
# =========================
async def process_video_track(track: rtc.VideoTrack):
    stream = VideoStream(track)
    async for frame in stream:
        # frame.buffer -> numpy array
        # Plug vision model here later
        pass


# =========================
# ENTRYPOINT
# =========================
async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)

    system_prompt = (
        "You are Alan, an autonomous AI assistant designed by Nandha. "
        "Style: JARVIS + TARS hybrid. "
        "Traits: precise, logical, concise, proactive. "
        "Languages: English, Tamil, Tanglish. "
        "Switch language automatically."
    )

    chat_ctx = llm.ChatContext().append(
        role="system",
        text=system_prompt
    )

    fnc_ctx = AssistantFnc()

    agent = VoicePipelineAgent(
        vad=WebRTCVAD(aggressiveness=3),
        stt=LocalWhisperSTT(model_name="tiny"),
        llm=GeminiLLM(
            model="models/gemini-1.5-flash",
            api_key=os.getenv("GOOGLE_API_KEY"),
        ),
        tts=EdgeTTS(
            default_voice="en-US-BrianNeural",
            tamil_voice="ta-IN-ValluvarNeural",
        ),
        chat_ctx=chat_ctx,
        fnc_ctx=fnc_ctx,
    )

    await agent.start(ctx.room, participant=None)

    # =========================
    # HOTWORD GATE
    # =========================
    hotword = HotwordListener("alan")
    await agent.say("Hotword active. Say Alan.", allow_interruptions=False)
    await hotword.listen()
    await agent.say("Yes boss?", allow_interruptions=True)

    # =========================
    # TEXT INPUT (DATA CHANNEL)
    # =========================
    @ctx.room.on("data_received")
    def on_data(dp: rtc.DataPacket):
        if not dp.data:
            return

        try:
            raw = dp.data.decode("utf-8")
            message = raw

            try:
                payload = json.loads(raw)
                if isinstance(payload, dict) and "message" in payload:
                    message = payload["message"]
            except json.JSONDecodeError:
                pass

            async def handle_text():
                result = respond(message, session_id="livekit")
                text = result.get("text", "") if isinstance(result, dict) else str(result)
                if text:
                    await agent.say(text, allow_interruptions=True)

            asyncio.create_task(handle_text())

        except Exception:
            logger.exception("Data channel error")

    # =========================
    # VIDEO / SCREEN SHARE INPUT
    # =========================
    @ctx.room.on("track_subscribed")
    def on_track(track, pub, participant):
        if track.kind == rtc.TrackKind.KIND_VIDEO:
            logger.info(f"Video track from {participant.identity}")
            asyncio.create_task(process_video_track(track))


# =========================
# MAIN
# =========================
if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            max_workers=1,
        )
    )
