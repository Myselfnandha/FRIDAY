# --- Stage 1: Build Frontend ---
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend_alan/package.json frontend_alan/package-lock.json ./
RUN npm ci
COPY frontend_alan/ .
RUN npm run build

# --- Stage 2: Python Backend ---
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m -u 1000 user

WORKDIR /app

# Copy Python requirements
COPY --chown=user:user backend_alan/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Source Code
COPY --chown=user:user backend_alan/ .

# Copy Frontend Build from Stage 1 to /app/public
COPY --chown=user:user --from=frontend-builder /app/out /app/public

# Grant permissions for SQLite
RUN chmod -R 777 /app

# Switch to user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

CMD ["python", "agent.py", "start"]
