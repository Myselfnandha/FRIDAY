# Oracle Cloud Deployment Guide

## Step 1: Create Oracle Cloud Account (5 min)

1. Go to [cloud.oracle.com](https://cloud.oracle.com)
2. Click **Sign Up** → Create a free account
3. Enter credit card (verification only — **you will NOT be charged**)
4. Select home region closest to you (e.g., `ap-mumbai-1` for India)

## Step 2: Create Always Free VM (5 min)

1. Go to **Compute** → **Instances** → **Create Instance**
2. Configure:
   - **Name:** `friday`
   - **Image:** Ubuntu 22.04 (or 24.04)
   - **Shape:** Click **Change Shape** →
     - **Ampere** (ARM) → `VM.Standard.A1.Flex`
     - **OCPUs:** 4, **Memory:** 24 GB
     - ✅ This is the **Always Free** shape
   - **Networking:** Create new VCN, allow public IP
   - **SSH Key:** Upload your public key or paste it
3. Click **Create**
4. Wait ~2 minutes for it to boot

## Step 3: Open Firewall Ports

1. Go to your instance → **Subnet** → **Security List**
2. Add **Ingress Rules:**
   - Port **80** (HTTP) — Source: `0.0.0.0/0`
   - Port **443** (HTTPS) — Source: `0.0.0.0/0`

3. Also open the OS firewall on the VM:
```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## Step 4: Deploy Friday (5 min)

### Option A: Git Clone + Run Script
```bash
# SSH into your VM
ssh ubuntu@<your-vm-public-ip>

# Clone your repo
git clone <your-repo-url> ~/friday

# Run the deploy script
cd ~/friday
chmod +x deploy.sh
./deploy.sh
```

### Option B: SCP Files + Run Script
```bash
# From your local machine
scp -r /home/alan/Desktop/Clawbot ubuntu@<your-vm-public-ip>:~/friday

# SSH into VM
ssh ubuntu@<your-vm-public-ip>

# Run deploy
cd ~/friday
chmod +x deploy.sh
./deploy.sh
```

## Step 5: Access Friday

Open your browser: `http://<your-vm-public-ip>`

That's it! 🎉

---

## Optional: Add HTTPS (Free SSL)

```bash
# On the VM — replace with your domain
sudo certbot --nginx -d your-domain.com
```

## Optional: Add a Free Domain

1. Get a free domain from [freenom.com](https://freenom.com) or use [duckdns.org](https://duckdns.org)
2. Point it to your Oracle VM's public IP
3. Run certbot for HTTPS

---

## Management Commands

```bash
# View backend logs
sudo journalctl -u friday-backend -f

# Restart backend
sudo systemctl restart friday-backend

# Check status
sudo systemctl status friday-backend

# Update code & redeploy
cd ~/friday && git pull
cd backend && ./venv/bin/pip install -r requirements.txt
cd ../frontend && npm run build
sudo systemctl restart friday-backend
```

## Architecture on Oracle Cloud

```
Internet → Oracle Cloud VM (Always Free)
              │
              ├── Nginx (port 80)
              │     ├── / → Frontend static files (dist/)
              │     ├── /ws → Backend WebSocket (port 8000)
              │     └── /api → Backend REST API (port 8000)
              │
              ├── FastAPI Backend (systemd service, auto-restart)
              │     ├── Groq LLM + Whisper STT (API)
              │     ├── Edge TTS (free, no key)
              │     ├── Gemini Vision (API)
              │     ├── Mem0 + Qdrant (local file storage)
              │     └── DDG Search
              │
              └── Data
                    └── ~/friday/data/qdrant_local/ (persistent memories)
```

**Total cost: $0/month, forever.**
