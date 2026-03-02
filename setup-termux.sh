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
pkg install -y python git cloudflared termux-services

# FASTEST FIX: Add Termux User Repository (TUR) which has pre-built Pydantic binaries
echo "⚡ Adding Termux User Repository for pre-built binaries..."
pkg install -y tur-repo
pkg update -y
pkg install -y python-pydantic

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
echo "🐍 [4/5] Installing Python packages (NATIVE MODE)..."
cd "$FRIDAY_DIR/backend"

# Create venv with system site-packages included (so we use the fast pkg install version)
python -m venv --system-site-packages venv 2>/dev/null || python -m ensurepip
source venv/bin/activate || . venv/bin/activate

# Upgrade pip
pip install --upgrade pip

echo "⚡ Linking native pydantic-core..."
# Verify it's working
python -c "import pydantic_core; print('✅ pydantic-core found')" || {
    echo "⚠️ System pydantic not found, attempting last resort..."
    pip install pydantic-core --extra-index-url https://pypi.debian.net/pydantic-core/
}

# Now install the rest (avoiding pydantic/pydantic-core re-build)
grep -vE "pydantic|pydantic-core" requirements.txt > requirements_fast.txt
pip install --no-cache-dir -r requirements_fast.txt
rm requirements_fast.txt

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
