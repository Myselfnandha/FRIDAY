import logging
import os
import json
from dotenv import load_dotenv

from livekit.agents import JobContext, WorkerOptions, cli, tts, stt, llm, vad
from livekit import agents, rtc
from livekit.plugins import google

# Import Brain
from brain import AlanBrain

load_dotenv()

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alan-agent")

# BRAIN INSTANCE
brain = AlanBrain()

def prewarm(proc: JobContext):
    proc.userdata["brain"] = brain

async def entrypoint(ctx: JobContext):
    logger.info(f"Starting ALAN Agent in room {ctx.room.name}")
    
    # 1. Connect
    await ctx.connect()
    
    # 2. Init Agent
    # We use Google's Realtime API (Gemini 2.0)
    # This handles STT/TTS and LLM in one connection
    from livekit.agents.multimodal import MultimodalAgent
    from livekit.plugins.google.beta.realtime import RealtimeModel
    
    api_key = os.getenv("GOOGLE_API_KEY1") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.error("No Google API Key found (checked GOOGLE_API_KEY1 and GOOGLE_API_KEY).")

    model = RealtimeModel(
        model="models/gemini-2.0-flash-exp",
        api_key=api_key,
        instructions=(
            "You are ALAN. "
            "System: Project ALAN v2. "
            "Traits: Precise, Concise, Adaptive. "
            "If the user speaks Tamil, reply in Tamil. "
            "If the user speaks English, reply in English. "
            "You control the ALAN Interface. "
            "When you speak, the Arc Reactor glows blue."
        )
    )
    agent = MultimodalAgent(model=model)
    
    # State tracking via dictionary to support closure modification
    state = {"active": False}

    # Deepgram TTS & STT (Best Free Option)
    dg_api = os.getenv("DEEPGRAM_API_KEY")
    deepgram_tts = None
    deepgram_stt = None
    
    if dg_api:
        from livekit.plugins import deepgram
        deepgram_tts = deepgram.TTS(api_key=dg_api)
        deepgram_stt = deepgram.STT(api_key=dg_api)
        logger.info("✅ Deepgram Fallback Plugin Initialized")
    else:
        logger.warning("⚠️ No DEEPGRAM_API_KEY found. Fallback Voice Mode will be text-only. Add it to Secrets!")

    async def speak_text(text: str):
        """Helper to speak text via Deepgram TTS (if available)"""
        if deepgram_tts:
            logger.info(f"Speaking: {text}")
            try:
                audio_stream = deepgram_tts.synthesize(text)
                await ctx.room.local_participant.publish_track(
                    destination=rtc.TrackSource.SOURCE_MICROPHONE,
                    track=rtc.LocalAudioTrack.create_audio_track("agent_voice", audio_stream)
                )
            except Exception as e:
                logger.error(f"Deepgram TTS Failed: {e}")
        else:
            logger.warning(f"No TTS Engine available. Text response only: {text}")

    # Helper to process text (Shared by Chat and STT)
    async def process_text_input(text: str):
        # Get response (Brain handles fallback)
        response_text = await brain.think(text, ctx)
        
        # Send Text to UI
        reply = {
            "type": "agent_chat",
            "text": response_text
        }
        await ctx.room.local_participant.publish_data(
            json.dumps(reply).encode("utf-8"),
            reliable=True
        )
        
        # Voice Output
        await speak_text(response_text)

    # 3. Handle Chat (Data Channel)
    @ctx.room.on("data_received")
    def on_data(data: rtc.DataPacket):
        try:
            msg = data.data.decode("utf-8")
            payload = json.loads(msg)
            if payload.get('type') == 'user_chat':
                user_text = payload.get('text')
                if user_text:
                    import asyncio
                    asyncio.create_task(process_text_input(user_text))
        except Exception as e:
            logger.error(f"Error handling data: {e}")

    # 4. Handle Audio (STT Fallback)
    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        # Fallback only if agent not active AND we have STT
        if track.kind == rtc.TrackKind.KIND_AUDIO and not state["active"] and deepgram_stt:
            logger.info("Fallback Mode: Subscribing to User Audio for STT")
            
            async def transcribe_track():
                try:
                    audio_stream = rtc.AudioStream(track)
                    stt_stream = deepgram_stt.stream()
                    async def forward_audio():
                        async for frame in audio_stream:
                            stt_stream.push_frame(frame)
                    async def handle_transcription():
                        async for event in stt_stream:
                             if event.type == stt.SpeechEventType.FINAL_TRANSCRIPT:
                                 text = event.alternatives[0].text
                                 logger.info(f"STT Heard: {text}")
                                 if text:
                                     await process_text_input(text)
                    import asyncio
                    asyncio.create_task(forward_audio())
                    await handle_transcription()
                except Exception as e:
                     logger.error(f"Fallback STT Error: {e}")

            import asyncio
            asyncio.create_task(transcribe_track())

    # 5. Start Agent (Attempt)
    participant = await ctx.wait_for_participant()
    logger.info(f"Starting agent for participant: {participant.identity}")
    
    # Send Greeting (Text)
    greeting = {"type": "agent_chat", "text": "Hello sir, I am Friday, your personal assistant."}
    await ctx.room.local_participant.publish_data(json.dumps(greeting).encode("utf-8"), reliable=True)
    await speak_text("Hello sir, I am Friday, your personal assistant.")

    try:
        await agent.start(ctx.room, participant)
        state["active"] = True
    except Exception as e:
        logger.error(f"❌ Failed to start Multimodal Agent: {e}")
        logger.warning(f"⚠️ Running in Text/Voice Fallback Mode.")
        # If STT failed init, warn user
        if not deepgram_stt:
             logger.warning("⚠️ DEEPGRAM_API_KEY missing -> Fallback Voice Input DISABLED. Use Text Chat.")
    
    # Run indefinitely (Fix for 'Room object has no attribute disconnected')
    import asyncio
    await asyncio.Future()

if __name__ == "__main__":
    from server import start_background_server
    start_background_server()

    try:
        agents.cli.run_app(
            agents.WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm),
        )
    except Exception as e:
        logger.error(f"Worker Error: {e}")
