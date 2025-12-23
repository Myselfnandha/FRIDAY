FROM python:3.11-slim

# Install system deps (if needed for audio handling)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create user first
RUN useradd -m -u 1000 user

WORKDIR /app

# Copy requirements
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code with ownership
COPY --chown=user:user . .
# Pre-create database file with permissions
RUN touch /app/alan_memory.db && \
    chown user:user /app/alan_memory.db && \
    chmod 664 /app/alan_memory.db

# Switch to user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

CMD ["python", "agent.py", "start"]
