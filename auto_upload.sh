#!/bin/bash

# Auto Upload Script for Project ALAN
# 1. Sync Frontend Source -> Frontend Deployment Mirror
echo "🔄 Syncing frontend_alan to frontend_react..."
# Use tar to exclude heavy folders (works everywhere, no rsync needed)
mkdir -p frontend_react
# Clean destination but keep the dir
find frontend_react -mindepth 1 -delete
tar -cf - --exclude='node_modules' --exclude='.next' --exclude='out' --exclude='.git' --exclude='.vercel' -C frontend_alan . | tar -xf - -C frontend_react

# 2. Trigger Vercel Deployment (via GitHub Webhook)


echo "🚀 Pushing to Repositories..."

# 3. Commit changes locally
git add .
git commit -m "Update Project ALAN "

# 4. Push Frontend (Monorepo root) to GitHub
# This ALSO triggers Vercel if the GitHub integration is active
echo "Pushing to GitHub (Frontend/Monorepo)..."
git push origin main

# 5. Push Backend to Hugging Face Spaces
echo "Pushing backend_alan to Hugging Face Spaces..."
git subtree push --prefix backend_alan space main

echo "Deployment Complete! ✅ "
