# 🚀 A-B/AI License Server Deployment Guide

Since you recreated your server from scratch, follow these steps to get your license server running again.

## 📋 Pre-requisites

1. **Fresh Ubuntu server** (20.04 or 22.04)
2. **Domain pointing to server**: `license.spventerprises.com` → your server IP
3. **SSH access** to your server
4. **Stripe account** with API keys

## 🛠️ Step 1: Upload Files to Server

First, upload the deployment files to your server:

```bash
# From your local machine, copy files to server
scp server-deployment-script.sh root@license.spventerprises.com:/root/
scp servers/server.js root@license.spventerprises.com:/root/
```

## 🔧 Step 2: Run Deployment Script

SSH to your server and run the deployment script:

```bash
# SSH to server
ssh root@license.spventerprises.com

# Make script executable
chmod +x server-deployment-script.sh

# Run deployment script (this will take a few minutes)
./server-deployment-script.sh
```

This script will:

- ✅ Update system packages
- ✅ Install Node.js 20
- ✅ Install PM2 process manager
- ✅ Install and configure nginx
- ✅ Set up firewall rules
- ✅ Create project structure
- ✅ Install dependencies
- ✅ Create temporary SSL certificate

## 📁 Step 3: Upload Server Code

```bash
# Navigate to project directory
cd /root/abai-license-server

# Copy the server file (if not already there)
# You should have uploaded servers/server.js in step 1
cp /root/server.js ./servers/server.js
```

## 🔑 Step 4: Configure Environment Variables

Edit the `.env` file with your Stripe keys:

```bash
nano .env
```

Update these values:

```env
# Replace with your actual Stripe keys
STRIPE_SECRET_KEY=sk_live_your_actual_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret

# Server configuration
PORT=4100
NODE_ENV=production

# Generate a secure admin API key
ADMIN_API_KEY=your_secure_admin_api_key_here
```

## 🚀 Step 5: Start the Server

```bash
# Start the server with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs abai-license-server
```

## 🔒 Step 6: Install Let's Encrypt SSL

Replace the temporary SSL certificate with a real one:

```bash
# Install certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
certbot --nginx -d license.spventerprises.com

# Test automatic renewal
certbot renew --dry-run
```

## ✅ Step 7: Test Your Server

Test all endpoints:

```bash
# Health check
curl https://license.spventerprises.com/health

# License validation test
curl -X POST https://license.spventerprises.com/validate \
  -H "Content-Type: application/json" \
  -d '{"key":"test-key"}'

# Should return: {"valid":false}
```

## 🎯 Step 8: Create Test License

Create a test license to verify everything works:

```bash
curl -X POST https://license.spventerprises.com/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

This should return a license key that you can test with the validate endpoint.

## 🔄 Step 9: Configure Stripe Webhook

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://license.spventerprises.com/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
5. Copy the webhook secret and update your `.env` file
6. Restart the server: `pm2 restart abai-license-server`

## 🛠️ Common Troubleshooting

### Server won't start

```bash
# Check logs
pm2 logs abai-license-server

# Check if port is available
netstat -tulpn | grep :4100

# Restart nginx
systemctl restart nginx
```

### SSL issues

```bash
# Check nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx

# Check SSL certificate
certbot certificates
```

### Domain not resolving

```bash
# Check DNS
nslookup license.spventerprises.com

# Check if nginx is running
systemctl status nginx
```

## 📱 Step 10: Update Your App

Update your A-B/AI application to use the HTTPS endpoint:

In `apps/main/src/main.ts` or wherever you check licenses:

```typescript
const SERVER_URL = 'https://license.spventerprises.com';
```

## 🔐 Security Checklist

- ✅ SSL certificate installed
- ✅ Firewall configured (only SSH, HTTP, HTTPS)
- ✅ Rate limiting enabled
- ✅ Secure environment variables
- ✅ PM2 process monitoring
- ✅ Regular backups of licenses.json

## 📊 Monitoring

```bash
# Check server status
pm2 status

# View real-time logs
pm2 logs abai-license-server --lines 50

# Monitor system resources
htop

# Check nginx access logs
tail -f /var/log/nginx/access.log
```

## 🔄 Backup Strategy

Set up automatic backups of your license database:

```bash
# Create backup script
cat > /root/backup-licenses.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /root/abai-license-server/licenses.json /root/backups/licenses_$DATE.json
# Keep only last 30 days
find /root/backups -name "licenses_*.json" -mtime +30 -delete
EOF

# Make executable
chmod +x /root/backup-licenses.sh

# Add to crontab (daily backup at 2 AM)
echo "0 2 * * * /root/backup-licenses.sh" | crontab -
```

---

## 🎉 Success!

If everything worked correctly, you should now have:

- ✅ License server running at `https://license.spventerprises.com`
- ✅ Health check at `https://license.spventerprises.com/health`
- ✅ License validation working
- ✅ Stripe webhooks configured
- ✅ SSL certificate installed
- ✅ Process monitoring with PM2

Your license server is now ready for production use! 🚀
