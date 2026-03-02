import base64
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from agent.core import AgentCore
from services.search import search_service
from services.tts import tts_service

router = APIRouter(prefix="/api")

_rest_agent = AgentCore()


class ChatRequest(BaseModel):
    message: str


class SearchRequest(BaseModel):
    query: str
    max_results: int = 5


@router.post("/chat")
async def chat(req: ChatRequest):
    if not _rest_agent._initialized:
        await _rest_agent.initialize()
    response = await _rest_agent.process_text(req.message)
    return {"response": response}


@router.post("/search")
async def search(req: SearchRequest):
    results = await search_service.search(req.query, req.max_results)
    return {"results": results}


@router.post("/vision")
async def vision(
    image: UploadFile = File(...),
    prompt: str = Form("What do you see in this image?"),
):
    if not _rest_agent._initialized:
        await _rest_agent.initialize()
    image_bytes = await image.read()
    description = await _rest_agent.process_vision(image_bytes, prompt)
    return {"description": description}


@router.post("/tts")
async def text_to_speech(req: ChatRequest):
    audio_bytes = await tts_service.synthesize(req.message)
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    return {"audio": audio_b64, "format": "mp3"}


@router.get("/voices")
async def list_voices():
    voices = await tts_service.get_voices()
    return {"voices": voices}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "friday-backend"}
