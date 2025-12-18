---
title: Friday Voice Assistant
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# FRIDAY (Project Alan)

A JARVIS-style real-time voice AI assistant using LiveKit, Gemini, and React.

## Structure
- **backend/**: Python agent handling Voice Logic, LLM (Gemini), and Memory (ChromaDB).
- **frontend/**: React Web UI with "Rich Aesthetics" (Glassmorphism, Sci-Fi).

## Setup

### 1. Backend Setup
The backend requires Python 3.9+.

```bash
cd backend
# (Virtual env is already created in ./venv if you ran the installer)
# Activate it:
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install dependencies (if not done)
pip install -r requirements.txt
```

### 2. Configuration
Create a `.env` file in `backend/` based on `.env.example`. You need:
- **LiveKit**: URL, API Key, Secret (Cloud or Local).
- **Deepgram**: API Key (for STT).
- **Gemini**: API Key (Google Gen AI).
- **OpenAI**: API Key (for TTS, optional if using others).

### 3. Run the Agent
To start the agent in development mode (connects to your LiveKit room):

```bash
python agent.py dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 5. Connecting
1. Open the Frontend URL (e.g., `http://localhost:5173`).
2. Generate a Token for yourself:
   ```bash
   python backend/gen_token.py
   ```
3. Enter the **LiveKit URL** and **Token** into the UI.
4. Click **INITIALIZE SYSTEM**.

## Features
- **Voice Input/Output**: Real-time conversation.
- **Memory**: Remembers context across sessions (stored in `backend/memory_db`).
- **Visuals**: Animated "Orb" interface.
