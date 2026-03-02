#!/data/data/com.termux/files/usr/bin/bash
# ========================================================
# F.R.I.D.A.Y. ULTRA-AUTOMATION (Termux + Ubuntu Proot)
# One script to rule them all. 
# ========================================================

set -e

echo "🦾 F.R.I.D.A.Y. - System Initialization..."

# --- 1. Termux Host Prep ---
echo "📦 [1/4] Ensuring Termux is up to date..."
pkg update -y
pkg install -y proot-distro git cloudflared termux-services

# Install Ubuntu if missing
if ! proot-distro list | grep -q "ubuntu.*installed"; then
    echo "🌐 Installing Ubuntu environment (Proot)..."
    proot-distro install ubuntu
fi

termux-wake-lock 2>/dev/null || true

# --- 2. Create the Autostart Logic INSIDE Ubuntu ---
echo "🐍 [2/4] Injecting automation logic into Ubuntu..."

# Correct paths for copying .env from Host to Guest
TERMUX_ENV="$HOME/friday/backend/.env"
UBUNTU_ENV_DIR="/data/data/com.termux/files/usr/var/lib/proot-distro/installed-rootfs/ubuntu/root/friday/backend"

if [ -f "$TERMUX_ENV" ]; then
    echo "🔑 Copying API keys from Termux to Ubuntu..."
    mkdir -p "$UBUNTU_ENV_DIR"
    cp "$TERMUX_ENV" "$UBUNTU_ENV_DIR/.env"
fi

UBUNTU_SCRIPT=$(cat << 'EOF'
set -e
# Update Ubuntu packages
apt update && apt upgrade -y
apt install -y python3 python3-pip python3-venv git

cd ~
# Clone or Update Repo
if [ ! -d "friday" ]; then
    echo "📥 Cloning Friday from GitHub..."
    git clone https://github.com/Myselfnandha/Clawbot.git friday
fi

cd ~/friday
echo "🔄 Fetching latest updates..."
GIT_STATUS=$(git pull)

# Setup Venv if missing
cd backend
if [ ! -d "venv" ]; then
    echo "🐍 Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip

# SMART INSTALL: Install if git updated OR if venv is empty/broken
if [[ "$GIT_STATUS" != "Already up to date." ]] || ! pip show uvicorn >/dev/null 2>&1; then
    echo "⚡ Ensuring all dependencies are installed..."
    pip install --no-cache-dir -r requirements.txt
fi

# Start Friday via the universal script
cd ..
chmod +x friday.sh
./friday.sh
EOF
)

# Save this script INSIDE Ubuntu for persistence
proot-distro login ubuntu -- bash -c "cat > ~/autostart.sh << 'AUTOSCRIPT'
$UBUNTU_SCRIPT
AUTOSCRIPT
chmod +x ~/autostart.sh"

# --- 3. Hook into Termux Shell Start ---
echo "🔗 [3/4] Hooking Friday into Termux login (.bashrc)..."

BASHRC="$HOME/.bashrc"
if ! grep -q "proot-distro login ubuntu" "$BASHRC"; then
    cat >> "$BASHRC" << 'EOF'

# --- F.R.I.D.A.Y. AUTO-WAKE ---
if [ -z "$PROOT_ACTIVE" ]; then
    export PROOT_ACTIVE=1
    echo "👋 Waking up Friday..."
    proot-distro login ubuntu -- bash -c "~/autostart.sh"
fi
EOF
fi

echo ""
echo "============================================"
echo "✅ F.R.I.D.A.Y. IS NOW SELF-REPLICATING"
echo "============================================"
echo "From now on, just open Termux. Friday handles:"
echo "1. Git Pull (Update check)"
echo "2. Pip Install (Auto-dependency update)"
echo "3. Backend Start & Cloudflare Tunnel"
echo ""
echo "Closing this shell and restarting Friday..."
exec bash
