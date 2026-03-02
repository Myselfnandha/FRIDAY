# Deploy Friday from Android (Termux + Cloudflare Tunnel)

## What This Does

Turn your Android phone into a portable AI server. One command starts Friday, exposes it to the internet, and gives you a public URL accessible from any device.

```
┌──────────────────────────────────────┐
│  Your Android Phone (Termux)         │
│                                      │
│  ./friday.sh                         │
│    ├── git pull (latest code)        │
│    ├── python main.py (backend)      │
│    └── cloudflared tunnel            │
│          ↓                           │
│    https://abc-xyz.trycloudflare.com │
│          ↓                           │
│    Open from ANY browser, ANY device │
└──────────────────────────────────────┘
```

---

## One-Time Setup (5 min)

### 1. Install Termux

Download **Termux** from [F-Droid](https://f-droid.org/en/packages/com.termux/) (NOT from Play Store — it's outdated there).

### 2. Run Setup Script

Open Termux and paste:

```bash
# Allow storage access
termux-setup-storage

# Download and run setup
pkg install -y git
git clone <your-github-repo-url> ~/friday
cd ~/friday
chmod +x setup-termux.sh friday.sh
./setup-termux.sh
```

The script will:
- Install Python, Git, Cloudflared
- Clone your Friday repo
- Install Python dependencies
- Ask for your API keys (GROQ + GOOGLE)

### 3. Disable Battery Optimization for Termux

Go to **Settings → Apps → Termux → Battery → Unrestricted**

This prevents Android from killing Termux in the background.

---

## Daily Usage

### Start Friday
```bash
cd ~/friday && ./friday.sh
```

Output:
```
  ███████╗██████╗ ██╗██████╗  █████╗ ██╗   ██╗
  ...

[1/3] Pulling latest from GitHub...
  ✅ Code updated
[2/3] Starting Friday backend...
  ✅ Backend running (PID: 12345)
[3/3] Opening Cloudflare Tunnel...

============================================
  ✅ F.R.I.D.A.Y. is ONLINE
============================================

  Look above for your public URL:
  (Something like https://abc-xyz.trycloudflare.com)

  Open that URL in any browser on any device

  Press Ctrl+C to stop Friday
```

### Stop Friday
Press `Ctrl+C` in Termux. Everything shuts down cleanly.

### Update Code
Just push to GitHub from your PC. Next time you run `./friday.sh`, it auto-pulls the latest.

---

## Tips

### Get a Fixed URL (Optional)
The free `trycloudflare.com` URL changes each time. For a fixed URL:

1. Create free Cloudflare account at [cloudflare.com](https://cloudflare.com)
2. Add a free domain (or use a subdomain)
3. Create a named tunnel:
```bash
cloudflared tunnel login
cloudflared tunnel create friday
cloudflared tunnel route dns friday friday.yourdomain.com
```

### Keep Running in Background
```bash
# Run Friday, then press Ctrl+A then D to detach
pkg install tmux
tmux new -s friday
./friday.sh
# Press Ctrl+B then D to detach
# To reattach: tmux attach -t friday
```

### Auto-Start on Boot (Optional)
Install `Termux:Boot` from F-Droid, then:
```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/friday.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/friday && ./friday.sh
EOF
chmod +x ~/.termux/boot/friday.sh
```

---

## Workflow

```
1. Push code from PC → GitHub
2. Open Termux on phone → ./friday.sh
3. Get public URL → open in any browser
4. Chat with Friday 🎉
5. Done? → Ctrl+C to stop
```

**Total cost: $0. Forever.**
