#!/usr/bin/env bash
# ============================================
# F.R.I.D.A.Y. — Start Server + Tunnel
# Works in: Termux, Ubuntu (Proot), Linux
# ============================================

# Find project root (where this script lives)
FRIDAY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$FRIDAY_DIR/backend"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'

# Track PIDs for cleanup
BACKEND_PID=""
TUNNEL_PID=""

cleanup() {
    echo ""
    echo -e "${RED}🛑 Shutting down Friday...${NC}"
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
    command -v termux-wake-unlock >/dev/null 2>&1 && termux-wake-unlock 2>/dev/null
    echo -e "${DIM}Friday is offline. Goodbye, Boss.${NC}"
    exit 0
}
trap cleanup INT TERM

# ── Banner ──
echo -e "${CYAN}"
echo "  ███████╗██████╗ ██╗██████╗  █████╗ ██╗   ██╗"
echo "  ██╔════╝██╔══██╗██║██╔══██╗██╔══██╗╚██╗ ██╔╝"
echo "  █████╗  ██████╔╝██║██║  ██║███████║ ╚████╔╝ "
echo "  ██╔══╝  ██╔══██╗██║██║  ██║██╔══██║  ╚██╔╝  "
echo "  ██║     ██║  ██║██║██████╔╝██║  ██║   ██║   "
echo "  ╚═╝     ╚═╝  ╚═╝╚═╝╚═════╝ ╚═╝  ╚═╝   ╚═╝   "
echo -e "${NC}"

# ── Step 0: Validate .env ──
if [ ! -f "$BACKEND_DIR/.env" ] || ! grep -q "GROQ_API_KEY=." "$BACKEND_DIR/.env" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  API keys missing. Quick setup:${NC}"
    echo ""
    echo -e "  Get GROQ key   → ${DIM}https://console.groq.com${NC}"
    echo -e "  Get Google key → ${DIM}https://aistudio.google.com${NC}"
    echo ""
    read -p "  Enter GROQ_API_KEY: " GROQ_KEY
    read -p "  Enter GOOGLE_API_KEY: " GOOGLE_KEY
    read -p "  Enter your name (default: Alan): " USER_NAME
    USER_NAME=${USER_NAME:-Alan}
    USER_ID=$(echo "$USER_NAME" | tr '[:upper:]' '[:lower:]')

    mkdir -p "$BACKEND_DIR"
    printf "GROQ_API_KEY=%s\nGOOGLE_API_KEY=%s\nFRIDAY_USER_NAME=%s\nFRIDAY_USER_ID=%s\nHOST=0.0.0.0\nPORT=8000\n" \
        "$GROQ_KEY" "$GOOGLE_KEY" "$USER_NAME" "$USER_ID" > "$BACKEND_DIR/.env"

    echo -e "${GREEN}  ✅ API keys saved${NC}"
fi

# ── Step 1: Wake Lock (Termux only) ──
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock 2>/dev/null

# ── Step 2: Find Python ──
if [ -f "$BACKEND_DIR/venv/bin/python3" ]; then
    PYTHON="$BACKEND_DIR/venv/bin/python3"
elif [ -f "$BACKEND_DIR/venv/bin/python" ]; then
    PYTHON="$BACKEND_DIR/venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON="python3"
else
    PYTHON="python"
fi

# ── Step 3: Start Backend ──
echo -e "${DIM}[1/2] Starting Friday backend...${NC}"
cd "$BACKEND_DIR"

$PYTHON main.py > "$FRIDAY_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
sleep 4

if kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${GREEN}  ✅ Backend running (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}  ❌ Backend failed to start${NC}"
    echo -e "${DIM}  Error log:${NC}"
    tail -n 8 "$FRIDAY_DIR/backend.log" 2>/dev/null
    exit 1
fi

# ── Step 4: Start Cloudflare Tunnel ──
echo -e "${DIM}[2/2] Opening Cloudflare Tunnel...${NC}"

CLOUDFLARED=""
if command -v cloudflared >/dev/null 2>&1; then
    CLOUDFLARED="cloudflared"
fi

if [ -z "$CLOUDFLARED" ]; then
    echo -e "${YELLOW}  ⚠️  cloudflared not found${NC}"
    echo -e "${DIM}  Friday is running locally at: http://localhost:8000${NC}"
    echo -e "${DIM}  Press Ctrl+C to stop${NC}"
    wait "$BACKEND_PID" 2>/dev/null
    cleanup
fi

$CLOUDFLARED tunnel --url http://localhost:8000 2>&1 &
TUNNEL_PID=$!

sleep 6
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ F.R.I.D.A.Y. is ONLINE${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${CYAN}Your public URL is shown above!${NC}"
echo -e "  ${DIM}(e.g. https://xxx-yyy.trycloudflare.com)${NC}"
echo ""
echo -e "  ${DIM}Press Ctrl+C to stop Friday${NC}"
echo ""

# Keep alive until user presses Ctrl+C
wait "$TUNNEL_PID" "$BACKEND_PID" 2>/dev/null
cleanup
