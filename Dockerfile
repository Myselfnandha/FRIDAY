FROM python:3.11-slim-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m -u 1000 user

WORKDIR /app

# Copy the entire working directory (excluding .dockerignore files)
COPY --chown=user:user . .

# Switch to backend directory where the python app lives
WORKDIR /app/backend

# Install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Fix permissions
RUN chmod +x start.sh

# Switch to user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

EXPOSE 7860

CMD ["./start.sh"]
