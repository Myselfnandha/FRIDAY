#!/data/data/com.termux/files/usr/bin/bash
# ============================================
# F.R.I.D.A.Y. — Ubuntu (Proot) Setup
# The most reliable way to run Friday on Android
# ============================================

set -e

echo "🤖 F.R.I.D.A.Y. — Ubuntu/Proot Setup"
echo "======================================"

# --- 1. Install Proot-Distro ---
echo "📦 [1/4] Installing Proot-Distro in Termux..."
pkg update -confirm
pkg install -y proot-distro git cloudflared termux-services

# --- 2. Install Ubuntu ---
echo ""
echo "📦 [2/4] Installing Ubuntu (this may take a few mins)..."
if proot-distro list | grep -q "ubuntu.*installed"; then
    echo "✅ Ubuntu already installed."
else
    proot-distro install ubuntu
fi

# --- 3. Setup Friday inside Ubuntu ---
echo ""
echo "🐍 [3/4] Configuring Friday inside Ubuntu environment..."

# Commands to run INSIDE Ubuntu
UBUNTU_SETUP=$(cat << 'EOF'
apt update && apt upgrade -y
apt install -y python3 python3-pip python3-venv git
cd ~
if [ -d "friday" ]; then
    cd friday && git pull
else
    # Replace with your actual repo URL if needed
    git clone https://github.com/Myselfnandha/Clawbot.git friday
fi

cd ~/friday/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
# In Ubuntu aarch64, these wheels are officially supported!
echo "⚡ Installing Python dependencies in Ubuntu (Standard Wheels)..."
pip install --no-cache-dir -r requirements.txt
EOF
)

proot-distro login ubuntu -- bash -c "$UBUNTU_SETUP"

# --- 4. Create Start Script ---
echo ""
echo "🚀 [4/4] Creating the Ubuntu start script..."

cat > ../start-friday-ubuntu.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# This script starts Friday inside the Ubuntu proot environment

echo "Starting F.R.I.D.A.Y. (Ubuntu Mode)..."

# Release wake lock
termux-wake-lock 2>/dev/null || true

proot-distro login ubuntu -- bash -c "cd ~/friday && ./friday.sh"
EOF

chmod +x ../start-friday-ubuntu.sh

echo ""
echo "============================================"
echo "✅ Ubuntu Setup Complete!"
echo "============================================"
echo ""
echo "To start Friday in Ubuntu mode, run:"
echo "  ./start-friday-ubuntu.sh"
echo ""
