#!/data/data/com.termux/files/usr/bin/bash
# =============================================================
# F.R.I.D.A.Y. — ULTRA AUTOMATION (The "Jarvis" Protocol)
# This script handles EVERYTHING: Updates, Ubuntu, and Start.
# =============================================================

set -e

# --- Colors ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
DIM='\033[2m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ███████╗██████╗ ██╗██████╗  █████╗ ██╗   ██╗"
echo "  ██╔════╝██╔══██╗██║██╔══██╗██╔══██╗╚██╗ ██╔╝"
echo "  █████╗  ██████╔╝██║██║  ██║███████║ ╚████╔╝ "
echo "  ██╔══╝  ██╔══██╗██║██║  ██║██╔══██║  ╚██╔╝  "
echo "  ██║     ██║  ██║██║██████╔╝██║  ██║   ██║   "
echo "  ╚═╝     ╚═╝  ╚═╝╚═╝╚═════╝ ╚═╝  ╚═╝   ╚═╝   "
echo -e "${NC}"
echo -e "${YELLOW}  initializing automatic systems...${NC}"

# --- 1. Termux Environment Check ---
echo -e "${DIM}[1/5] Updating Termux packages...${NC}"
pkg update -confirm > /dev/null 2>&1
pkg install -y proot-distro git cloudflared termux-services > /dev/null 2>&1
termux-wake-lock 2>/dev/null || true

# --- 2. Ensure Ubuntu & Folder exists ---
FRIDAY_DIR="$HOME/friday"
UBUNTU_ROOT="/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/ubuntu"

if [ ! -d "$UBUNTU_ROOT" ]; then
    echo -e "${YELLOW}  Installing Ubuntu (First time only)...${NC}"
    proot-distro install ubuntu
fi

# --- 3. Sync Settings (.env) ---
if [ -f "$FRIDAY_DIR/backend/.env" ]; then
    echo -e "${DIM}[2/5] Synchronizing encrypted settings...${NC}"
    mkdir -p "$UBUNTU_ROOT/root/friday/backend"
    cp "$FRIDAY_DIR/backend/.env" "$UBUNTU_ROOT/root/friday/backend/.env"
    echo -e "${GREEN}  ✅ Settings Synced${NC}"
else
    echo -e "${RED}  ❌ Wait! Your .env file is missing in '$FRIDAY_DIR/backend/'.${NC}"
    echo -e "  Please create it first so I know your API keys."
    exit 1
fi

# --- 4. Pulse Check & Update (Inside Ubuntu) ---
echo -e "${DIM}[3/5] Checking for updates (GitHub)...${NC}"

# Execute update script inside Ubuntu
proot-distro login ubuntu -- bash -c "
    apt update > /dev/null 2>&1
    apt install -y python3 python3-pip python3-venv git > /dev/null 2>&1
    cd ~/friday
    # Fetch changes
    BEFORE=\$(git rev-parse HEAD)
    git pull --quiet
    AFTER=\$(git rev-parse HEAD)
    
    cd backend
    if [ ! -d \"venv\" ]; then
        echo \"⚡ Creating Python environment...\"
        python3 -m venv venv
    fi
    source venv/bin/activate
    
    # If requirements.txt changed or venv is fresh, reinstall
    if [ \"\$BEFORE\" != \"\$AFTER\" ] || [ ! -f \".last_install\" ]; then
         echo \"🔥 New updates found! Updating Python packages...\"
         pip install --quiet --upgrade pip
         pip install --quiet --no-cache-dir -r requirements.txt
         date > .last_install
         echo \"✅ Packages updated successfully\"
    else
         echo \"✅ Code is up to date\"
    fi
"

# --- 5. Launch Friday ---
echo -e "${DIM}[4/5] Starting backend services...${NC}"
# Use a background process in Ubuntu to keep it running
proot-distro login ubuntu -- bash -c "cd ~/friday/backend && source venv/bin/activate && python3 main.py > ../backend.log 2>&1 &"

# Let the server wake up
sleep 5

# --- 6. Cloudflare Tunnel ---
echo -e "${DIM}[5/5] Deploying public gateway...${NC}"
echo -e "${CYAN}--------------------------------------------${NC}"

# Start cloudflared in background and show the URL
cloudflared tunnel --url http://localhost:8000 2>&1 | grep --line-buffered "trycloudflare.com" &

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ F.R.I.D.A.Y. IS FULLY OPERATIONAL${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Open the URL above in your browser."
echo -e "  ${DIM}System running in background. Type 'pkill -f python' to stop.${NC}"
echo ""

# Keep Termux session alive for logs
tail -f "$UBUNTU_ROOT/root/friday/backend.log"
