FROM python:3.11-slim-bookworm
ENV REBUILD_TRIGGER=3
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
# Node.js (Frontend build)
# =========================
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# =========================
# User (HF best practice)
# =========================
RUN useradd -m -u 1000 user

WORKDIR /app

# =========================
# Copy project
# =========================
COPY --chown=user:user . .

# =========================
# Frontend build
# =========================
WORKDIR /app/frontend_react
RUN npm install
RUN npm run build

# =========================
# Backend setup
# =========================
WORKDIR /app/backend

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
      torch torchvision torchaudio \
      --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# =========================
# Permissions
# =========================
RUN chmod +x start.sh

# =========================
# Runtime
# =========================
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

EXPOSE 7860

CMD ["./start.sh"]
