#!/data/data/com.termux/files/usr/bin/bash
# ========================================================
# F.R.I.D.A.Y. BOOTSTRAP — Run this ONCE on a fresh phone
# After this, just open Termux and Friday starts itself.
# ========================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
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
echo -e "${CYAN}🦾 One-Time Setup — Sit back and relax${NC}"
echo ""

# ===========================================
# STEP 1: Update Termux & Install Essentials
# ===========================================
echo -e "${DIM}[1/5] Updating Termux...${NC}"
pkg update -y && pkg upgrade -y
pkg install -y proot-distro git cloudflared termux-services

# ===========================================
# STEP 2: Install Ubuntu (if not installed)
# ===========================================
echo -e "${DIM}[2/5] Setting up Ubuntu environment...${NC}"
if proot-distro list 2>/dev/null | grep -q "ubuntu"; then
    echo -e "${GREEN}  ✅ Ubuntu already installed${NC}"
else
    echo -e "${DIM}  Downloading Ubuntu (this takes ~1 min)...${NC}"
    proot-distro install ubuntu
fi

# ===========================================
# STEP 3: Collect API Keys
# ===========================================
echo -e "${DIM}[3/5] Configuring API keys...${NC}"

MASTER_ENV="$HOME/.friday_env"

if [ -f "$MASTER_ENV" ] && grep -q "GROQ_API_KEY=." "$MASTER_ENV"; then
    echo -e "${GREEN}  ✅ API keys already saved${NC}"
else
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  🔑 First-Time API Key Setup${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  Get GROQ key   → ${DIM}https://console.groq.com${NC}"
    echo -e "  Get Google key → ${DIM}https://aistudio.google.com${NC}"
    echo ""
    read -p "  Enter GROQ_API_KEY: " GROQ_KEY
    read -p "  Enter GOOGLE_API_KEY: " GOOGLE_KEY
    read -p "  Enter your name (default: Alan): " USER_NAME
    USER_NAME=${USER_NAME:-Alan}
    USER_ID=$(echo "$USER_NAME" | tr '[:upper:]' '[:lower:]')

    printf "GROQ_API_KEY=%s\nGOOGLE_API_KEY=%s\nFRIDAY_USER_NAME=%s\nFRIDAY_USER_ID=%s\nHOST=0.0.0.0\nPORT=8000\n" \
        "$GROQ_KEY" "$GOOGLE_KEY" "$USER_NAME" "$USER_ID" > "$MASTER_ENV"

    echo -e "${GREEN}  ✅ Keys saved${NC}"
fi

# ===========================================
# STEP 4: Clone repo + install deps in Ubuntu
# ===========================================
echo -e "${DIM}[4/5] Installing Python & Friday inside Ubuntu...${NC}"

REPO_URL="https://github.com/Myselfnandha/Clawbot.git"
REPO_FOLDER="Clawbot"
UBUNTU_ROOT="/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/ubuntu/root"

# IMPORTANT: Do NOT create directories before git clone!
# Git clone needs an empty or non-existent target folder.

# Run the full setup INSIDE Ubuntu
proot-distro login ubuntu -- bash -c "
    set +e

    echo '  📦 Installing system packages...'
    apt update -qq 2>/dev/null
    apt install -y -qq python3 python3-pip python3-venv git 2>/dev/null

    cd /root

    # Clone or update the repo
    if [ -d '$REPO_FOLDER/.git' ]; then
        echo '  🔄 Updating code...'
        cd /root/$REPO_FOLDER
        git pull --no-edit 2>/dev/null || true
    else
        # Remove any leftover broken directory first
        rm -rf /root/$REPO_FOLDER
        echo '  📥 Cloning Friday from GitHub...'
        git clone '$REPO_URL' '$REPO_FOLDER'
    fi

    # Verify the clone worked
    if [ ! -f /root/$REPO_FOLDER/backend/requirements.txt ]; then
        echo '  ❌ Clone failed! Retrying...'
        rm -rf /root/$REPO_FOLDER
        git clone '$REPO_URL' '$REPO_FOLDER'
    fi

    cd /root/$REPO_FOLDER/backend

    # Verify requirements.txt
    if [ ! -f requirements.txt ]; then
        echo '  ❌ FATAL: requirements.txt still not found after clone!'
        echo '  Contents of /root/$REPO_FOLDER:'
        ls -la /root/$REPO_FOLDER/
        exit 1
    fi

    # Setup venv
    if [ ! -d venv ]; then
        echo '  🐍 Creating virtual environment...'
        python3 -m venv venv
    fi

    . venv/bin/activate

    echo '  ⚡ Installing Python dependencies...'
    pip install --upgrade pip 2>/dev/null
    pip install --no-cache-dir -r requirements.txt

    # Verify critical packages
    python3 -c 'import uvicorn; import fastapi; print(\"  ✅ All packages installed\")' || echo '  ⚠️ Some packages may have failed'

    echo '  ✅ Ubuntu setup complete'
"

# NOW copy .env (AFTER clone so the directory exists with real files)
echo -e "${DIM}  🔑 Syncing API keys into Ubuntu...${NC}"
cp "$MASTER_ENV" "$UBUNTU_ROOT/$REPO_FOLDER/backend/.env" 2>/dev/null
echo -e "${GREEN}  ✅ .env synced${NC}"

# ===========================================
# STEP 5: Hook into Termux auto-start
# ===========================================
echo -e "${DIM}[5/5] Setting up auto-start...${NC}"

BASHRC="$HOME/.bashrc"

# Clean out ANY previous Friday hooks
if [ -f "$BASHRC" ]; then
    grep -v "FRIDAY_RUNNING\|PROOT_ACTIVE\|Waking up Friday\|proot-distro login ubuntu\|friday_env\|F.R.I.D.A.Y. AUTO" "$BASHRC" > "$BASHRC.tmp" 2>/dev/null
    mv "$BASHRC.tmp" "$BASHRC"
fi

# Write the auto-start hook
cat >> "$BASHRC" << 'HOOKEOF'

# --- F.R.I.D.A.Y. AUTO-START ---
if [ -z "$FRIDAY_RUNNING" ]; then
    export FRIDAY_RUNNING=1

    # Sync API keys
    _MASTER="$HOME/.friday_env"
    _TARGET="/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/ubuntu/root/Clawbot/backend/.env"
    [ -f "$_MASTER" ] && cp "$_MASTER" "$_TARGET" 2>/dev/null

    echo "👋 Waking up Friday..."
    termux-wake-lock 2>/dev/null || true

    proot-distro login ubuntu -- bash -c '
        set +e
        cd /root/Clawbot || { echo "❌ Friday not installed. Run bootstrap-friday.sh first."; exit 1; }

        # Quick update
        git pull --no-edit 2>/dev/null || true

        cd backend
        . venv/bin/activate 2>/dev/null || {
            echo "⚡ Setting up environment..."
            python3 -m venv venv
            . venv/bin/activate
        }

        # Auto-install if packages are missing
        python3 -c "import uvicorn" 2>/dev/null || {
            echo "⚡ Installing missing packages..."
            pip install --no-cache-dir -r requirements.txt 2>/dev/null
        }

        # Start Friday
        cd /root/Clawbot
        chmod +x friday.sh
        exec ./friday.sh
    '
fi
HOOKEOF

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ F.R.I.D.A.Y. SETUP COMPLETE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}Close Termux and reopen it.${NC}"
echo -e "  Friday will start automatically every time."
echo ""
echo -e "  ${DIM}Or restart now by typing: exec bash${NC}"
echo ""
