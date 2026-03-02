# F.R.I.D.A.Y. — Open Source AI Voice Assistant

> Personal AI voice assistant inspired by the Marvel universe. Built with 100% free/open-source technologies.

## Features

- **Real-time Voice** — Speak naturally, hear F.R.I.D.A.Y. respond with neural voice
- **Text Chat** — Type messages with streaming responses
- **Camera Vision** — Show F.R.I.D.A.Y. what you see, get instant analysis
- **Screen Share** — Share your screen for context-aware help
- **Persistent Memory** — Remembers past conversations (self-hosted, private)
- **Web Search** — Current information via DuckDuckGo

## Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| LLM | Groq (Llama 3.3 70B) | Free |
| Speech-to-Text | Groq Whisper Large v3 | Free |
| Text-to-Speech | Edge TTS | Free, no API key |
| Vision | Google Gemini 2.0 Flash | Free |
| Memory | Mem0 (self-hosted) + Qdrant | Free |
| Embeddings | HuggingFace sentence-transformers | Free |
| Backend | FastAPI + WebSocket | Open source |
| Frontend | Vite + React | Open source |

**Only 2 API keys needed:**
1. `GROQ_API_KEY` — [groq.com](https://console.groq.com)
2. `GOOGLE_API_KEY` — [aistudio.google.com](https://aistudio.google.com)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Groq API key (free)
- Google API key (free)

### 1. Configure

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### 2. Run with Docker

```bash
docker-compose up -d
```

### 3. Open

Visit [http://localhost:3000](http://localhost:3000)

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start Qdrant (needs Docker)
docker run -d -p 6333:6333 -v $(pwd)/../data/qdrant:/qdrant/storage qdrant/qdrant

# Start backend
python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
Clawbot/
├── backend/          # FastAPI + WebSocket server
│   ├── agent/        # Core agent, memory, prompts
│   ├── services/     # LLM, STT, TTS, Vision, Search
│   └── api/          # WebSocket + REST routes
├── frontend/         # Vite + React (Iron Man HUD UI)
│   └── src/
│       ├── components/   # ArcReactor, ChatPanel, ControlBar, etc.
│       ├── hooks/        # useWebSocket, useVoice, useCamera
│       └── pages/        # IntroScreen, AssistantScreen
├── data/qdrant/      # Persistent memory storage
└── docker-compose.yml
```

## License

MIT
