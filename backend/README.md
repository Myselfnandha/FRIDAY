---
title: Friday Backend
emoji: ⚡
colorFrom: gray
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Friday Backend Agent

This is the backend voice agent for FRIDAY. 
It connects to LiveKit Cloud and handles the core logic (LLM, STT, TTS).

## Environment Variables Needed
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GOOGLE_API_KEY`
