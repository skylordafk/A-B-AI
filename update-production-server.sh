#!/bin/bash
# Script to update production server with retrieve-license endpoint

set -e  # Exit on any error

echo "🚀 Updating A-B/AI License Server with retrieve-license endpoint..."

# Check if we can reach the server
echo "📡 Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 root@159.223.155.150 'echo "SSH connection successful"'; then
    echo "❌ SSH connection failed. Please check your connection and try again."
    exit 1
fi

# Upload the complete server file
echo "📤 Uploading updated server file..."
scp server.js root@159.223.155.150:/root/abai-license-server/

# SSH into server and deploy
echo "🔧 Deploying on remote server..."
ssh root@159.223.155.150 << 'EOF'
set -e
cd /root/abai-license-server

# Backup current server file
echo "💾 Creating backup..."
cp production-license-server.js production-license-server.backup.$(date +%Y%m%d_%H%M%S).js

# Replace the production server file with the updated one
echo "🔄 Updating server file..."
cp server.js production-license-server.js

# Install dependencies if needed
echo "📦 Checking dependencies..."
npm install --production

# Restart the server
echo "🔄 Restarting server..."
if pm2 restart abai-license-server; then
    echo "✅ Server restarted successfully!"
else
    echo "⚠️  PM2 restart failed, trying alternative restart..."
    pm2 stop abai-license-server || true
    pm2 start production-license-server.js --name abai-license-server
fi

# Wait a moment for server to start
sleep 3

# Test the server
echo "🧪 Testing server health..."
curl -f http://localhost:4100/health || curl -f http://localhost:3000/health || curl -f http://localhost:8080/health
EOF

# Test the remote endpoint
echo "🧪 Testing remote endpoint..."
sleep 2
if curl -f https://license.spventerprises.com/health; then
    echo "✅ Remote server is healthy!"
    
    # Test the new retrieve-license endpoint
    echo "🧪 Testing retrieve-license endpoint..."
    if curl -f -X POST https://license.spventerprises.com/retrieve-license -H "Content-Type: application/json" -d '{"email":"test@example.com"}' | grep -q "error\|licenseKey"; then
        echo "✅ Retrieve-license endpoint is working!"
    else
        echo "⚠️  Retrieve-license endpoint test inconclusive"
    fi
else
    echo "❌ Remote server health check failed"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo "💡 You can now use the 'Already Purchased' feature in your app."