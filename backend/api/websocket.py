import logging
import json
import base64
import time
from fastapi import WebSocket, WebSocketDisconnect
from agent.core import AgentCore
from services.stt import stt_service
from services.tts import tts_service

logger = logging.getLogger(__name__)

agents: dict[str, AgentCore] = {}


async def _send_status(websocket: WebSocket, service: str, state: str, message: str = ""):
    """Send system_status event for the status bar."""
    await websocket.send_json({
        "type": "system_status",
        "service": service,
        "state": state,
        "message": message,
        "ts": int(time.time() * 1000),
    })


async def websocket_handler(websocket: WebSocket):
    await websocket.accept()
    session_id = str(id(websocket))
    agent = AgentCore()
    agents[session_id] = agent
    logger.info(f"WebSocket connected: {session_id}")

    try:
        greeting = await agent.initialize()
        await _send_response(websocket, greeting)

        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type", "")

            if msg_type == "text_message":
                content = data.get("content", "").strip()
                if not content:
                    continue
                await websocket.send_json({"type": "transcript", "content": content, "role": "user"})
                await websocket.send_json({"type": "status", "state": "thinking"})
                await _send_status(websocket, "groq", "requesting", "Sending to Groq...")

                full_response = ""
                async for chunk in agent.process_text_stream(content):
                    full_response += chunk
                    await websocket.send_json({"type": "response_chunk", "content": chunk})

                await _send_status(websocket, "groq", "received", "Response received")
                await websocket.send_json({"type": "response_text", "content": full_response, "role": "assistant"})
                await _send_tts(websocket, full_response)

            elif msg_type == "audio_chunk":
                audio_b64 = data.get("data", "")
                if not audio_b64:
                    continue
                audio_bytes = base64.b64decode(audio_b64)

                await websocket.send_json({"type": "status", "state": "transcribing"})
                await _send_status(websocket, "stt", "requesting", "Transcribing audio...")
                transcript = await stt_service.transcribe(audio_bytes)
                await _send_status(websocket, "stt", "received", "Transcription done")

                if not transcript or transcript.lower().strip() in ["", "you", "thanks", "thank you"]:
                    await websocket.send_json({"type": "status", "state": "listening"})
                    continue

                await websocket.send_json({"type": "transcript", "content": transcript, "role": "user"})
                await websocket.send_json({"type": "status", "state": "thinking"})
                await _send_status(websocket, "groq", "requesting", "Sending to Groq...")

                full_response = ""
                async for chunk in agent.process_text_stream(transcript):
                    full_response += chunk
                    await websocket.send_json({"type": "response_chunk", "content": chunk})

                await _send_status(websocket, "groq", "received", "Response received")
                await websocket.send_json({"type": "response_text", "content": full_response, "role": "assistant"})
                await _send_tts(websocket, full_response)

            elif msg_type == "vision_frame":
                image_b64 = data.get("data", "")
                prompt = data.get("prompt", "")
                if not image_b64:
                    continue
                image_bytes = base64.b64decode(image_b64)

                await websocket.send_json({"type": "status", "state": "analyzing"})
                await _send_status(websocket, "google", "requesting", "Analyzing image...")
                description = await agent.process_vision(image_bytes, prompt)
                await _send_status(websocket, "google", "received", "Analysis complete")
                await websocket.send_json({"type": "response_text", "content": description, "role": "assistant"})
                await _send_tts(websocket, description)

            elif msg_type == "end_session":
                logger.info(f"Session ended by user: {session_id}")
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await _send_status(websocket, "system", "error", str(e))
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        agents.pop(session_id, None)


async def _send_response(websocket: WebSocket, text: str):
    await websocket.send_json({"type": "response_text", "content": text, "role": "assistant"})
    await _send_tts(websocket, text)


async def _send_tts(websocket: WebSocket, text: str):
    try:
        await websocket.send_json({"type": "status", "state": "speaking"})
        await _send_status(websocket, "tts", "streaming", "Generating speech...")
        audio_bytes = await tts_service.synthesize(text)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        await websocket.send_json({"type": "audio_response", "data": audio_b64})
        await _send_status(websocket, "tts", "received", "Speech ready")
        await websocket.send_json({"type": "status", "state": "listening"})
    except Exception as e:
        logger.error(f"TTS send error: {e}")
        await _send_status(websocket, "tts", "error", f"TTS error: {e}")
        await websocket.send_json({"type": "status", "state": "listening"})
