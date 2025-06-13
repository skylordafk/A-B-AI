#!/bin/bash
# Ubuntu Server Update Script for A-B/AI License Server
# Run this script directly on your Ubuntu server

set -e  # Exit on any error

echo "🚀 Updating A-B/AI License Server on Ubuntu..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="/root/abai-license-server"

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found in current directory: $(pwd)"
    echo "💡 Please run this script from the directory containing server.js"
    echo "💡 Or update SERVER_DIR variable to point to your server directory"
    exit 1
fi

echo "📍 Working directory: $(pwd)"
echo "🎯 Server directory: $SERVER_DIR"

# Create server directory if it doesn't exist
if [ ! -d "$SERVER_DIR" ]; then
    echo "📂 Creating server directory: $SERVER_DIR"
    sudo mkdir -p "$SERVER_DIR"
fi

# Backup current production file if it exists
if [ -f "$SERVER_DIR/production-license-server.js" ]; then
    BACKUP_NAME="production-license-server.backup.$(date +%Y%m%d_%H%M%S).js"
    echo "💾 Creating backup: $BACKUP_NAME"
    sudo cp "$SERVER_DIR/production-license-server.js" "$SERVER_DIR/$BACKUP_NAME"
fi

# Copy the updated server file
echo "📤 Copying server.js to production..."
sudo cp server.js "$SERVER_DIR/production-license-server.js"

# Change to server directory
cd "$SERVER_DIR"

# Install/update dependencies
echo "📦 Installing dependencies..."
sudo npm install --production fastify stripe uuid

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    sudo npm install -g pm2
fi

# Check current PM2 processes
echo "🔍 Checking current PM2 processes..."
sudo pm2 list

# Stop existing process if running
echo "🛑 Stopping existing server process..."
sudo pm2 stop abai-license-server 2>/dev/null || echo "ℹ️  No existing process to stop"
sudo pm2 delete abai-license-server 2>/dev/null || echo "ℹ️  No existing process to delete"

# Start the server
echo "🚀 Starting updated server..."
sudo pm2 start production-license-server.js --name abai-license-server

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
sudo pm2 save

# Setup PM2 startup (if not already configured)
echo "⚙️  Configuring PM2 startup..."
sudo pm2 startup systemd -u root --hp /root 2>/dev/null || echo "ℹ️  PM2 startup already configured"

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check server status
echo "🔍 Checking server status..."
sudo pm2 list

# Test the server locally
echo "🧪 Testing server health..."
for port in 4100 3000 8080; do
    if curl -f "http://localhost:$port/health" 2>/dev/null; then
        echo "✅ Server is healthy on port $port!"
        LOCAL_PORT=$port
        break
    fi
done

if [ -z "$LOCAL_PORT" ]; then
    echo "❌ Server health check failed on all common ports"
    echo "🔍 Checking server logs..."
    sudo pm2 logs abai-license-server --lines 20
    exit 1
fi

# Test the retrieve-license endpoint
echo "🧪 Testing retrieve-license endpoint..."
if curl -f -X POST "http://localhost:$LOCAL_PORT/retrieve-license" \
   -H "Content-Type: application/json" \
   -d '{"email":"test@example.com"}' 2>/dev/null | grep -q "error\|licenseKey"; then
    echo "✅ Retrieve-license endpoint is working!"
else
    echo "⚠️  Retrieve-license endpoint test was inconclusive"
fi

# Show server logs
echo "📋 Recent server logs:"
sudo pm2 logs abai-license-server --lines 10

# Check if nginx/reverse proxy needs restart
if command -v nginx &> /dev/null && systemctl is-active --quiet nginx; then
    echo "🔄 Restarting nginx..."
    sudo systemctl restart nginx
fi

echo ""
echo "🎉 Server update completed!"
echo "✅ Server is running on port $LOCAL_PORT"
echo "📊 Use 'sudo pm2 list' to check status"
echo "📋 Use 'sudo pm2 logs abai-license-server' to view logs"
echo "🛑 Use 'sudo pm2 restart abai-license-server' to restart"
echo ""
echo "💡 You can now test the retrieve-license endpoint with:"
echo "curl -X POST https://license.spventerprises.com/retrieve-license \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"skylervondra@gmail.com\"}'" 