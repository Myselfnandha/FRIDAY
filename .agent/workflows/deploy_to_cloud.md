description: "Free Cloud Deployment for Friday AI"
---
# Deploying Friday AI to Hugging Face Spaces (Free)

This workflow deploys your Python AI Agent to Hugging Face Spaces, which provides a generous Free Tier (2 vCPU, 16GB RAM) suitable for running `faster-whisper`.

### Prerequisites
1.  **Hugging Face Account**: [Sign Up](https://huggingface.co/join)
2.  **LiveKit Project**: [Cloud Project](https://cloud.livekit.io) (You need the API Key/Secret/URL)

### Steps

1.  **Create a New Space**:
    *   Go to [Hugging Face Spaces](https://huggingface.co/spaces) and click **"Create new Space"**.
    *   **Name**: `friday-agent-backend`.
    *   **License**: `MIT` (or your choice).
    *   **SDK**: Select **Docker**.
    *   **Space Hardware**: Select **Free** (default).
    *   Click **Create Space**.

2.  **Upload Files**:
    *   You can clone the space repo and push your backend code, or upload via the Web UI.
    *   **Crucial Files to Upload**:
        *   `Dockerfile`
        *   `requirements.txt`
        *   `agent.py`
        *   `server.py` (Not needed if only running agent worker, but include if you want)
        *   `local_stt.py`
        *   `memory.py`, `brain.py`, `custom_vad.py`, etc.
        *   (Do NOT upload `venv` or `__pycache__`)

3.  **Set Environment Variables (Secrets)**:
    *   Go to your Space's **Settings** tab.
    *   Scroll to **"Variables and secrets"**.
    *   Add the following **Secrets** (NOT Variables, for security):
        *   `LIVEKIT_URL`: (Your URL from LiveKit Cloud)
        *   `LIVEKIT_API_KEY`: (Your Key)
        *   `LIVEKIT_API_SECRET`: (Your Secret)
        *   `GOOGLE_API_KEY`: (Your Gemini Key)

4.  **Important Change for Cloud**:
    *   **System Tools**: The cloud container **CANNOT** control your local Windows apps or Android phone.
    *   The Agent will run, talk, and remember, but if you ask "Open Calculator", it will fail or try to open `calculator` inside the Linux container (which has no GUI).

5.  **Verify**:
    *   The Space will build (this takes a few minutes).
    *   Check **Logs**. You should see "Systems online. Alan is ready to serve." and "Connected to room...".
    *   Go to your Vercel Frontend (from previous step). Connect. It should work!

### Alternative: Railway.app
*   Connect GitHub repo.
*   Railway detects `Dockerfile`.
*   Add Variables.
*   *Cost*: Only $5 credit trial. Not permanently free.

### Alternative: Local Host (Tunnel)
*   If you *really* need System Control (Windows/Android):
*   Run backend on your PC.
*   The Vercel Frontend (Web) can still talk to it perfectly fine because they rendezvous at the LiveKit Cloud.
