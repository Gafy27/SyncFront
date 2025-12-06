#!/bin/bash

# EC2 Setup Script for SyncAdminConsole
# This script helps set up the environment variables for EC2 deployment

set -e

echo "=== SyncAdminConsole EC2 Setup ==="
echo ""

# Get EC2 public IP
echo "Detecting EC2 public IP..."
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")

if [ -z "$EC2_PUBLIC_IP" ]; then
    echo "Could not auto-detect EC2 public IP. Please enter it manually:"
    read -p "EC2 Public IP: " EC2_PUBLIC_IP
else
    echo "Detected EC2 Public IP: $EC2_PUBLIC_IP"
    read -p "Use this IP? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        read -p "Enter EC2 Public IP: " EC2_PUBLIC_IP
    fi
fi

echo ""
echo "Setting up environment files..."

# Root .env file
if [ ! -f .env ]; then
    cat > .env << EOF
# Frontend Server Configuration
PORT=5000

# Sync API Configuration
SYNC_API_URL=http://localhost:3000

# Frontend API URL
VITE_API_URL=http://${EC2_PUBLIC_IP}:3000
EOF
    echo "Created .env file in root directory"
else
    echo ".env file already exists. Please update VITE_API_URL manually:"
    echo "  VITE_API_URL=http://${EC2_PUBLIC_IP}:3000"
fi

# SyncAPI .env file
if [ ! -f SyncAPI/.env ]; then
    cat > SyncAPI/.env << EOF
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017

# Server Configuration
PORT=3000

# CORS Configuration
CORS_ALLOWED_ORIGIN=http://${EC2_PUBLIC_IP}:5000

# Organization ID
ORGANIZATION_ID=autentiodev
EOF
    echo "Created SyncAPI/.env file"
else
    echo "SyncAPI/.env file already exists. Please update CORS_ALLOWED_ORIGIN manually:"
    echo "  CORS_ALLOWED_ORIGIN=http://${EC2_PUBLIC_IP}:5000"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Review and update the .env files if needed"
echo "2. Install dependencies: npm install && cd SyncAPI && npm install && cd .."
echo "3. Build the application: npm run build && cd SyncAPI && npm run build && cd .."
echo "4. Start services with PM2:"
echo "   - cd SyncAPI && pm2 start dist/server.js --name sync-api && cd .."
echo "   - pm2 start dist/index.js --name sync-admin"
echo ""
echo "Access your application at: http://${EC2_PUBLIC_IP}:5000"

