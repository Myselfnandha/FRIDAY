#!/bin/bash

# Define paths
ENV_FILE="backend/.env"

echo "Reading configuration from $ENV_FILE..."

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found."
    exit 1
fi

# Export variables from .env (ignoring comments)
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Check if HF_TOKEN is set
if [ -z "$HF_TOKEN" ]; then
    echo "Error: HF_TOKEN not found in $ENV_FILE"
    exit 1
fi

echo "Staging and Committing all changes..."
git add .
git commit -m "Update from Alan Agent"

echo "Configuring Hugging Face Remote..."
git remote remove space 2>/dev/null
git remote add space https://nandhaalagesan248:$HF_TOKEN@huggingface.co/spaces/nandhaalagesan248/FRIDAY

echo "Pushing to Hugging Face Space (Force Push)..."
git push --force space main

echo "Pushing to GitHub (Origin)..."
git push origin main

echo "Done."
