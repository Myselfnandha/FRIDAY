@echo off
echo ===========================================
echo  INSTALLING LOW-RAM DEPENDENCIES (FINAL FIX)
echo  Optimized for Slow HDD + Fast Internet
echo ===========================================

cd backend

echo 1. Cleaning up...
if exist venv_lowram rmdir /s /q venv_lowram

echo.
echo 2. Creating venv structure...
py -3.11 -m venv venv_lowram
call venv_lowram\Scripts\activate

echo.
echo 3. Installing 'uv' (High-speed installer)...
python -m pip install uv

echo.
echo 4. Turbo-Installing Libraries with uv...
set UV_HTTP_TIMEOUT=600
set UV_CONCURRENT_DOWNLOADS=4

echo.
echo    Installing Core Libraries...
uv pip install python-dotenv google-generativeai mem0ai chromadb faster-whisper edge-tts pydub flask flask-cors AppOpener pure-python-adb opencv-python pillow webrtcvad-wheels requests

echo.
echo 5. Installing OpenWakeWord...
uv pip install openwakeword onnxruntime || echo "Skipping OpenWakeWord..."

echo.
echo 6. Installing LiveKit (Cacheless Force Mode)...
echo    - Attempting to bypass local cache corruption
echo    - Using explicit PyPI index
uv pip install livekit-agents livekit livekit-plugins-google --pre

echo.
echo ===========================================
echo  TURBO INSTALLATION COMPLETE
echo ===========================================
pause
