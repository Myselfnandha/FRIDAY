FROM python:3.11-slim-bookworm
ENV REBUILD_TRIGGER=3

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Create user
RUN useradd -m -u 1000 user

WORKDIR /app

# Copy the entire working directory
COPY --chown=user:user . .

# Build Frontend
WORKDIR /app/frontend_react
RUN npm install
RUN npm run build

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
