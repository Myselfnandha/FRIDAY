@echo off
set "VENV_DIR=venv"
if exist "backend\venv_lowram" (
    set "VENV_DIR=venv_lowram"
    echo Using Lightweight Environment: venv_lowram
    rem Patch for webrtcvad import name if needed
) else (
    echo Using Standard Environment: venv
)

echo Starting FRIDAY Token Server...
start "FRIDAY Token Server" cmd /k "cd backend && call %VENV_DIR%\Scripts\activate && python server.py"

echo Starting FRIDAY Voice Agent...
start "FRIDAY Agent" cmd /k "cd backend && call %VENV_DIR%\Scripts\activate && python agent.py dev"

echo Starting FRIDAY Frontend...
start "FRIDAY Frontend" cmd /k "cd frontend_react && npm run dev"

echo System Startup Initiated.
echo 1. Token Server (Port 5000)
echo 2. Voice Agent (Processing Audio)
echo 3. Frontend (UI)
pause
