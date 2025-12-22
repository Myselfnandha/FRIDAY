FROM python:3.11-slim-bookworm
ENV PYTHONUNBUFFERED=1

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
# Backend deps
# =========================
WORKDIR /app/backend
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
      torch torchvision torchaudio \
      --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt


# =========================
# Runtime
# =========================
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

EXPOSE 7860

CMD ["bash", "start.sh"]
