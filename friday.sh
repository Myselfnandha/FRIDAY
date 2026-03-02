#!/usr/bin/env bash
# ============================================
# F.R.I.D.A.Y. — Start/Stop Toggle Script
# Runs in Termux AND Ubuntu (Proot)
# ============================================

# Use current directory or home folder
FRIDAY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""
TUNNEL_PID=""

# Colors (work in most terminals)
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

cleanup() {
    echo ""
    echo -e "${RED}🛑 Shutting down Friday...${NC}"
    
    # Kill background processes
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
    
    # Release wake lock ONLY if in Termux
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

# --- 1. Termux Wake Lock ---
if [ -f "/data/data/com.termux/files/usr/bin/termux-wake-lock" ]; then
    termux-wake-lock 2>/dev/null || true
fi

# --- 2. Update Code ---
echo -e "${DIM}[1/3] Updating local code...${NC}"
cd "$FRIDAY_DIR"
git pull --quiet 2>/dev/null && echo -e "${GREEN}  ✅ Synchronized${NC}" || echo -e "${DIM}  ⚠️  Offline or local changes only${NC}"

# --- 3. Start Backend ---
echo -e "${DIM}[2/3] Starting Friday backend...${NC}"
cd "$FRIDAY_DIR/backend"

# Smart Python detection (venv vs system)
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

# Check status
if kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${GREEN}  ✅ Backend running (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}  ❌ Backend failed to start.${NC}"
    echo "Last logs:"
    tail -n 10 ../backend.log 2>/dev/null
    exit 1
fi

# --- 4. Start Cloudflare Tunnel ---
echo -e "${DIM}[3/3] Opening Cloudflare Tunnel...${NC}"

# Check for cloudflared binary (Host vs Proot)
CLOUDFLARED_BIN=$(command -v cloudflared 2>/dev/null || which cloudflared 2>/dev/null)

if [ -z "$CLOUDFLARED_BIN" ]; then
     echo -e "${RED}  ❌ Error: cloudflared not found. Please install it on your device/proot.${NC}"
     cleanup
fi

$CLOUDFLARED_BIN tunnel --url http://localhost:8000 2>&1 &
TUNNEL_PID=$!

# Wait for URL to appear from logs
sleep 5
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ F.R.I.D.A.Y. is ONLINE${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${CYAN}Check your Public URL above!${NC}"
echo -e "  ${DIM}(e.g. https://xxx-yyy.trycloudflare.com)${NC}"
echo ""
echo -e "  ${DIM}Press Ctrl+C to stop Friday${NC}"
echo ""

# Keep alive
wait "$TUNNEL_PID" "$BACKEND_PID" 2>/dev/null
cleanup
