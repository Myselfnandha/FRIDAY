FROM python:3.11-slim

# Install system deps (if needed for audio handling)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create user to run as non-root (HF Security)
RUN useradd -m -u 1000 user
User user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

CMD ["python", "agent.py", "start"]
