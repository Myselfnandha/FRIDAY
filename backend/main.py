import logging
import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.websocket import websocket_handler
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="F.R.I.D.A.Y. Backend",
    description="Open-source AI voice assistant backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket_handler(websocket)


@app.get("/")
async def root():
    return {
        "name": "F.R.I.D.A.Y.",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "websocket": "/ws",
            "chat": "/api/chat",
            "search": "/api/search",
            "vision": "/api/vision",
            "tts": "/api/tts",
            "voices": "/api/voices",
            "health": "/api/health",
        },
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
