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
    
    # State tracking
    state = {"active": False}

    # --- FALLBACK: EdgeTTS (Free) & SpeechRecognition (Free) ---
    import edge_tts
    import speech_recognition as sr
    import tempfile
    import asyncio
    
    # TTS Helper (EdgeTTS)
    async def speak_text(text: str):
        """Generates audio using EdgeTTS and plays it via LiveKit."""
        logger.info(f"Speaking (EdgeTTS): {text}")
        try:
            # Generate Audio
            communicate = edge_tts.Communicate(text, "en-US-ChristopherNeural") # Great male voice
            
            # Stream to file (Simpler for compatibility with LiveKit AudioStream)
            # Efficient way: Write to memory buffer
            # Note: LiveKit expects an Async Iterable or similar. 
            # We can use a decoded stream.
            # Easiest valid way: Save mp3, decode to PCM using av (since we have av installed)
            
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as fp:
                temp_filename = fp.name
            
            await communicate.save(temp_filename)
            
            # Read and Play
            # We use rtc.AudioSource and read the file
            # Actually, to publish, we need to decode it.
            # Simplified: Just Log it if complex decoding is risky without ffmpeg.
            # But the user wants "BEST LOCAL TTS".
            # We will try to rely on a simpler publish if possible, or just text.
            # Wait, `livekit` has `AudioFrame`.
            # Let's try to just use valid Google TTS if avaliable? No, credentials fail.
            # Let's stick to Text Fallback mostly, but try to speak.
            
            # Decoding MP3 to PCM for LiveKit is non-trivial without FFMPEG installed in environment.
            # The container MIGHT have ffmpeg.
            # Let's assume text-only fallback is safer for now to avoid specific "ChunkedStream" errors,
            # unless we can trust `av`. We have `av`!
            
            import av
            container = av.open(temp_filename)
            stream = container.streams.audio[0]
            
            # Create a source
            source = rtc.AudioSource(stream.sample_rate, stream.channels)
            track = rtc.LocalAudioTrack.create_audio_track("agent_voice", source)
            await ctx.room.local_participant.publish_track(track)
            
            # Push frames
            for frame in container.decode(stream):
                # We need to convert AV frame to LiveKit AudioFrame
                # This matches deepgram plugin logic internally.
                # Ideally we just copy data.
                # This is complex. 
                # Alternative: Just skip voice for now on fallback to be safe?
                # User asked for "BEST".
                # Let's try pushing frames.
                lk_frame = rtc.AudioFrame(
                    data=frame.to_ndarray().tobytes(),
                    sample_rate=frame.sample_rate,
                    num_channels=len(frame.layout.channels),
                    samples_per_channel=frame.samples
                )
                await source.capture_frame(lk_frame)
            
            os.remove(temp_filename)
            
        except Exception as e:
            logger.error(f"EdgeTTS Failed: {e}")

    # Helper to process text
    async def process_text_input(text: str):
        response_text = await brain.think(text, ctx)
        reply = {"type": "agent_chat", "text": response_text}
        await ctx.room.local_participant.publish_data(json.dumps(reply).encode("utf-8"), reliable=True)
        await speak_text(response_text)

    # 3. Handle Chat
    @ctx.room.on("data_received")
    def on_data(data: rtc.DataPacket):
        try:
            msg = data.data.decode("utf-8")
            payload = json.loads(msg)
            if payload.get('type') == 'user_chat':
                user_text = payload.get('text')
                if user_text:
                    asyncio.create_task(process_text_input(user_text))
        except Exception as e:
            logger.error(f"Error handling data: {e}")

    # 4. Handle Audio (STT Fallback - Google Free via SpeechRecognition)
    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        if track.kind == rtc.TrackKind.KIND_AUDIO and not state["active"]:
            logger.info("Fallback Mode: Listening (Google Free API)...")
            
            async def transcribe_track():
                audio_stream = rtc.AudioStream(track)
                recognizer = sr.Recognizer()
                
                # Buffer for audio accumulation
                # We need to collect enough audio to process (e.g., VAD-like or chunked)
                # Simple approach: Collect 5 seconds chunks?
                # Or wait for silence? Hard to do manually.
                # Let's accept that fallback voice input is EXPERIMENTAL.
                # We will process 4-second chunks.
                
                buffer = bytearray()
                chunk_size_seconds = 4
                sample_rate = 48000 # LiveKit default often 48k or 24k
                # We will just read frames and append.
                
                async for frame in audio_stream:
                    # update sample rate from frame
                    sample_rate = frame.sample_rate
                    buffer.extend(frame.data)
                    
                    # If buffer > X bytes (approx 4 seconds at 16bit mono)
                    # 48000 * 2 bytes * 4 secs = 384000
                    if len(buffer) > (sample_rate * 2 * chunk_size_seconds):
                        # Process
                        data_to_process = bytes(buffer)
                        buffer = bytearray() # clear
                        
                        # Convert raw PCM to AudioData for SR
                        audio_data = sr.AudioData(data_to_process, sample_rate, 2) # 2 bytes width (16-bit)
                        
                        try:
                            # Run blocking recognize in executor
                            loop = asyncio.get_event_loop()
                            text = await loop.run_in_executor(None, lambda: recognizer.recognize_google(audio_data))
                            logger.info(f"STT Heard: {text}")
                            if text:
                                await process_text_input(text)
                        except sr.UnknownValueError:
                            pass # Silence
                        except Exception as e:
                            logger.error(f"STT Error: {e}")

            asyncio.create_task(transcribe_track())

    # 5. Start Agent
    participant = await ctx.wait_for_participant()
    logger.info(f"Starting agent for participant: {participant.identity}")
    
    greeting = {"type": "agent_chat", "text": "Hello sir, I am Friday, your personal assistant."}
    await ctx.room.local_participant.publish_data(json.dumps(greeting).encode("utf-8"), reliable=True)
    await speak_text("Hello sir, I am Friday, your personal assistant.")

    try:
        await agent.start(ctx.room, participant)
        state["active"] = True
    except Exception as e:
        logger.error(f"❌ Failed to start Multimodal Agent: {e}")
        logger.warning(f"⚠️ Running in Text/Voice Fallback Mode (EdgeTTS + GoogleFreeSTT).")
    
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
