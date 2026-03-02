import logging
import json
import base64
from fastapi import WebSocket, WebSocketDisconnect
from agent.core import AgentCore
from services.stt import stt_service
from services.tts import tts_service

logger = logging.getLogger(__name__)

agents: dict[str, AgentCore] = {}


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

                full_response = ""
                async for chunk in agent.process_text_stream(content):
                    full_response += chunk
                    await websocket.send_json({"type": "response_chunk", "content": chunk})

                await websocket.send_json({"type": "response_text", "content": full_response, "role": "assistant"})
                await _send_tts(websocket, full_response)

            elif msg_type == "audio_chunk":
                audio_b64 = data.get("data", "")
                if not audio_b64:
                    continue
                audio_bytes = base64.b64decode(audio_b64)

                await websocket.send_json({"type": "status", "state": "transcribing"})
                transcript = await stt_service.transcribe(audio_bytes)

                if not transcript or transcript.lower().strip() in ["", "you", "thanks", "thank you"]:
                    await websocket.send_json({"type": "status", "state": "listening"})
                    continue

                await websocket.send_json({"type": "transcript", "content": transcript, "role": "user"})
                await websocket.send_json({"type": "status", "state": "thinking"})

                full_response = ""
                async for chunk in agent.process_text_stream(transcript):
                    full_response += chunk
                    await websocket.send_json({"type": "response_chunk", "content": chunk})

                await websocket.send_json({"type": "response_text", "content": full_response, "role": "assistant"})
                await _send_tts(websocket, full_response)

            elif msg_type == "vision_frame":
                image_b64 = data.get("data", "")
                prompt = data.get("prompt", "")
                if not image_b64:
                    continue
                image_bytes = base64.b64decode(image_b64)

                await websocket.send_json({"type": "status", "state": "analyzing"})
                description = await agent.process_vision(image_bytes, prompt)
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
        audio_bytes = await tts_service.synthesize(text)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        await websocket.send_json({"type": "audio_response", "data": audio_b64})
        await websocket.send_json({"type": "status", "state": "listening"})
    except Exception as e:
        logger.error(f"TTS send error: {e}")
        await websocket.send_json({"type": "status", "state": "listening"})
