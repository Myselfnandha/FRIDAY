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
try:
    import torch
except ImportError:
    torch = None
    logger.warning("Torch not found. VAD fallback capabilities will be limited.")

import numpy as np
from PIL import Image

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
    from livekit.plugins import silero
    
    # State for interruption
    state["speech_id"] = 0

    # TTS Helper (EdgeTTS)
    async def speak_text(text: str):
        """Generates audio using EdgeTTS and plays it via LiveKit."""
        # Interrupt previous
        state["speech_id"] += 1
        current_id = state["speech_id"]
        
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

            # Offload heavy AV processing to a thread
            def process_audio_file():
                import av
                frames_data = [] 
                container = av.open(temp_filename)
                stream = container.streams.audio[0]
                
                resampler = av.AudioResampler(
                    format='s16',
                    layout='mono',
                    rate=target_sample_rate
                )

                for frame in container.decode(stream):
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
                # CHECK INTERRUPTION
                if state["speech_id"] != current_id:
                    logger.info("TTS Interrupted.")
                    break
                    
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

    def convert_frame_to_image(frame) -> Image.Image:
        """Converts a LiveKit VideoFrame to a PIL Image."""
        try:
            # Convert to RGBA
            # Note: The availability of 'convert' depends on the LiveKit SDK version.
            # Assuming recent SDK where convert returns a new buffer/frame with specific format.
            argb_frame = frame.convert(rtc.VideoBufferType.RGBA)
            
            # Create PIL Image
            img = Image.frombytes("RGBA", (argb_frame.width, argb_frame.height), argb_frame.data)
            return img.convert("RGB")
        except Exception as e:
            logger.error(f"Frame conversion failed: {e}")
            return None

    # Helper to process text
    async def process_text_input(text: str, source: str = "text"):
        # Stop any current speech immediately when thinking starts
        state["speech_id"] += 1 
        
        # VISION CHECK
        images_to_send = []
        # If user implies seeing something, and we have a frame
        if "see" in text.lower() or "look" in text.lower() or "screen" in text.lower():
            if state.get("latest_frame"):
                logger.info("Processing visual context for Brain...")
                pil_img = convert_frame_to_image(state["latest_frame"])
                if pil_img:
                    images_to_send = [pil_img]
        
        # Create Unified Event
        input_type = InputSource.TEXT if source == "text" else InputSource.VOICE
        event = input_processor.process(input_type, text)
        
        # Brain thinks about the event
        response_text = await brain.think(event, ctx, images=images_to_send)
        
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

    # 4. Handle Audio & Video
    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        # --- VIDEO / SCREEN SHARING ---
        if track.kind == rtc.TrackKind.KIND_VIDEO:
            logger.info(f"Visual Input Detected: {track.name} ({publication.source})")
            
            async def process_video_track():
                video_stream = rtc.VideoStream(track)
                last_process_time = 0
                process_interval = 2.0 # Analyze every 2 seconds
                
                async for event in video_stream:
                    import time
                    now = time.time()
                    if now - last_process_time > process_interval:
                        last_process_time = now
                        
                        # Convert Frame to JPEG Bytes
                        frame = event.frame
                        # LiveKit VideoFrame -> RGB -> JPEG
                        # This requires converting the YUV frame to RGB
                        # For simplicity in this fallback, we might skip complex conversion 
                        # OR use a library if available. 
                        # Ideally, we send the intent "I see <description>" to the brain.
                        
                        # Saving frame for potential "Look at this" queries
                        state["latest_frame"] = frame
                        
                        # If user ASKED to look, we can process immediately. 
                        # Otherwise, we just cache it.
                        
            asyncio.create_task(process_video_track())
            return

        # --- AUDIO (Fallback) ---
        if track.kind == rtc.TrackKind.KIND_AUDIO and not state["active"]:
            logger.info("Fallback Mode: Listening (Google Free API + Silero VAD)...")
            
            async def transcribe_track():
                # VAD Setup
                vad = silero.VAD.load()
                model = vad
                
                audio_stream = rtc.AudioStream(track)
                recognizer = sr.Recognizer()
                target_rate = 16000
                
                import av
                import audioop
                import numpy as np
                
                # Audio Accumulation
                speech_buffer = bytearray()
                
                # State
                speaking = False
                silence_frames = 0
                required_silence_frames = 10 # Optimized: ~0.3s silence

                async for event in audio_stream:
                    state["speech_id"] += 0 # Keep checking for interruption externally?
                    
                    frame = event.frame
                    
                    # Manual Resampling for STT & VAD (16kHz Mono)
                    data = frame.data
                    if frame.sample_rate != target_rate:
                        data, _ = audioop.ratecv(data, 2, 1, frame.sample_rate, target_rate, None)
                        if frame.num_channels == 2:
                            data = audioop.tomono(data, 2, 0.5, 0.5)

                    # 1. Run VAD
                    # Silero expects float32 array
                    audio_int16 = np.frombuffer(data, dtype=np.int16)
                    audio_float32 = audio_int16.astype(np.float32) / 32768.0
                    
                    speech_prob = 0
                    try:
                        if torch:
                            speech_prob = model(torch.from_numpy(audio_float32), target_rate).item()
                        else:
                            raise ImportError("Torch not available")
                    except:
                        # Fallback to RMS
                        if audioop.rms(data, 2) > 500:
                            speech_prob = 0.8
                    
                    is_speech = speech_prob > 0.5

                    # 2. Logic
                    if is_speech:
                        if not speaking:
                            logger.info("VAD: Speech Started")
                            # Interrupt Agent
                            state["speech_id"] += 1
                        speaking = True
                        silence_frames = 0
                        speech_buffer.extend(data)
                    else:
                        if speaking:
                            silence_frames += 1
                            speech_buffer.extend(data) # Capture trailing silence
                            
                            if silence_frames > required_silence_frames:
                                # END OF SPEECH DETECTED
                                logger.info("VAD: End of Speech")
                                speaking = False
                                silence_frames = 0
                                
                                # Process Buffer
                                if len(speech_buffer) > 4000: # Min duration ~0.1s
                                    audio_data = sr.AudioData(bytes(speech_buffer), target_rate, 2)
                                    speech_buffer = bytearray()
                                    
                                    try:
                                        loop = asyncio.get_event_loop()
                                        text = await loop.run_in_executor(None, lambda: recognizer.recognize_google(audio_data))
                                        
                                        # Publish Live Caption
                                        caption_msg = {"type": "transcription", "text": text, "is_final": True, "participant": "user"}
                                        await ctx.room.local_participant.publish_data(json.dumps(caption_msg).encode("utf-8"), reliable=True)

                                        if text:
                                            logger.info(f"STT Heard: {text}")
                                            await process_text_input(text, source="voice")
                                    except:
                                        pass
                                else:
                                    # Too short, discard
                                    speech_buffer = bytearray()
                        else:
                            # Just noise/silence
                            pass

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
