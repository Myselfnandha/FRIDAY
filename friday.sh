#!/data/data/com.termux/files/usr/bin/bash
# ============================================
# F.R.I.D.A.Y. — Start/Stop Toggle Script
# Run: ./friday.sh        → Start Friday
# Press Ctrl+C             → Stop Friday
# ============================================

FRIDAY_DIR="$HOME/friday"
BACKEND_PID=""
TUNNEL_PID=""

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

cleanup() {
    echo ""
    echo -e "${RED}🛑 Shutting down Friday...${NC}"
    
    # Kill backend
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null
        wait "$BACKEND_PID" 2>/dev/null
    fi
    
    # Kill tunnel
    if [ -n "$TUNNEL_PID" ]; then
        kill "$TUNNEL_PID" 2>/dev/null
        wait "$TUNNEL_PID" 2>/dev/null
    fi
    
    # Release wake lock
    termux-wake-unlock 2>/dev/null || true
    
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

# --- 1. Keep phone awake ---
termux-wake-lock 2>/dev/null || true

# --- 2. Pull latest code ---
echo -e "${DIM}[1/3] Pulling latest from GitHub...${NC}"
cd "$FRIDAY_DIR"
git pull --quiet 2>/dev/null && echo -e "${GREEN}  ✅ Code updated${NC}" || echo -e "${DIM}  ⚠️  Skipped (no git remote or offline)${NC}"

# --- 3. Start Backend ---
echo -e "${DIM}[2/3] Starting Friday backend...${NC}"
cd "$FRIDAY_DIR/backend"

# Use venv if available, otherwise system python
if [ -f "venv/bin/python" ]; then
    PYTHON="venv/bin/python"
else
    PYTHON="python"
fi

$PYTHON main.py &
BACKEND_PID=$!
sleep 3

# Check if backend started
if kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${GREEN}  ✅ Backend running (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}  ❌ Backend failed to start. Check your .env file.${NC}"
    cat "$FRIDAY_DIR/backend/.env" 2>/dev/null | grep -v "KEY" | head -5
    exit 1
fi

# --- 4. Start Cloudflare Tunnel ---
echo -e "${DIM}[3/3] Opening Cloudflare Tunnel...${NC}"
echo ""

# Capture the tunnel URL from cloudflared output
cloudflared tunnel --url http://localhost:8000 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel URL to appear
sleep 5
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ F.R.I.D.A.Y. is ONLINE${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${CYAN}Look above for your public URL:${NC}"
echo -e "  ${DIM}(Something like https://xxx-yyy.trycloudflare.com)${NC}"
echo ""
echo -e "  Open that URL in ${CYAN}any browser${NC} on ${CYAN}any device${NC}"
echo ""
echo -e "  ${DIM}Press Ctrl+C to stop Friday${NC}"
echo ""

# Wait for either process to exit
wait "$TUNNEL_PID" "$BACKEND_PID" 2>/dev/null
cleanup
