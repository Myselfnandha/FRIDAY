FROM python:3.11-bookworm
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# =========================
# System dependencies
# =========================
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# =========================
# User
# =========================
RUN useradd -m -u 1000 user
WORKDIR /app

# =========================
# Copy backend only
# =========================
COPY --chown=user:user backend ./backend
COPY --chown=user:user requirements.txt ./backend/requirements.txt

# =========================
# Backend deps
# =========================
WORKDIR /app/backend

# Torch (CPU wheels)
RUN python -m pip install --no-cache-dir \
    torch==2.1.2+cpu \
    torchvision==0.16.2+cpu \
    torchaudio==2.1.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Remaining deps (binary wheels resolve correctly here)
RUN python -m pip install --no-cache-dir -r requirements.txt

# =========================
# Runtime
# =========================
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

EXPOSE 7860
CMD ["bash", "start.sh"]
