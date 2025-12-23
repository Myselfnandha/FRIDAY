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
    
    subgraph Frontend Logic [React Client]
        UI[React UI Components]
        Config[app-config.ts]
        LK[LiveKit Components]
        Vis[Arc Reactor Visualizer]
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
*   **Framework**: React (Node.js + PNPM).
*   **Base Template**: LiveKit React App Template (Next.js/Vite).
*   **Configuration**: Centralized control via `app-config.ts`.
*   **Dependencies**: 
    *   `livekit-client` & `@livekit/components-react`: For WebRTC and UI components.
    *   `framer-motion`: For high-quality animations.
*   **Styling**: TailwindCSS + Custom CSS for "Glassmorphism" and Sci-Fi effects.
*   **Assets**: SVG/PNG for logos, specifically the "Arc Reactor" visual.

### 3.2 Backend (AI Core)
*   **Runtime**: Python 3.11+.
*   **Framework**: `livekit-agents` (Orchestration), `flask` (Token API).
*   **STT (Speech-to-Text)**: `faster-whisper` (running locally on CPU with `int8` quantization for speed/low-memory).
*   **LLM (Intelligence)**: `google-generativeai` (Gemini 1.5 Flash).
*   **TTS (Text-to-Speech)**: `edge-tts`.
*   **Database/Memory**: `mem0ai` backed by `chromadb`.
*   **Deployment**: Dockerized application running on Hugging Face Spaces.

### 3.3 Connectivity & Protocols
*   **WebRTC**: Primary transport for low-latency Audio and Video.
*   **Data Channels**: Used for sending JSON commands and receiving status updates.
*   **System Control**: ADB (Android) and AppOpener (Windows).

---

## 4. Key Modules & Features

### 4.1 Frontend Modules & UI Components
*   **Visual Identity**:
    *   **Hero**: Custom "Arc Reactor" animation replacing default logos.
    *   **Branding**: "Friday Voice Agent" (No "Powered by LiveKit" text).
*   **Control Center (`app-config.ts`)**:
    *   Configurable Page Title, Company Name, and Description.
*   **Agent State UI**:
    *   Visual indicators for: **Listening**, **Thinking**, **Speaking**, **Idle**.
*   **Autonomy Level Indicator**:
    *   A dedicated gauge (1–6) representing the AI's operational autonomy (ALAN Core Design).
*   **Session Memory Panel**:
    *   Displays the last recognized User Intent or Task.
*   **Standard Controls**:
    *   Mic/Camera Toggles, Screen Share, Disconnect.
    *   Chat Panel (History + Typing).

### 4.2 Backend Modules
*   **`agent.py` (The Supervisor)**:
    *   Manages the AI LifeCycle.
    *   Routes Data Packets (Personality updates, System commands).
*   **`local_stt.py` (Hearing)**:
    *   Custom Faster-Whisper implementation (`int8`, `_recognize_impl`).
*   **`brain.py` (Cognitive Engine)**:
    *   Planning & Learning logic.
    *   Language Style detection.
*   **`memory.py` (Long-Term Storage)**:
    *   Mem0 + ChromaDB integration.
*   **`system_tools.py` (The Hands)**:
    *   Windows/Android automation tools.

---

## 5. Data Flow & Logic

1.  **Initialization**:
    *   Frontend reads `app-config.ts` for UI setup.
    *   Requests Token -> Connects to LiveKit Room.

2.  **Voice Interaction Loop**:
    *   **User Speaks** -> WebRTC Stream -> Backend.
    *   **VAD** detects speech -> Frontend updates State to "Listening".
    *   **STT** transcribes -> Frontend shows user text.
    *   **Agent** processes -> Frontend updates State to "Thinking".
    *   **LLM** responds -> Frontend updates State to "Speaking".
    *   **TTS** streams audio -> Frontend visualizer reacts.

3.  **Command Execution**:
    *   LLM triggers tools -> Backend executes -> Results sent to Frontend via Data Channel (updating Memory Panel).

---

## 6. Implementation & Deployment Status

*   **Repository**: GitHub.
*   **CI/CD**: `auto_upload.bat` script.
*   **Current State**:
    *   Backend: **Stable** (Python/LiveKit Agents).
    *   Frontend: **Migration Required** (Transitioning from Vanilla JS back to React/Next.js to support advanced component features).
    *   Deployment: **Active** on Hugging Face Spaces.

## 7. Future Roadmap
*   **Vision**: Camera inputs.
*   **Ollama**: Local LLM.
*   **Home Automation**: IoT integration.
