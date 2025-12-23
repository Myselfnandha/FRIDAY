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

# Copy source code
COPY --chown=user:user . .

# Grant full permissions to app directory for SQLite (DB + Journal files)
RUN chmod -R 777 /app

# Switch to user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

CMD ["python", "agent.py", "start"]
