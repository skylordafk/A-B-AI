# HTTPS Setup for A-B/AI License Server

Stripe requires HTTPS for webhooks in live mode. Let's set up SSL with nginx and Let's Encrypt.

## Step 1: Install and Configure Nginx

SSH to your server and run these commands:

```bash
ssh root@159.223.155.150
```

### Install Nginx
```bash
apt update
apt install nginx -y
```

### Configure Nginx as reverse proxy
```bash
nano /etc/nginx/sites-available/abai-license
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name 159.223.155.150;  # We'll use IP for now, but domain is better
    
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
        
        # Important for Stripe webhooks
        proxy_set_header Content-Type $content_type;
        proxy_set_header Content-Length $content_length;
    }
}
```

### Enable the site
```bash
ln -s /etc/nginx/sites-available/abai-license /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl restart nginx
```

## Step 2: Install SSL Certificate

### Install Certbot
```bash
apt install certbot python3-certbot-nginx -y
```

### Option A: If you have a domain name
If you have a domain pointing to your server (recommended):
```bash
# Replace with your domain
certbot --nginx -d your-domain.com
```

### Option B: Using IP address (less secure, but works)
Since Stripe webhooks need HTTPS, and Let's Encrypt requires a domain, we have a few options:

#### Option B1: Use a free domain service
1. Get a free domain from services like:
   - Duck DNS (duckdns.org)
   - No-IP (noip.com)
   - Freenom (freenom.com)

2. Point it to your IP: `159.223.155.150`

3. Then run certbot with your domain:
   ```bash
   certbot --nginx -d yourdomain.duckdns.org
   ```

#### Option B2: Self-signed certificate (for testing only)
```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/abai-license.key \
    -out /etc/ssl/certs/abai-license.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=159.223.155.150"

# Update nginx config
nano /etc/nginx/sites-available/abai-license
```

Add SSL configuration:
```nginx
server {
    listen 80;
    server_name 159.223.155.150;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name 159.223.155.150;
    
    ssl_certificate /etc/ssl/certs/abai-license.crt;
    ssl_certificate_key /etc/ssl/private/abai-license.key;
    
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
        
        # Important for Stripe webhooks
        proxy_set_header Content-Type $content_type;
        proxy_set_header Content-Length $content_length;
    }
}
```

```bash
nginx -t
systemctl restart nginx
```

## Step 3: Update Firewall

```bash
# Allow HTTP and HTTPS through firewall
ufw allow 'Nginx Full'
ufw status
```

## Step 4: Test HTTPS

```bash
# Test HTTP (should redirect to HTTPS)
curl -I http://159.223.155.150/health

# Test HTTPS
curl -k https://159.223.155.150/health
```

## Step 5: Update Your Application

Update your frontend to use HTTPS endpoints:

### Update apps/main/src/main.ts
```typescript
const isValid = await checkLicence(process.env.LICENCE_ENDPOINT || 'https://159.223.155.150');
```

### Update test script
```javascript
const SERVER_URL = 'https://159.223.155.150';
```

## Step 6: Configure Stripe Webhook

Now you can use HTTPS URL in Stripe:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://159.223.155.150/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.deleted`
4. Copy the webhook secret and add to your `.env` file

## Recommended: Get a Real Domain

For production, it's highly recommended to:

1. **Buy a domain** (e.g., from Namecheap, GoDaddy, etc.)
2. **Point it to your server** (A record to 159.223.155.150)
3. **Use Let's Encrypt** for a trusted SSL certificate
4. **Update all references** to use your domain instead of IP

Example with domain:
```bash
# After pointing domain to your server
certbot --nginx -d license.yourdomain.com
```

Then your webhook URL would be:
`https://license.yourdomain.com/webhook`

## Troubleshooting

### Check nginx status
```bash
systemctl status nginx
```

### Check nginx logs
```bash
tail -f /var/log/nginx/error.log
```

### Check SSL certificate
```bash
openssl s_client -connect 159.223.155.150:443
```

### Test webhook manually
```bash
curl -X POST https://159.223.155.150/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Should return error about missing signature (which is expected).

## Security Notes

- Self-signed certificates will show security warnings in browsers
- For production, use a real domain with Let's Encrypt
- Consider using a firewall to restrict access to only necessary ports
- Regularly update your SSL certificates 