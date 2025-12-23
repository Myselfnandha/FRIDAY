#!/bin/bash

# Auto Upload Script for Project ALAN

echo "🚀 Starting Deployment..."

# 1. Commit changes locally
git add .
git commit -m "Update Project ALAN: Frontend & Backend"

# 2. Push Frontend (Monorepo root) to GitHub
echo "Pushing to GitHub (Frontend/Monorepo)..."
git push origin main

# 3. Push Backend to Hugging Face Spaces
# We need to sync the backend_alan folder to the HF remote
echo "Pushing backend_alan to Hugging Face Spaces..."

# If HF remote is not set, instructions:
# git remote add space https://huggingface.co/spaces/Myselfnandha/ALAN-V2

# We push only the backend_alan folder content to the HF root
# Using git subtree is safest
git subtree push --prefix backend_alan space main

echo "✅ Deployment Complete!"
