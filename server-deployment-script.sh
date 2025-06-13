#!/bin/bash

# A-B/AI License Server Deployment Script
# Run this on your fresh Ubuntu server

set -e  # Exit on any error

echo "🚀 Starting A-B/AI License Server deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install nginx
echo "📦 Installing nginx..."
apt install -y nginx

# Install UFW firewall
echo "📦 Setting up firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

# Create project directory
echo "📁 Creating project directory..."
mkdir -p /root/abai-license-server
cd /root/abai-license-server

# Create package.json
echo "📄 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "abai-license-server",
  "version": "1.0.0",
  "description": "A-B/AI License Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "fastify": "^4.24.3",
    "stripe": "^14.5.0",
    "uuid": "^9.0.1"
  }
}
EOF

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create environment file template
echo "📄 Creating environment file..."
cat > .env << 'EOF'
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Server Configuration
PORT=4100
NODE_ENV=production

# Admin API Key (generate a random key)
ADMIN_API_KEY=your_admin_api_key_here
EOF

# Create nginx configuration
echo "🌐 Configuring nginx..."
cat > /etc/nginx/sites-available/abai-license << 'EOF'
server {
    listen 80;
    server_name license.spventerprises.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name license.spventerprises.com;
    
    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Important for handling JSON requests
        proxy_set_header Content-Type $content_type;
        proxy_set_header Content-Length $content_length;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:4100/health;
        access_log off;
    }
}
EOF

# Create temporary self-signed SSL certificate
echo "🔒 Creating temporary SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx-selfsigned.key \
    -out /etc/ssl/certs/nginx-selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=ABAI/CN=license.spventerprises.com"

# Enable nginx site
echo "🌐 Enabling nginx site..."
ln -sf /etc/nginx/sites-available/abai-license /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'abai-license-server',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4100
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

echo "✅ Basic server setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Upload your license server code (server.js)"
echo "2. Update .env file with your Stripe keys"
echo "3. Start the server with: pm2 start ecosystem.config.js"
echo "4. Install Let's Encrypt SSL certificate"
echo ""
echo "📁 Server directory: /root/abai-license-server"
echo "🌐 Domain: https://license.spventerprises.com"
echo ""
echo "To install Let's Encrypt SSL:"
echo "apt install certbot python3-certbot-nginx -y"
echo "certbot --nginx -d license.spventerprises.com" 