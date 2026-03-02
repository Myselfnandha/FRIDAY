#!/data/data/com.termux/files/usr/bin/bash
# ============================================
# F.R.I.D.A.Y. — Termux One-Time Setup
# Run this ONCE on your Android phone
# ============================================

set -e

echo "🤖 F.R.I.D.A.Y. — Termux Setup"
echo "================================"

# --- 1. Update Termux ---
echo ""
echo "📦 [1/5] Updating Termux packages..."
pkg update -y
pkg upgrade -y

# --- 2. Install Dependencies ---
echo ""
echo "📦 [2/5] Installing Python, Git, and Cloudflare..."
# Native build tools (rust, clang) removed to save space/time since we'll use pre-built wheels
pkg install -y python git cloudflared termux-services

# Keep Termux awake in background
termux-wake-lock 2>/dev/null || true

# --- 3. Clone Project ---
echo ""
echo "📥 [3/5] Cloning Friday..."
FRIDAY_DIR="$HOME/friday"

if [ -d "$FRIDAY_DIR" ]; then
    echo "Project exists. Updating..."
    cd "$FRIDAY_DIR" && git pull 2>/dev/null || true
else
    echo "Enter your GitHub repo URL:"
    read -r REPO_URL
    if [ -z "$REPO_URL" ]; then
        echo "❌ No URL provided. You can manually clone later:"
        echo "   git clone <your-repo> ~/friday"
        exit 1
    fi
    git clone "$REPO_URL" "$FRIDAY_DIR"
fi

# --- 4. Install Python Dependencies ---
echo ""
echo "🐍 [4/5] Installing Python packages (ULTRA-FAST MODE)..."
cd "$FRIDAY_DIR/backend"

python -m venv venv 2>/dev/null || python -m ensurepip
source venv/bin/activate || . venv/bin/activate

# Upgrade pip for better wheel support
pip install --upgrade pip

# ULTRA-FAST: Direct wheel install from a known-good Termux/Android build
# This bypasses compilation entirely. It targets Python 3.12 on aarch64 (most common for modern phones)
echo "⚡ Downloading pre-compiled native extensions (Instant)..."
PYTHON_VERSION=$(python -c 'import sys; print(f"{sys.version_info.major}{sys.version_info.minor}")')
WHEEL_URL="https://github.com/Eutalix/android-pydantic-core/releases/download/v2.27.2/pydantic_core-2.27.2-cp${PYTHON_VERSION}-cp${PYTHON_VERSION}-android_aarch64.whl"

pip install "$WHEEL_URL" || {
    echo "⚠️ Direct wheel failed. Falling back to community index..."
    pip install --no-cache-dir pydantic-core --extra-index-url https://pypi.debian.net/pydantic-core/
}

# Now install the rest of the requirements
pip install --no-cache-dir -r requirements.txt

# --- 5. Configure API Keys ---
echo ""
echo "🔑 [5/5] Configuring API keys..."

if [ ! -f .env ] || ! grep -q "GROQ_API_KEY=." .env; then
    echo ""
    read -p "Enter GROQ_API_KEY: " GROQ_KEY
    read -p "Enter GOOGLE_API_KEY: " GOOGLE_KEY
    read -p "Enter your name (default: Alan): " USER_NAME
    USER_NAME=${USER_NAME:-Alan}

    cat > .env << EOF
GROQ_API_KEY=$GROQ_KEY
GOOGLE_API_KEY=$GOOGLE_KEY
FRIDAY_USER_NAME=$USER_NAME
FRIDAY_USER_ID=$(echo "$USER_NAME" | tr '[:upper:]' '[:lower:]')
HOST=0.0.0.0
PORT=8000
EOF
    echo "✅ API keys saved"
else
    echo "✅ .env already configured"
fi

# --- Make friday.sh executable ---
chmod +x "$FRIDAY_DIR/friday.sh" 2>/dev/null || true

echo ""
echo "============================================"
echo "✅ Setup complete!"
echo "============================================"
echo ""
echo "To start Friday, run:"
echo "  cd ~/friday && ./friday.sh"
echo ""
