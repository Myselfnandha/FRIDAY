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
echo "📦 [2/5] Installing Python, Git, Cloudflare, and Build Tools..."
# Added clang, rust, and make for native extension building (pydantic-core, etc.)
pkg install -y python git cloudflared termux-services clang rust make

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
echo "🐍 [4/5] Installing Python packages..."
cd "$FRIDAY_DIR/backend"

python -m venv venv 2>/dev/null || python -m ensurepip
source venv/bin/activate || . venv/bin/activate

# Install pydantic-core specifically first as it often needs compilation
echo "⚡ Building native extensions (this may take a few minutes)..."
pip install --no-cache-dir pydantic-core

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
