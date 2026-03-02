# 🧠 PLAN: Friday AI Assistant — Open Source Rebuild

> **Plan ID:** `PLAN-friday-opensource`
> **Created:** 2026-03-01
> **Status:** 🟡 Awaiting Approval
> **User:** Alan (single user, personal assistant)

---

## 📋 Executive Summary

Rebuild the Friday AI voice assistant from scratch, replacing all proprietary dependencies (LiveKit, OpenAI) with a 100% free/open-source stack. The new system will support **real-time voice**, **text chat**, **camera vision**, and **web search** with persistent memory — all running on a 4GB RAM Linux machine and deployable to free cloud platforms.

---

## 🎯 Requirements Matrix

| Feature | Current (LiveKit + OpenAI) | New (Open Source) | Status |
|---------|---------------------------|-------------------|--------|
| **LLM Chat** | OpenAI Realtime API | Groq (Llama 3.3 70B) | 🔄 Replace |
| **Voice STT** | LiveKit + OpenAI | Groq Whisper Large v3 | 🔄 Replace |
| **Voice TTS** | OpenAI Realtime voice | Edge TTS (Microsoft) | 🔄 Replace |
| **Camera Vision** | LiveKit video | Gemini 2.0 Flash | 🔄 Replace |
| **Memory** | Mem0 (cloud) | Mem0 self-hosted (Qdrant + HuggingFace embeddings) | 🔄 Replace |
| **Web Search** | DuckDuckGo | DuckDuckGo — keep | ✅ Keep |
| **Real-time Transport** | LiveKit WebRTC | WebSocket + Web APIs | 🔄 Replace |
| **Weather** | wttr.in | — | ❌ Drop |
| **Email** | Gmail SMTP | — | ❌ Drop |
| **Spotify** | n8n MCP | — | ❌ Drop |
| **User ID** | Hardcoded "David" | Dynamic (config-based) | 🔄 Fix |

---

