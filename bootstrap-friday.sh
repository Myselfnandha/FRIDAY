#!/data/data/com.termux/files/usr/bin/bash
# ========================================================
# F.R.I.D.A.Y. ULTRA-AUTOMATION (Termux + Ubuntu Proot)
# One script to rule them all.
# Run ONCE. After that, just open Termux.
# ========================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

echo -e "${CYAN}🦾 F.R.I.D.A.Y. - System Initialization...${NC}"

# ============================================================
# PHASE 1: Termux Host Setup
# ============================================================
echo -e "${DIM}📦 [1/5] Updating Termux packages...${NC}"
pkg update -y
pkg install -y proot-distro git cloudflared termux-services

# Install Ubuntu if not present
if ! proot-distro list | grep -q "ubuntu.*installed"; then
    echo -e "${CYAN}🌐 Installing Ubuntu environment (first time only)...${NC}"
    proot-distro install ubuntu
fi

termux-wake-lock 2>/dev/null || true

# ============================================================
# PHASE 2: Collect API Keys (if not already saved)
# ============================================================
echo -e "${DIM}🔑 [2/5] Checking API keys...${NC}"

# We store a master .env in Termux home for persistence
MASTER_ENV="$HOME/.friday_env"

if [ ! -f "$MASTER_ENV" ] || ! grep -q "GROQ_API_KEY=." "$MASTER_ENV"; then
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  🔑 First-Time API Key Setup${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  Get GROQ key  → ${DIM}https://console.groq.com${NC}"
    echo -e "  Get Google key → ${DIM}https://aistudio.google.com${NC}"
    echo ""
    read -p "  Enter GROQ_API_KEY: " GROQ_KEY
    read -p "  Enter GOOGLE_API_KEY: " GOOGLE_KEY
    read -p "  Enter your name (default: Alan): " USER_NAME
    USER_NAME=${USER_NAME:-Alan}
    USER_ID=$(echo "$USER_NAME" | tr '[:upper:]' '[:lower:]')

    cat > "$MASTER_ENV" << ENVEOF
GROQ_API_KEY=$GROQ_KEY
GOOGLE_API_KEY=$GOOGLE_KEY
FRIDAY_USER_NAME=$USER_NAME
FRIDAY_USER_ID=$USER_ID
HOST=0.0.0.0
PORT=8000
ENVEOF
    echo -e "${GREEN}  ✅ API keys saved to $MASTER_ENV${NC}"
else
    echo -e "${GREEN}  ✅ API keys already configured${NC}"
fi

# ============================================================
# PHASE 3: Inject .env into Ubuntu filesystem
# ============================================================
echo -e "${DIM}📋 [3/5] Syncing .env into Ubuntu...${NC}"

UBUNTU_ROOT="/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/ubuntu/root"
UBUNTU_BACKEND="$UBUNTU_ROOT/friday/backend"

mkdir -p "$UBUNTU_BACKEND"
cp "$MASTER_ENV" "$UBUNTU_BACKEND/.env"
echo -e "${GREEN}  ✅ .env synced to Ubuntu${NC}"

# ============================================================
# PHASE 4: Create autostart script INSIDE Ubuntu
# ============================================================
echo -e "${DIM}🐍 [4/5] Setting up Ubuntu automation...${NC}"

cat > "$UBUNTU_ROOT/autostart.sh" << 'UBUNTUEOF'
#!/usr/bin/env bash
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

# --- Ubuntu System Packages ---
apt update -qq && apt install -y -qq python3 python3-pip python3-venv git > /dev/null 2>&1

cd ~

# --- Clone or Update Repo ---
if [ ! -d "friday" ]; then
    echo -e "${DIM}📥 Cloning Friday from GitHub...${NC}"
    git clone https://github.com/Myselfnandha/Clawbot.git friday
fi

cd ~/friday
echo -e "${DIM}🔄 Checking for updates...${NC}"
# Use || true to prevent set -e from killing the script if git pull fails
GIT_STATUS=$(git pull --no-edit 2>&1 || true)
if [[ "$GIT_STATUS" == *"Already up to date"* ]]; then
    echo -e "${DIM}  ✅ Code is current${NC}"
else
    echo -e "${GREEN}  ✅ Code updated${NC}"
fi

# --- Setup Venv ---
cd backend
if [ ! -d "venv" ]; then
    echo -e "${DIM}🐍 Creating virtual environment...${NC}"
    python3 -m venv venv
fi

source venv/bin/activate

# --- Smart Dependency Install ---
if [[ "$GIT_STATUS" != *"Already up to date"* ]] || ! python3 -c "import uvicorn" 2>/dev/null; then
    echo -e "${DIM}⚡ Installing/updating dependencies...${NC}"
    pip install --upgrade pip > /dev/null 2>&1
    pip install --no-cache-dir -r requirements.txt
else
    echo -e "${DIM}  ✅ Dependencies OK${NC}"
fi

# --- Validate .env ---
if [ ! -f .env ] || ! grep -q "GROQ_API_KEY=." .env; then
    echo -e "${RED}❌ .env is missing or incomplete!${NC}"
    echo -e "${DIM}Creating .env now...${NC}"
    read -p "  GROQ_API_KEY: " GROQ_KEY
    read -p "  GOOGLE_API_KEY: " GOOGLE_KEY
    read -p "  Your name (default: Alan): " UNAME
    UNAME=${UNAME:-Alan}
    UID_LOWER=$(echo "$UNAME" | tr '[:upper:]' '[:lower:]')
    cat > .env << EOF
GROQ_API_KEY=$GROQ_KEY
GOOGLE_API_KEY=$GOOGLE_KEY
FRIDAY_USER_NAME=$UNAME
FRIDAY_USER_ID=$UID_LOWER
HOST=0.0.0.0
PORT=8000
EOF
    echo -e "${GREEN}  ✅ .env created${NC}"
fi

# --- Start Friday ---
cd ..
chmod +x friday.sh
exec ./friday.sh
UBUNTUEOF

chmod +x "$UBUNTU_ROOT/autostart.sh"

# ============================================================
# PHASE 5: Hook into Termux Shell Login
# ============================================================
echo -e "${DIM}🔗 [5/5] Setting up auto-start on Termux launch...${NC}"

BASHRC="$HOME/.bashrc"

# Remove any old Friday hooks first
sed -i '/F.R.I.D.A.Y. AUTO-WAKE/,/^fi$/d' "$BASHRC" 2>/dev/null || true
sed -i '/PROOT_ACTIVE/d' "$BASHRC" 2>/dev/null || true

cat >> "$BASHRC" << 'HOOKEOF'

# --- F.R.I.D.A.Y. AUTO-WAKE ---
if [ -z "$FRIDAY_RUNNING" ]; then
    export FRIDAY_RUNNING=1
    # Sync .env from master copy every boot
    MASTER_ENV="$HOME/.friday_env"
    UBUNTU_ENV="/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/ubuntu/root/friday/backend/.env"
    if [ -f "$MASTER_ENV" ]; then
        mkdir -p "$(dirname "$UBUNTU_ENV")"
        cp "$MASTER_ENV" "$UBUNTU_ENV" 2>/dev/null || true
    fi
    echo "👋 Waking up Friday..."
    termux-wake-lock 2>/dev/null || true
    proot-distro login ubuntu -- bash /root/autostart.sh
fi
HOOKEOF

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ F.R.I.D.A.Y. AUTOMATION COMPLETE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  From now on, ${CYAN}just open Termux${NC} and Friday will:"
echo -e "  1. Sync .env (API keys) automatically"
echo -e "  2. Pull latest code from GitHub"
echo -e "  3. Update packages if needed"
echo -e "  4. Start backend + Cloudflare tunnel"
echo ""
echo -e "  ${DIM}Restarting shell now...${NC}"
exec bash
