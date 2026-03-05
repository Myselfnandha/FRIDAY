#!/usr/bin/env bash
# ============================================
# F.R.I.D.A.Y. — Start/Stop Script
# Works in Termux, Ubuntu (Proot), and Linux
# ============================================

FRIDAY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""
TUNNEL_PID=""

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'


#new
cleanup() {
    echo ""
    echo -e "${RED}🛑 Shutting down Friday...${NC}"
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
    [ -f "/data/data/com.termux/files/usr/bin/termux-wake-unlock" ] && termux-wake-unlock 2>/dev/null || true
    echo -e "${DIM}Friday is offline. Goodbye, Boss.${NC}"
    exit 0
}

trap cleanup INT TERM

echo -e "${CYAN}"
echo "  ███████╗██████╗ ██╗██████╗  █████╗ ██╗   ██╗"
echo "  ██╔════╝██╔══██╗██║██╔══██╗██╔══██╗╚██╗ ██╔╝"
echo "  █████╗  ██████╔╝██║██║  ██║███████║ ╚████╔╝ "
echo "  ██╔══╝  ██╔══██╗██║██║  ██║██╔══██║  ╚██╔╝  "
echo "  ██║     ██║  ██║██║██████╔╝██║  ██║   ██║   "
echo "  ╚═╝     ╚═╝  ╚═╝╚═╝╚═════╝ ╚═╝  ╚═╝   ╚═╝   "
echo -e "${NC}"

# --- 0. Validate .env BEFORE anything else ---
ENV_FILE="$FRIDAY_DIR/backend/.env"

if [ ! -f "$ENV_FILE" ] || ! grep -q "GROQ_API_KEY=." "$ENV_FILE"; then
    echo -e "${YELLOW}⚠️  API keys not found. Let's set them up:${NC}"
    echo ""
    echo -e "  Get GROQ key  → ${DIM}https://console.groq.com${NC}"
    echo -e "  Get Google key → ${DIM}https://aistudio.google.com${NC}"
    echo ""
    read -p "  Enter GROQ_API_KEY: " GROQ_KEY
    read -p "  Enter GOOGLE_API_KEY: " GOOGLE_KEY
    read -p "  Enter your name (default: Alan): " USER_NAME
    USER_NAME=${USER_NAME:-Alan}
    USER_ID=$(echo "$USER_NAME" | tr '[:upper:]' '[:lower:]')

    mkdir -p "$(dirname "$ENV_FILE")"
    cat > "$ENV_FILE" << EOF
GROQ_API_KEY=$GROQ_KEY
GOOGLE_API_KEY=$GOOGLE_KEY
FRIDAY_USER_NAME=$USER_NAME
FRIDAY_USER_ID=$USER_ID
HOST=0.0.0.0
PORT=8000
EOF
    echo -e "${GREEN}  ✅ API keys saved${NC}"
fi

# --- 1. Wake Lock (Termux only) ---
if [ -f "/data/data/com.termux/files/usr/bin/termux-wake-lock" ]; then
    termux-wake-lock 2>/dev/null || true
fi

# --- 2. Git Sync ---
echo -e "${DIM}[1/3] Syncing code...${NC}"
cd "$FRIDAY_DIR"
git pull --quiet 2>/dev/null && echo -e "${GREEN}  ✅ Up to date${NC}" || echo -e "${DIM}  ⚠️  Offline${NC}"

# --- 3. Start Backend ---
echo -e "${DIM}[2/3] Starting Friday backend...${NC}"
cd "$FRIDAY_DIR/backend"

# Smart Python detection
if [ -f "venv/bin/python3" ]; then
    PYTHON="venv/bin/python3"
elif [ -f "venv/bin/python" ]; then
    PYTHON="venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON="python3"
else
    PYTHON="python"
fi

$PYTHON main.py > ../backend.log 2>&1 &
BACKEND_PID=$!
sleep 4

if kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${GREEN}  ✅ Backend running (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}  ❌ Backend failed to start${NC}"
    echo -e "${DIM}  Last error:${NC}"
    tail -n 5 ../backend.log 2>/dev/null
    exit 1
fi

# --- 4. Start Cloudflare Tunnel ---
echo -e "${DIM}[3/3] Opening Cloudflare Tunnel...${NC}"

CLOUDFLARED_BIN=$(command -v cloudflared 2>/dev/null || which cloudflared 2>/dev/null || echo "")

if [ -z "$CLOUDFLARED_BIN" ]; then
    echo -e "${YELLOW}  ⚠️  cloudflared not found. Backend is running locally on port 8000.${NC}"
    echo -e "${DIM}  Access Friday at: http://localhost:8000${NC}"
    wait "$BACKEND_PID" 2>/dev/null
    cleanup
fi

$CLOUDFLARED_BIN tunnel --url http://localhost:8000 2>&1 &
TUNNEL_PID=$!

sleep 6
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ F.R.I.D.A.Y. is ONLINE${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${CYAN}Your Public URL is shown above!${NC}"
echo -e "  ${DIM}(e.g. https://xxx-yyy.trycloudflare.com)${NC}"
echo ""
echo -e "  ${DIM}Press Ctrl+C to stop Friday${NC}"
echo ""

wait "$TUNNEL_PID" "$BACKEND_PID" 2>/dev/null
cleanup
