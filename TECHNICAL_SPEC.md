# Technical Specification: FRIDAY (Neural Interface & AI Assistant)

## 1. Project Overview
**FRIDAY** is an advanced, real-time voice AI assistant inspired by the "Iron Man" conversational interfaces (JARVIS/FRIDAY). It is designed to run efficiently on low-RAM environments while providing powerful capabilities through cloud-based LLMs.

**Core Vision**: A unified Neural Interface that controls your digital world across Windows and Android, featuring a sci-fi "Glassmorphism" UI, real-time voice processing, and long-term memory.

---

## 2. System Architecture

The system follows a Client-Server Microservices architecture:

```mermaid
graph TD
    User((User)) -->|Voice/Text| Frontend
    
    subgraph Frontend Logic [Vanilla JS Client]
        UI[Glassmorphism UI]
        LK[LiveKit Client SDK]
        Vis[Reactor Visualizer]
    end
    
    subgraph Cloud/Server [Hugging Face Spaces]
        App[Flask App] -->|Auth| LK
        Agent[Python Agent Process] -->|Connect| LKRouter[LiveKit Cloud]
        
        Agent -->|LLM| Gemini[Google Gemini 1.5 Flash]
        Agent -->|TTS| EdgeTTS[Edge TTS Service]
        Agent -->|STT| Whisper[Faster Whisper (Local/Int8)]
        Agent -->|Memory| Mem0[Mem0 + ChromaDB]
    end

    Frontend <-->|WebRTC A/V + Data| LKRouter <--> Agent
```

---

## 3. Technology Stack

### 3.1 Frontend (User Interface)
*   **Framework**: Vanilla HTML5 / CSS3 / JavaScript (ES6+).
*   **Dependencies**: 
    *   `livekit-client`: For WebRTC audio/video and real-time data channels.
    *   `lucide`: For iconography.
*   **Styling**: Pure CSS with Variables, CSS Grid/Flexbox, Keyframe Animations (Neon glow, Reactor spin).
*   **Deployment**: Integrated into the backend Flask host (Static file serving) or standalone Vercel (optional).

### 3.2 Backend (AI Core)
*   **Runtime**: Python 3.11+.
*   **Framework**: `livekit-agents` (Orchestration), `flask` (Token API).
*   **STT (Speech-to-Text)**: `faster-whisper` (running locally on CPU with `int8` quantization for speed/low-memory).
*   **LLM (Intelligence)**: `google-generativeai` (Gemini 1.5 Flash). Selected for high speed, large context window, and free tier availability.
*   **TTS (Text-to-Speech)**: `edge-tts` (Microsoft Edge Online TTS). High-quality neural voices without local GPU requirement.
*   **Database/Memory**: `mem0ai` backed by `chromadb` (Vector Store) for semantic search and long-term context.
*   **Deployment**: Dockerized application running on Hugging Face Spaces.

### 3.3 Connectivity & Protocols
*   **WebRTC**: Primary transport for low-latency Audio and Video.
*   **Data Channels**: Used for sending text commands (System instructions, Personality updates) and receiving events (UI status updates) instantly.
*   **ADB (Android Debug Bridge)**: For controlling Android devices connected via USB/TCP to the host.
*   **AppOpener**: For Windows application automation.

---

## 4. Key Modules & Features

### 4.1 Frontend Modules
*   **Neural Reactor**: A central visual component that animates based on voice activity (VAD events), simulating a "living" core.
*   **Comm Link**: Manages connection states, handling reconnects and "Sleeping" server states via a configurable Backend URL.
*   **Personality Matrix**: A UI panel allowing users to dynamically reconfigure the AI's Identity, Voice Style, Emotion, and Strictness at runtime using "System Instruction" injection.
*   **Chat Interface**: Real-time log of the conversation, styled as a sci-fi terminal.

### 4.2 Backend Modules
*   **`agent.py` (The Supervisor)**:
    *   Manages the LifeCycle of the AI session.
    *   Integrates VAD, STT, LLM, and TTS capabilities.
    *   Handles incoming Data Packets (`json` commands) and routes them to logic.
*   **`local_stt.py` (Hearing)**:
    *   Custom implementation of LiveKit's STT interface using `faster-whisper`.
    *   Optimized with `_recognize_impl` single-shot logic and `int8` compute type.
*   **`brain.py` (Cognitive Engine)**:
    *   **Planning**: Deconstructs complex user goals into steps.
    *   **Learning**: Saves successful task execution patterns to memory.
    *   **Language Detection**: Heuristic routing for English/Tamil/Tanglish processing.
*   **`memory.py` (Long-Term Storage)**:
    *   Wrapper around `mem0`.
    *   Stores "User Facts" and "System Skills" in a vector database (`memory.db`).
*   **`system_tools.py` (The Hands)**:
    *   **Windows**: Opens/Closes apps (`AppOpener`).
    *   **Android**: Uses `pure-python-adb` to launch apps, kill packages, or inject text commands into Google Assistant.

---

## 5. Data Flow & Logic

1.  **Initialization**:
    *   Frontend requests Access Token from Flask API (`/api/token`).
    *   Connects to LiveKit Cloud Room.
    *   Backend Agent joins the same room.

2.  **Voice Interaction Loop**:
    *   **User Speaks** -> WebRTC Stream -> Backend.
    *   **VAD** detects speech activity.
    *   **STT** transcribes audio to text (Faster Whisper).
    *   **Agent** appends text to Context.
    *   **LLM** (Gemini) generates response + decides if **Tools** are needed.
    *   **TTS** streams audio response back to Frontend.

3.  **Command Execution**:
    *   If LLM calls a tool (e.g., `open_app_android`), the `AssistantFnc` class executes the corresponding Python function in `system_tools.py`.
    *   Results are fed back to LLM for final confirmation ("Opening WhatsApp for you, Sir").

---

## 6. Implementation & Deployment Status

*   **Repository**: GitHub (Synced via automated script).
*   **CI/CD**: `auto_upload.bat` script handles sensitive file cleaning, git operations, and force-pushing to Hugging Face.
*   **Current State**:
    *   Frontend: **Stable** (Vanilla JS, Settings/Personality UI active).
    *   Backend: **Stable** (STT Fixed, Memory integration active).
    *   Deployment: **Active** on Hugging Face Spaces.

## 7. Future Roadmap
*   **Vision Capabilities**: Enable camera stream processing for "Sight" (Gemini Vision).
*   **Local LLM Support**: Switch to `Ollama` for fully offline functioning.
*   **Advanced IoT**: Home Assistant integration via generic webhooks.
