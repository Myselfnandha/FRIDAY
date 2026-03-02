#!/bin/bash
# ============================================
# F.R.I.D.A.Y. — Oracle Cloud Deployment Script
# Run this on your Oracle Cloud ARM VM
# ============================================

set -e

echo "🤖 F.R.I.D.A.Y. Deployment Script"
echo "=================================="

# --- 1. System Setup ---
echo ""
echo "📦 [1/6] Installing system packages..."
sudo apt update -y
sudo apt install -y python3 python3-pip python3-venv git nginx certbot python3-certbot-nginx

# --- 2. Clone Project ---
echo ""
echo "📥 [2/6] Setting up project..."
PROJECT_DIR="$HOME/friday"

if [ -d "$PROJECT_DIR" ]; then
    echo "Project directory exists. Pulling latest..."
    cd "$PROJECT_DIR" && git pull 2>/dev/null || true
else
    echo "Enter your Git repo URL (or press Enter to copy files manually):"
    read -r GIT_URL
    if [ -n "$GIT_URL" ]; then
        git clone "$GIT_URL" "$PROJECT_DIR"
    else
        mkdir -p "$PROJECT_DIR"
        echo "⚠️  Copy your project files to $PROJECT_DIR manually, then re-run."
        exit 0
    fi
fi

cd "$PROJECT_DIR"

# --- 3. Backend Setup ---
echo ""
echo "🐍 [3/6] Setting up backend..."
cd "$PROJECT_DIR/backend"

python3 -m venv venv
./venv/bin/pip install --no-cache-dir -r requirements.txt

# Check .env
if [ ! -f .env ] || ! grep -q "GROQ_API_KEY=." .env; then
    echo ""
    echo "⚠️  Configure your API keys:"
    echo ""
    
    read -p "Enter GROQ_API_KEY: " GROQ_KEY
    read -p "Enter GOOGLE_API_KEY: " GOOGLE_KEY
    read -p "Enter your name (default: Boss): " USER_NAME
    USER_NAME=${USER_NAME:-Boss}
    
    cat > .env << EOF
GROQ_API_KEY=$GROQ_KEY
GOOGLE_API_KEY=$GOOGLE_KEY
FRIDAY_USER_NAME=$USER_NAME
FRIDAY_USER_ID=$(echo "$USER_NAME" | tr '[:upper:]' '[:lower:]')
HOST=0.0.0.0
PORT=8000
EOF
    echo "✅ .env configured"
fi

# --- 4. Frontend Build ---
echo ""
echo "🎨 [4/6] Building frontend..."
cd "$PROJECT_DIR/frontend"

if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

npm install
npm run build

# --- 5. Systemd Service ---
echo ""
echo "⚙️  [5/6] Creating systemd service..."

sudo tee /etc/systemd/system/friday-backend.service > /dev/null << EOF
[Unit]
Description=FRIDAY AI Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=$PROJECT_DIR/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3
Environment=PATH=$PROJECT_DIR/backend/venv/bin:/usr/local/bin:/usr/bin

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable friday-backend
sudo systemctl restart friday-backend
echo "✅ Backend service started"

# --- 6. Nginx Reverse Proxy ---
echo ""
echo "🌐 [6/6] Configuring Nginx..."

PUBLIC_IP=$(curl -s ifconfig.me)

sudo tee /etc/nginx/sites-available/friday > /dev/null << EOF
server {
    listen 80;
    server_name $PUBLIC_IP;

    # Frontend (static build)
    root $PROJECT_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/friday /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# --- Done ---
echo ""
echo "============================================"
echo "✅ F.R.I.D.A.Y. deployed successfully!"
echo "============================================"
echo ""
echo "🌐 Open in browser: http://$PUBLIC_IP"
echo ""
echo "📋 Useful commands:"
echo "  sudo systemctl status friday-backend   # Check status"
echo "  sudo journalctl -u friday-backend -f   # View logs"
echo "  sudo systemctl restart friday-backend   # Restart"
echo ""
