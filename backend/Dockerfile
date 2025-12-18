# Base image with Python
FROM python:3.11-slim-bookworm

# Install system dependencies (ffmpeg is crucial for audio processing)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN useradd -m -u 1000 user

# Set working directory
WORKDIR /app

# Ensure the user owns the directory
RUN chown user:user /app

# Copy requirements first for cache capability
COPY --chown=user:user requirements.txt .

# Install dependencies (as root, global)
# We keep this as root so they are globally installed.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application with correct ownership
COPY --chown=user:user . .

# Make start script executable (it is now owned by user, but doing it as root before switch is safer)
RUN chmod +x start.sh

# Switch to the user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Expose the port for HF Spaces
EXPOSE 7860

# Command to run the agent and server
CMD ["./start.sh"]
