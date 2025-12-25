import logging
import os
import json
from dotenv import load_dotenv

from livekit.agents import JobContext, WorkerOptions, cli, tts, stt, llm, vad
from livekit import agents, rtc
from livekit.plugins import google

# Import Brain and Input Processor
from brain import AlanBrain
from input_processor import input_processor, InputSource

# ... (rest of imports)

# ...


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
            communicate = edge_tts.Communicate(text, "en-US-ChristopherNeural")
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as fp:
                temp_filename = fp.name
            await communicate.save(temp_filename)
            
            # LiveKit AudioSource expects consistent input. 
            target_sample_rate = 24000
            target_channels = 1
            source = rtc.AudioSource(target_sample_rate, target_channels)
            track = rtc.LocalAudioTrack.create_audio_track("agent_voice", source)
            await ctx.room.local_participant.publish_track(track)

            # Offload heavy AV processing to a thread to avoid blocking asyncio loop
            def process_audio_file():
                import av
                frames_data = [] # List of (data, sample_rate, channels, samples)
                container = av.open(temp_filename)
                stream = container.streams.audio[0]
                
                resampler = av.AudioResampler(
                    format='s16',
                    layout='mono',
                    rate=target_sample_rate
                )

                for frame in container.decode(stream):
                    # Resample frame
                    resampled_frames = resampler.resample(frame)
                    for rf in resampled_frames:
                        frames_data.append((
                            rf.to_ndarray().tobytes(),
                            target_sample_rate,
                            target_channels,
                            rf.samples
                        ))
                return frames_data

            loop = asyncio.get_event_loop()
            frames = await loop.run_in_executor(None, process_audio_file)
            
            for (data, rate, channels, samples) in frames:
                lk_frame = rtc.AudioFrame(
                    data=data,
                    sample_rate=rate,
                    num_channels=channels,
                    samples_per_channel=samples
                )
                await source.capture_frame(lk_frame)
            
            os.remove(temp_filename)
        except Exception as e:
            logger.error(f"EdgeTTS Failed: {e}")

    # Helper to process text
    async def process_text_input(text: str, source: str = "text"):
        # Create Unified Event
        input_type = InputSource.TEXT if source == "text" else InputSource.VOICE
        event = input_processor.process(input_type, text)
        
        # Brain thinks about the event
        response_text = await brain.think(event, ctx)
        
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
                    asyncio.create_task(process_text_input(user_text, source="text"))
        except Exception as e:
            logger.error(f"Error handling data: {e}")

    # 4. Handle Audio (STT Fallback - Google Free via SpeechRecognition)
    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        if track.kind == rtc.TrackKind.KIND_VIDEO:
            logger.info(f"Visual Input Detected: {track.name} ({track.source})")
            return

        if track.kind == rtc.TrackKind.KIND_AUDIO and not state["active"]:
            logger.info("Fallback Mode: Listening (Google Free API)...")
            
            async def transcribe_track():
                audio_stream = rtc.AudioStream(track)
                recognizer = sr.Recognizer()
                
                # STT requires 16000Hz Mono S16 usually for best results
                target_rate = 16000
                import av
                resampler = av.AudioResampler(format='s16', layout='mono', rate=target_rate)
                
                buffer = bytearray()
                chunk_seconds = 3 # Smaller chunks for responsiveness
                bytes_per_sec = target_rate * 2 # 16bit = 2 bytes
                chunk_size = bytes_per_sec * chunk_seconds
                
                async for event in audio_stream:
                    frame = event.frame
                    
                    # Convert LiveKit AudioFrame to AV Frame for resampling
                    # We need to construct an AV frame from raw bytes. 
                    # This is tricky. PyAV expects distinct planes. 
                    # Easier: Simply trust LiveKit's frame has data and assume we need to process it.
                    # Wait, accessing raw bytes and feeding SR is cleaner if we just assume 
                    # the input IS PCM. LiveKit WebRTC is usually 48kHz.
                    # SW-Resampling locally with `audioop` (standard lib) is safer than wrapping PyAV frames manually.
                    
                    import audioop
                    # Resample from frame.sample_rate to 16000
                    data = frame.data
                    if frame.sample_rate != target_rate:
                        data, _ = audioop.ratecv(data, 2, 1, frame.sample_rate, target_rate, None)
                        # data, width, channels, in_rate, out_rate, state
                        # Assuming mono input from mic. If stereo, mixed? LiveKit mic is usually mono/stereo.
                        # Let's force mono if needed? audioop.tomono
                        if frame.num_channels == 2:
                            data = audioop.tomono(data, 2, 0.5, 0.5)

                    buffer.extend(data)
                    
                    if len(buffer) >= chunk_size:
                        # Process
                        audio_data = sr.AudioData(bytes(buffer), target_rate, 2)
                        buffer = bytearray() # Reset
                        
                        try:
                            # Run blocking recognize
                            loop = asyncio.get_event_loop()
                            # recognize_google is blocking.
                            text = await loop.run_in_executor(None, lambda: recognizer.recognize_google(audio_data))
                            logger.info(f"STT Heard: {text}")
                            if text:
                                await process_text_input(text, source="voice")
                        except sr.UnknownValueError:
                            pass
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
