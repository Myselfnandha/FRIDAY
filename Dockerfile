FROM python:3.11-slim-bookworm
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# =========================
# System deps
# =========================
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
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
# Backend deps (HF SAFE)
# =========================
WORKDIR /app/backend

# 1️⃣ Install Torch ONLY (pinned, CPU)
RUN python -m pip install \
    --no-cache-dir \
    --only-binary=:all: \
    -r requirements.txt


# 2️⃣ Install remaining deps
RUN python -m pip install -vvv --no-cache-dir --no-build-isolation -r requirements.txt

# =========================
# Runtime
# =========================
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

EXPOSE 7860
CMD ["bash", "start.sh"]
