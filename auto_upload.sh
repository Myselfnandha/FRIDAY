#!/bin/bash

# Auto Upload Script for Project ALAN
# 1. Sync Frontend Source -> Frontend Deployment Mirror
echo "🔄 Syncing frontend_alan to frontend_react..."
rm -rf frontend_react
cp -r frontend_alan frontend_react

# 2. Trigger Vercel Deployment (via GitHub Webhook)
echo "🚀 Preparing for Vercel Redeploy (via GitHub Push)..."
# We do NOT trigger 'vercel' CLI manually locally.
# The 'git push origin main' below will trigger Vercel automatically if connected.

echo "🚀 Pushing to Repositories..."

# 3. Commit changes locally
git add .
git commit -m "Update Project ALAN: Frontend & Backend"

# 4. Push Frontend (Monorepo root) to GitHub
# This ALSO triggers Vercel if the GitHub integration is active
echo "Pushing to GitHub (Frontend/Monorepo)..."
git push origin main

# 5. Push Backend to Hugging Face Spaces
echo "Pushing backend_alan to Hugging Face Spaces..."
git subtree push --prefix backend_alan space main

echo "✅ Deployment Complete!"
