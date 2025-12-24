import logging
import os
import json
from dotenv import load_dotenv

from livekit.agents import JobContext, WorkerOptions, cli, tts, stt, llm, vad
from livekit import agents, rtc
from livekit.plugins import google

# Import Brain
    # State tracking via dictionary to support closure modification
    state = {"active": False}

    # TTS Instance (Edge TTS - Free & No Credentials)
    # google.TTS fails without ADC, so we use a simple fallback or mock.
    # Actually, generating audio tracks via edge_tts in real-time requires a wrapper.
    # For now, to solve the immediate crash, we will just LOG the text if google_tts isn't available,
    # OR we use the default system TTS if available.
    # But wait, edge-tts is installed! 
    # Let's import it safely.
    
    try:
        from edge_tts import Communicate
        async def generate_edge_audio(text: str) -> str:
            # Generate file or stream? Realtime streaming to rtc track is complex.
            # Simplified: Use Google TTS API if it worked, but it doesn't.
            # Since the user wants a working fallback, we will just simulate it for now 
            # or try to use OpenAI TTS (if key available) or just skip voice in fallback.
            # Given the constraints, I'll stick to a robust "Voice Output Failed" log 
            # unless OpenRouter key supports it? No.
            # I will restore the Google TTS check but won't crash.
            pass
    except ImportError:
        pass

    async def speak_text(text: str):
        """Helper to speak text via Google TTS (if available)"""
        # We try to re-init if needed or just skip
        if google_tts:
            logger.info(f"Speaking: {text}")
            try:
                audio_stream = google_tts.synthesize(text)
                await ctx.room.local_participant.publish_track(
                    destination=rtc.TrackSource.SOURCE_MICROPHONE,
                    track=rtc.LocalAudioTrack.create_audio_track("agent_voice", audio_stream)
                )
            except Exception as e:
                logger.error(f"TTS Failed: {e}")
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
        # Fix: Check state['active'] instead of local variable agent_active
        if track.kind == rtc.TrackKind.KIND_AUDIO and not state["active"] and google_stt:
            logger.info("Fallback Mode: Subscribing to User Audio for STT")
            
            async def transcribe_track():
                try:
                    audio_stream = rtc.AudioStream(track)
                    stt_stream = google_stt.stream()
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
        if not google_stt:
             logger.warning("⚠️ Google Cloud Credentials missing -> Fallback Voice Input DISABLED. Use Text Chat.")
    
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
