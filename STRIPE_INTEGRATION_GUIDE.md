# A-B/AI Stripe Integration Setup Guide

This guide will walk you through setting up Stripe payments for your A-B/AI license server.

## 🎯 Overview

Your current setup:
- ✅ Production server running on DigitalOcean (159.223.155.150:4100)
- ✅ Frontend Stripe integration code ready
- ✅ Production license server with webhook handling
- 🔄 **Need to complete**: Stripe product setup and webhook configuration

## 📋 Step-by-Step Setup

### Step 1: Configure Your Stripe Product

1. **Go to your Stripe Dashboard**: [https://dashboard.stripe.com](https://dashboard.stripe.com)

2. **Navigate to Products** → Click "Add Product"

3. **Create your product**:
   ```
   Name: A-B/AI Desktop License
   Description: Full access to A-B/AI desktop application for AI model comparison and testing
   ```

4. **Add pricing** (choose one option):

   **Option A: One-time Payment**
   ```
   Pricing model: One time
   Price: $29.00 USD  (or your preferred price)
   ```

   **Option B: Subscription**
   ```
   Pricing model: Recurring
   Billing period: Monthly
   Price: $9.99 USD per month
   ```

5. **Copy the Price ID**: After creating, you'll see a price ID like `price_1ABC123DEF456...`
   - **Save this ID** - you'll need it for configuration

### Step 2: Get Your Stripe API Keys

1. **Go to** → Developers → API Keys

2. **Copy these keys**:
   ```
   Publishable key: pk_live_51ABC... (starts with pk_live_)
   Secret key: sk_live_51ABC... (starts with sk_live_)
   ```

3. **Keep these secure** - the secret key should never be shared or committed to code

### Step 3: Update Frontend Configuration

Update your `apps/ui/src/shared/stripe.ts` file:

```typescript
// Stripe Configuration for A-B/AI Licensing
export const STRIPE_PRICE_ID = 'price_1ABC123DEF456GHI789'; // Your actual price ID from Step 1
export const STRIPE_PK = 'pk_live_51ABC123...'; // Your actual publishable key from Step 2
```

### Step 4: Deploy the Production License Server

1. **Make the deployment script executable**:
   ```bash
   chmod +x deploy-to-server.sh
   ```

2. **Run the deployment**:
   ```bash
   ./deploy-to-server.sh
   ```

3. **SSH to your server** and configure environment:
   ```bash
   ssh root@159.223.155.150
   cd /root/abai-license-server
   nano .env
   ```

4. **Update the .env file** with your Stripe keys:
   ```env
   STRIPE_SECRET_KEY=sk_live_51ABC123...  # Your secret key from Step 2
   STRIPE_WEBHOOK_SECRET=whsec_...       # You'll get this in Step 5
   NODE_ENV=production
   PORT=4100
   ```

### Step 5: Set Up Stripe Webhook

1. **In Stripe Dashboard** → Developers → Webhooks

2. **Click "Add endpoint"**

3. **Configure webhook**:
   ```
   Endpoint URL: http://159.223.155.150:4100/webhook
   Description: A-B/AI License Server
   Events to send: Select these events:
   ✅ checkout.session.completed
   ✅ customer.subscription.deleted  
   ✅ invoice.payment_failed
   ```

4. **Click "Add endpoint"**

5. **Copy the webhook secret**:
   - Click on your webhook
   - Click "Reveal" next to "Signing secret"
   - Copy the secret (starts with `whsec_`)

6. **Update your server's .env file**:
   ```bash
   ssh root@159.223.155.150
   cd /root/abai-license-server
   nano .env
   # Add the webhook secret:
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

### Step 6: Start the Production Server

1. **SSH to your server**:
   ```bash
   ssh root@159.223.155.150
   cd /root/abai-license-server
   ```

2. **Start the server with PM2**:
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

3. **Verify it's running**:
   ```bash
   pm2 status
   curl http://159.223.155.150:4100/health
   ```

### Step 7: Test the Integration

1. **Test the health endpoint**:
   ```bash
   curl http://159.223.155.150:4100/health
   ```
   Should return: `{"status":"healthy","licenses":0}`

2. **Test webhook endpoint** (should require signature):
   ```bash
   curl -X POST http://159.223.155.150:4100/webhook
   ```
   Should return error about missing signature (this is expected)

3. **Test the complete flow**:
   - Build your app in production mode
   - Launch the app
   - Try to activate a license
   - It should redirect to Stripe checkout

## 🔧 Configuration Files Summary

### Frontend (`apps/ui/src/shared/stripe.ts`)
```typescript
export const STRIPE_PRICE_ID = 'price_1ABC123...'; // Your price ID
export const STRIPE_PK = 'pk_live_51ABC123...';    // Your publishable key
```

### Server (`.env` on your server)
```env
STRIPE_SECRET_KEY=sk_live_51ABC123...
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NODE_ENV=production
PORT=4100
```

## 🚨 Security Checklist

- [ ] Secret keys are in environment variables, not code
- [ ] Webhook signature verification is enabled
- [ ] Server is running with proper process management (PM2)
- [ ] Firewall allows access to port 4100
- [ ] Database file has proper permissions

## 📊 Monitoring and Logs

### Check server status:
```bash
pm2 status
pm2 logs abai-license-server
```

### View all licenses (admin):
```bash
curl http://159.223.155.150:4100/admin/licenses
```

### Monitor license database:
```bash
cat /root/abai-license-server/licenses.json
```

## 🔄 Testing Stripe Integration

### Test Mode (Recommended First)

1. **Switch to test mode in Stripe**:
   - Use test API keys (`pk_test_...` and `sk_test_...`)
   - Create test products with test prices

2. **Update configuration** with test keys

3. **Use test credit cards**:
   ```
   Success: 4242 4242 4242 4242
   Decline: 4000 0000 0000 0002
   ```

4. **Test the complete flow** without real payments

### Live Mode Testing

1. **Use live keys**
2. **Make a small real purchase** to verify everything works
3. **Check that license is created** in the admin panel
4. **Verify the license works** in your app

## 🆘 Troubleshooting

### Common Issues

**Issue**: "Webhook signature verification failed"
**Solution**: Check that STRIPE_WEBHOOK_SECRET is correct in your .env file

**Issue**: "Failed to load Stripe"  
**Solution**: Verify STRIPE_PK is correct in stripe.ts

**Issue**: "License server unreachable"
**Solution**: Check if PM2 process is running and port 4100 is open

**Issue**: "License not found after payment"
**Solution**: Check webhook logs for errors

### Debug Commands

```bash
# Check if server is running
pm2 status

# View server logs
pm2 logs abai-license-server

# Test webhook manually
stripe listen --forward-to localhost:4100/webhook

# Check license database
cat /root/abai-license-server/licenses.json

# Test license validation
curl -X POST http://159.223.155.150:4100/validate \
  -H "Content-Type: application/json" \
  -d '{"key":"your-license-key-here"}'
```

## 🚀 Next Steps After Setup

1. **Email Integration**: Add email sending for license keys
2. **Admin Dashboard**: Create a web interface for license management  
3. **Analytics**: Track license usage and revenue
4. **Backup**: Set up automated database backups
5. **SSL**: Add HTTPS for production security

## 📞 Support

If you encounter issues:

1. Check the server logs: `pm2 logs abai-license-server`
2. Verify webhook delivery in Stripe Dashboard
3. Test with Stripe CLI: `stripe listen --forward-to your-server:4100/webhook`
4. Check the GitHub repository: https://github.com/skylordafk/A-B-AI

---

🎉 **Once this is all set up, your users will be able to:**
- Launch A-B/AI desktop app
- Enter their email for activation  
- Complete payment through Stripe
- Automatically receive their license
- Use the app immediately

The license will be validated on each app startup with a 72-hour offline cache for reliability. 