## 🏗️ Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite + React)                   │
│                                                             │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │
│  │  Intro   │  │  Voice   │  │  Video   │  │   Chat     │   │
│  │  Screen  │  │  Mode    │  │  Mode    │  │   Mode     │   │
│  │ (HUD)    │  │ (Arc     │  │ (Camera  │  │ (Text      │   │
│  │          │  │ Reactor) │  │ + HUD)   │  │ Messages)  │   │
│  └─────────┘  └──────────┘  └──────────┘  └────────────┘   │
│                                                             │
│  Browser APIs: MediaRecorder, getUserMedia, Web Speech API  │
│  WebSocket Client ──────────────────────────────────────    │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket (ws://)
┌──────────────────────────▼──────────────────────────────────┐
│                   BACKEND (FastAPI)                          │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  WebSocket Hub   │  │  REST API        │                  │
│  │  - Voice stream  │  │  - /api/chat     │                  │
│  │  - Text messages │  │  - /api/vision   │                  │
│  │  - Events        │  │  - /api/search   │                  │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│  ┌────────▼────────────────────▼────────┐                   │
│  │         Agent Core                    │                   │
│  │  ┌──────────┐  ┌──────────┐          │                   │
│  │  │  Groq    │  │  Gemini  │          │                   │
│  │  │  Client  │  │  Client  │          │                   │
│  │  └──────────┘  └──────────┘          │                   │
│  │  ┌──────────┐  ┌──────────┐          │                   │
│  │  │  Edge    │  │  Mem0    │          │                   │
│  │  │  TTS     │  │ (local)  │          │                   │
│  │  └──────────┘  └────┬─────┘          │                   │
│  │  ┌──────────┐  ┌────▼─────┐          │                   │
│  │  │  DDG     │  │ Qdrant   │          │                   │
│  │  │  Search  │  │ (Vector  │          │                   │
│  │  └──────────┘  │  Store)  │          │                   │
│  │                └──────────┘          │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Vite + React | Latest | SPA with HUD UI |
| **Styling** | Vanilla CSS + CSS Animations | — | Iron Man HUD aesthetic |
| **Backend** | FastAPI | 0.115+ | API + WebSocket server |
| **LLM** | Groq SDK | Latest | Llama 3.3 70B chat |
| **STT** | Groq SDK | Latest | Whisper Large v3 |
| **TTS** | edge-tts (Python) | Latest | Neural voice synthesis |
| **Vision** | google-genai | Latest | Gemini 2.0 Flash |
| **Memory** | mem0ai (self-hosted) | Latest | Persistent memory (local Qdrant + HuggingFace embeddings) |
| **Vector Store** | Qdrant | Latest | Stores memory embeddings (Docker container) |
| **Embeddings** | HuggingFace (sentence-transformers) | Latest | `multi-qa-MiniLM-L6-cos-v1` — CPU-friendly, no API key |
| **Search** | duckduckgo-search | Latest | Web search |
| **Transport** | WebSocket (native) | — | Real-time bidirectional |

### Environment Variables (New)

```env
# LLM & STT
GROQ_API_KEY=               # Free: groq.com

# Vision
GOOGLE_API_KEY=             # Free: aistudio.google.com

# Memory — NO API KEY NEEDED (self-hosted)
# Mem0 uses local Qdrant + HuggingFace embeddings
QDRANT_HOST=localhost       # Docker: qdrant
QDRANT_PORT=6333

# User Config
FRIDAY_USER_NAME=Alan       # Dynamic, not hardcoded
FRIDAY_USER_ID=alan         # For Mem0 user_id

# Server
HOST=0.0.0.0
PORT=8000
```

### Self-Hosted Mem0 Configuration

```python
# backend/agent/memory.py — Mem0 config (NO cloud API key needed)
from mem0 import Memory

config = {
    "llm": {
        "provider": "groq",
        "config": {
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.1,
        }
    },
    "embedder": {
        "provider": "huggingface",
        "config": {
            "model": "multi-qa-MiniLM-L6-cos-v1",  # ~80MB, CPU-friendly
            "embedding_dims": 384,
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "collection_name": "friday_memories",
            "host": "localhost",  # Docker: "qdrant"
            "port": 6333,
            "embedding_model_dims": 384,
        }
    },
    "version": "v1.1"
}

memory = Memory.from_config(config)
```

> **Key advantage:** Zero API keys for memory. Qdrant runs as a lightweight Docker container (~100MB RAM). HuggingFace `sentence-transformers` model downloads once (~80MB) and runs on CPU. Groq is reused as the LLM for Mem0's memory extraction (same free API key as chat).

---

## 📁 Project Structure

```
Clawbot/
├── backend/
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Environment config
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── core.py             # Agent orchestrator
│   │   ├── prompts.py          # System prompts (updated)
│   │   └── memory.py           # Mem0 integration
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm.py              # Groq LLM service
│   │   ├── stt.py              # Groq Whisper STT
│   │   ├── tts.py              # Edge TTS service
│   │   ├── vision.py           # Gemini vision service
│   │   └── search.py           # DuckDuckGo search
│   ├── api/
│   │   ├── __init__.py
│   │   ├── websocket.py        # WebSocket handlers
│   │   └── routes.py           # REST endpoints
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── public/
│   │   └── assets/             # Sound effects, etc.
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css           # Design system
│   │   ├── pages/
│   │   │   ├── IntroScreen.jsx     # Arc reactor intro
│   │   │   └── AssistantScreen.jsx # Main chat/voice view
│   │   ├── components/
│   │   │   ├── ArcReactor.jsx      # Animated reactor component
│   │   │   ├── HudBackground.jsx   # Particle/line effects
│   │   │   ├── ChatPanel.jsx       # Text message list
│   │   │   ├── VoiceVisualizer.jsx # Audio waveform bars
│   │   │   ├── VideoFeed.jsx       # Camera preview
│   │   │   ├── ControlBar.jsx      # Mic, camera, screen, chat buttons
│   │   │   ├── MessageInput.jsx    # Text input + send
│   │   │   └── TranscriptOverlay.jsx # Live transcription
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js     # WS connection manager
│   │   │   ├── useVoice.js         # Mic recording + STT
│   │   │   ├── useCamera.js        # Camera capture
│   │   │   └── useAudioPlayer.js   # TTS playback queue
│   │   └── utils/
│   │       ├── audioUtils.js       # Audio processing
│   │       └── constants.js        # Config values
│   └── Dockerfile
│
├── data/
│   └── qdrant/                 # Qdrant persistent storage (auto-created)
├── docker-compose.yml          # Full stack orchestration (backend + frontend + qdrant)
├── docs/
│   └── PLAN-friday-opensource.md  # This file
├── .env                        # Root env (shared)
└── README.md
```

---

## 🔧 Implementation Phases

### Phase 1: Backend Foundation 🏗️
**Agent:** `backend-specialist`
**Estimated Effort:** Day 1-2

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | Create FastAPI project with config | `main.py`, `config.py` |
| 1.2 | Implement Groq LLM service | `services/llm.py` |
| 1.3 | Implement Groq Whisper STT service | `services/stt.py` |
| 1.4 | Implement Edge TTS service | `services/tts.py` |
| 1.5 | Implement Gemini Vision service | `services/vision.py` |
| 1.6 | Implement DuckDuckGo search service | `services/search.py` |
| 1.7 | Implement self-hosted Mem0 (Qdrant + HuggingFace embeddings + Groq LLM) | `agent/memory.py` |
| 1.8 | Create Agent Core (orchestrates all services) | `agent/core.py` |
| 1.9 | Update prompts (remove "David", fix typos) | `agent/prompts.py` |
| 1.10 | WebSocket handler for voice/text streaming | `api/websocket.py` |
| 1.11 | REST endpoints for chat, vision, search | `api/routes.py` |
| 1.12 | Requirements & Dockerfile | `requirements.txt`, `Dockerfile` |

**Dependencies:** None (first phase)

**Verification:**
- [ ] `pytest` — Unit tests for each service
- [ ] WebSocket echo test
- [ ] Groq API connectivity test
- [ ] Edge TTS audio generation test

---

### Phase 2: Frontend — Iron Man HUD UI 🎨
**Agent:** `frontend-specialist`
**Estimated Effort:** Day 2-4

| Task | Description | Files |
|------|-------------|-------|
| 2.1 | Vite + React project setup | `vite.config.js`, `package.json` |
| 2.2 | Design system (CSS variables, animations) | `index.css` |
| 2.3 | HUD Background (particles, scan lines, glow) | `HudBackground.jsx` |
| 2.4 | Arc Reactor component (CSS-only animated) | `ArcReactor.jsx` |
| 2.5 | Intro Screen ("Talk to F.R.I.D.A.Y") | `IntroScreen.jsx` |
| 2.6 | Control Bar (mic, camera, screen, chat toggles) | `ControlBar.jsx` |
| 2.7 | Voice Visualizer (audio waveform bars) | `VoiceVisualizer.jsx` |
| 2.8 | Chat Panel (message list, user/assistant) | `ChatPanel.jsx` |
| 2.9 | Video Feed (camera preview PiP) | `VideoFeed.jsx` |
| 2.10 | Message Input + Send button | `MessageInput.jsx` |
| 2.11 | Transcript Overlay (live speech text) | `TranscriptOverlay.jsx` |
| 2.12 | WebSocket hook (connection, reconnect) | `useWebSocket.js` |
| 2.13 | Voice hook (MediaRecorder → WS → TTS playback) | `useVoice.js` |
| 2.14 | Camera hook (getUserMedia → capture frame) | `useCamera.js` |
| 2.15 | Audio Player hook (TTS queue playback) | `useAudioPlayer.js` |
| 2.16 | Main App routing (Intro → Assistant) | `App.jsx` |

**Dependencies:** Phase 1 (backend WebSocket endpoint must exist)

**UI Reference (from user's images):**

| Screen | Key Elements |
|--------|-------------|
| **Intro** | Dark bg, cyan arc reactor (centered), "Chat live with F.R.I.D.A.Y" text, "TALK TO F.R.I.D.A.Y" button, floating particles |
| **Home/Voice** | Arc reactor (larger, background), audio waveform bars (top), status text ("FRIDAY is listening"), text input bar (bottom), control buttons (mic, camera, screen share, chat), "END CALL" button |
| **Chat+Video** | Left side: scrolling chat transcript, top-right: camera feed PiP, center: arc reactor (dimmed), bottom: text input + controls |

**Design Tokens:**
- **Primary:** `#00E5FF` (cyan/teal, arc reactor glow)
- **Background:** `#0A0E17` (deep dark navy)
- **Surface:** `rgba(0, 229, 255, 0.05)` (glass panels)
- **Text Primary:** `#E0E0E0` (light gray)
- **Text Muted:** `rgba(255, 255, 255, 0.5)`
- **Accent Danger:** `#FF3D3D` (end call, error)
- **Font:** `'Orbitron'` (headings), `'Inter'` (body text)

---

### Phase 3: Voice Pipeline Integration 🎤
**Agent:** `backend-specialist` + `frontend-specialist`
**Estimated Effort:** Day 3-4

| Task | Description |
|------|-------------|
| 3.1 | Browser → MediaRecorder (WebM/Opus chunks) → WebSocket → Backend |
| 3.2 | Backend receives audio chunks → Groq Whisper STT → text |
| 3.3 | Text → Agent Core (Groq LLM) → response text |
| 3.4 | Response text → Edge TTS → audio bytes → WebSocket → Browser |
| 3.5 | Browser plays audio via AudioContext/HTMLAudioElement |
| 3.6 | Implement Voice Activity Detection (VAD) in browser (simple energy threshold) |
| 3.7 | Implement streaming text display (show words as they come) |

**Protocol (WebSocket Messages):**

```json
// Client → Server
{ "type": "audio_chunk", "data": "<base64 webm audio>" }
{ "type": "text_message", "content": "Hello Friday" }
{ "type": "vision_frame", "data": "<base64 jpeg>" }
{ "type": "end_session" }

// Server → Client
{ "type": "transcript", "content": "Hello Friday", "role": "user" }
{ "type": "response_text", "content": "Good evening, Boss.", "role": "assistant" }
{ "type": "audio_response", "data": "<base64 mp3 audio>" }
{ "type": "status", "state": "listening|thinking|speaking" }
{ "type": "error", "message": "..." }
```

---

### Phase 4: Vision & Screen Integration 📷
**Agent:** `backend-specialist`
**Estimated Effort:** Day 4-5

| Task | Description |
|------|-------------|
| 4.1 | Camera capture → send frame via WebSocket |
| 4.2 | Backend receives frame → Gemini 2.0 Flash analysis |
| 4.3 | Screen share via `getDisplayMedia()` → capture frames |
| 4.4 | Vision-augmented chat (user can say "what do you see?") |

---

### Phase 5: Docker + Deployment 🚀
**Agent:** `devops-engineer`
**Estimated Effort:** Day 5

| Task | Description |
|------|-------------|
| 5.1 | Backend Dockerfile (Python 3.12 slim) |
| 5.2 | Frontend Dockerfile (nginx for static files) |
| 5.3 | docker-compose.yml (backend + frontend + **Qdrant**) |
| 5.4 | Qdrant persistent volume for memory storage |
| 5.5 | Deploy backend to Koyeb/Render (free tier) |
| 5.6 | Deploy frontend to Vercel/Netlify (free tier) |
| 5.7 | Deploy Qdrant to free cloud (Qdrant Cloud free 1GB or self-host) |
| 5.8 | Environment variable configuration for cloud |
| 5.9 | README with setup instructions |

**Free Hosting Plan:**

| Component | Platform | Free Tier |
|-----------|----------|-----------|
| Backend (FastAPI) | **Koyeb** or **Render** | 1 service, 512MB RAM |
| Frontend (React) | **Vercel** | Unlimited static hosting |
| Qdrant (Vector DB) | **Qdrant Cloud** or Docker sidecar | Free 1GB cluster or co-hosted |
| Alternative: All-in-one | **Hugging Face Spaces** | Free Docker deployment |

---

### Phase 6: Polish & Optimization ✨
**Agent:** `performance-optimizer` + `security-auditor`
**Estimated Effort:** Day 5-6

| Task | Description |
|------|-------------|
| 6.1 | Audio compression (downsample to 16kHz mono for STT) |
| 6.2 | Memory optimizations (4GB RAM target) |
| 6.3 | Reconnection logic (WebSocket auto-reconnect) |
| 6.4 | Error handling (API failures, rate limits) |
| 6.5 | Security audit (.env protection, CORS config) |
| 6.6 | Loading states, error states in UI |
| 6.7 | Keyboard shortcuts (Space to talk, Escape to end) |

---

## 👥 Agent Assignments

| Agent | Phases | Responsibilities |
|-------|--------|-----------------|
| `project-planner` | Phase 0 | This plan + architecture |
| `backend-specialist` | Phase 1, 3, 4 | FastAPI, services, WebSocket, agent core |
| `frontend-specialist` | Phase 2, 3 | React UI, HUD design, browser APIs |
| `devops-engineer` | Phase 5 | Docker, deployment, CI |
| `security-auditor` | Phase 6 | Security review, secrets management |
| `performance-optimizer` | Phase 6 | Memory optimization, audio pipeline |

---

## ✅ Verification Checklist

### Functional
- [ ] Text chat works (type → get response)
- [ ] Voice works (speak → hear response)
- [ ] Camera vision works (show image → get description)
- [ ] Memory works (Friday remembers past conversations)
- [ ] Web search works (ask for current info → gets results)
- [ ] User name is configurable (not "David")

### Performance
- [ ] Backend runs on < 200MB RAM
- [ ] Voice round-trip < 3 seconds (speak → hear response)
- [ ] Text response < 1 second
- [ ] Frontend loads in < 2 seconds

### Deployment
- [ ] Works locally via `docker-compose up` (includes Qdrant container)
- [ ] Deployable to free cloud (Koyeb/Render + Vercel + Qdrant Cloud)
- [ ] All secrets in .env, none hardcoded
- [ ] Qdrant data persists across restarts (volume mount)
- [ ] Zero paid API keys required (Groq free + Google free + Mem0 self-hosted)

### UI Quality
- [ ] Matches reference images (HUD aesthetic)
- [ ] Arc reactor animation is smooth (60fps)
- [ ] Responsive (works on mobile too)
- [ ] Dark mode only (Iron Man theme)
- [ ] No emojis as icons (SVG only)

---

## 📊 Dependencies Between Phases

```
Phase 1 (Backend)
  ├──→ Phase 2 (Frontend) — needs WebSocket endpoint
  ├──→ Phase 3 (Voice Pipeline) — needs STT/TTS services
  └──→ Phase 4 (Vision) — needs Gemini service

Phase 2 + Phase 3 → Phase 4 (can start after voice works)
Phase 1-4 → Phase 5 (Docker after core is working)
Phase 1-5 → Phase 6 (Polish after deployment)
```

---

## 🔗 Key API References

| Service | Docs | Free Tier Details |
|---------|------|-------------------|
| Groq | https://console.groq.com/docs | 30 RPM, 6K req/day, Llama 3.3 70B |
| Edge TTS | https://pypi.org/project/edge-tts/ | Unlimited, no API key |
| Gemini | https://ai.google.dev/docs | 15 RPM, 1M tokens/day |
| Mem0 (self-hosted) | https://github.com/mem0ai/mem0 | 100% free, self-hosted, no API key |
| Qdrant | https://qdrant.tech/documentation/ | Free Docker container / Free cloud 1GB |
| HuggingFace Embeddings | https://huggingface.co/sentence-transformers | Free, CPU-only, ~80MB model |
| DuckDuckGo | https://pypi.org/project/duckduckgo-search/ | Free, no API key |
