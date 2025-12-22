FROM python:3.11-slim-bookworm
ENV PYTHONUNBUFFERED=1

# =========================
# System dependencies
# =========================
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# =========================
# User (HF best practice)
# =========================
RUN useradd -m -u 1000 user
WORKDIR /app

# =========================
# Copy backend only
# =========================
COPY --chown=user:user backend ./backend
COPY --chown=user:user requirements.txt ./backend/requirements.txt

# =========================
# Python dependencies (HF-SAFE ORDER)
# =========================
WORKDIR /app/backend

# 1️⃣ Upgrade pip (alone)
RUN pip install --no-cache-dir --upgrade pip

# 2️⃣ Install Torch FIRST (PINNED, CPU-only)
RUN pip install --no-cache-dir \
    torch==2.1.2+cpu \
    torchvision==0.16.2+cpu \
    torchaudio==2.1.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# 3️⃣ Install remaining deps (isolated)
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# =========================
# Runtime
# =========================
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

EXPOSE 7860

CMD ["bash", "start.sh"]
