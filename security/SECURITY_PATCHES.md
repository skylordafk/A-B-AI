# 🔒 Security Patches for A-B/AI License System

## 🚨 CRITICAL VULNERABILITIES FOUND

Based on our security audit, the following **CRITICAL** vulnerabilities were identified and need immediate patching:

### 1. Direct Activation Enabled in Production ⚠️ HIGH RISK
**Issue:** `ALLOW_DEV_ACTIVATION=true` allows bypassing Stripe payments  
**Risk:** Free license generation, revenue loss

### 2. No Admin Authentication ⚠️ HIGH RISK  
**Issue:** `/admin/licenses` endpoint accessible without authentication  
**Risk:** Data breach, unauthorized access to customer information

### 3. Missing Rate Limiting ⚠️ MEDIUM RISK
**Issue:** No rate limiting on critical endpoints  
**Risk:** DoS attacks, resource exhaustion

### 4. Input Validation Failures ⚠️ HIGH RISK
**Issue:** Malicious inputs accepted (SQL injection, XSS attempts)  
**Risk:** Code injection, data corruption

### 5. Webhook Security Issues ⚠️ HIGH RISK
**Issue:** Webhook signature validation failing  
**Risk:** Unauthorized license creation

## 🛠️ IMMEDIATE FIXES REQUIRED

### Step 1: Deploy Secure Server Version

Replace your current `production-license-server.js` with the secure version:

```bash
# On your production server
cd /path/to/your/license/server
cp production-license-server.js production-license-server-backup.js
cp production-license-server-secure.js production-license-server.js
```

### Step 2: Set Critical Environment Variables

```bash
# Disable direct activation in production
export ALLOW_DEV_ACTIVATION=false
unset ALLOW_DEV_ACTIVATION  # Even better - remove completely

# Set webhook secret (get from Stripe Dashboard)
export STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here

# Generate and set admin API key
export ADMIN_API_KEY=$(openssl rand -hex 32)
echo "Admin API Key: $ADMIN_API_KEY" >> ~/admin-credentials.txt

# Set proper Stripe keys
export STRIPE_SECRET_KEY=sk_live_your_live_secret_key
```

### Step 3: Restart the Server

```bash
# If using PM2
pm2 restart abai-license-server

# If using systemd
sudo systemctl restart abai-license-server

# If running directly
pkill -f "node production-license-server"
node production-license-server.js
```

### Step 4: Verify Security Fixes

```bash
# Test the fixes
node test-security-fixes.js

# Should show:
# ✅ Direct Activation: Properly disabled in production
# ✅ Admin Auth: Properly protected  
# ✅ Rate Limiting: Rate limiting is active
# ✅ Input Validation: All malicious inputs blocked
```

## 🔧 Configuration Changes Required

### 1. Environment Variables (.env file)

Create or update your `.env` file:

```bash
# Production Security Settings
NODE_ENV=production
ALLOW_DEV_ACTIVATION=false

# Stripe Configuration (LIVE MODE)
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Admin Security
ADMIN_API_KEY=your_generated_32_char_api_key

# Server Configuration
PORT=4100
```

### 2. Webhook Configuration in Stripe

1. Go to your Stripe Dashboard → Webhooks
2. Update webhook URL: `https://license.spventerprises.com/webhook`
3. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`
4. Test webhook delivery

### 3. Admin Access

To access admin endpoints, include the API key:

```bash
# Get license stats
curl -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  https://license.spventerprises.com/admin/stats

# List licenses
curl -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  https://license.spventerprises.com/admin/licenses
```

## 📊 Security Features Added

### ✅ Enhanced Rate Limiting
- `/validate`: 20 requests/minute
- `/activate`: 5 requests/minute  
- `/webhook`: 100 requests/minute
- Default: 30 requests/minute

### ✅ Input Validation & Sanitization
- Email format validation
- XSS prevention
- SQL injection prevention
- Path traversal prevention
- Length limits

### ✅ Webhook Idempotency
- Prevents duplicate webhook processing
- Event ID tracking
- 7-day event history cleanup

### ✅ Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### ✅ Admin Authentication
- API key required for admin endpoints
- Bearer token or X-API-Key header support
- Secure random key generation

### ✅ Audit Logging
- Request logging with IP addresses
- License validation tracking
- Security event logging

## 🧪 Testing Commands

### Run Security Tests
```bash
# Test with environment variables
STRIPE_WEBHOOK_SECRET=whsec_your_secret \
ADMIN_API_KEY=your_admin_key \
node test-security-fixes.js
```

### Test Webhook Security
```bash
# Test webhook with proper secret  
STRIPE_WEBHOOK_SECRET=whsec_your_secret \
node test-stripe-webhooks.js
```

### Test Production Integration  
```bash
node test-production-integration.js
```

## 🚨 Post-Deployment Checklist

- [ ] **Direct activation disabled** (403 status)
- [ ] **Admin endpoints protected** (401 without API key)
- [ ] **Rate limiting active** (429 after limits)
- [ ] **Input validation working** (400 for malicious inputs)
- [ ] **Webhook signatures validated** (400 for invalid signatures)
- [ ] **All tests passing** (security-fixes, webhooks, production)
- [ ] **Environment variables set** (production values)
- [ ] **Stripe webhook configured** (correct URL and secret)
- [ ] **Admin API key secured** (stored safely)

## 📈 Monitoring & Alerts

### Set Up Monitoring
```bash
# Monitor server logs
tail -f /var/log/abai-license-server.log

# Monitor with PM2
pm2 monit

# Check webhook deliveries in Stripe Dashboard
```

### Alert Conditions
- Rate limit violations
- Failed webhook signatures  
- Admin access attempts without auth
- Unusual license validation patterns
- Server errors or downtime

## 🔄 Regular Security Maintenance

### Weekly
- [ ] Review security logs
- [ ] Test webhook deliveries
- [ ] Verify rate limiting effectiveness
- [ ] Check for failed authentication attempts

### Monthly  
- [ ] Run full security test suite
- [ ] Review and rotate admin API keys
- [ ] Update dependencies
- [ ] Security audit review

### Quarterly
- [ ] Penetration testing
- [ ] Code security review
- [ ] Stripe integration review
- [ ] Backup and recovery testing

## 📞 Emergency Response

If security breach detected:

1. **Immediate**: Disable direct activation
2. **Within 1 hour**: Rotate all API keys
3. **Within 4 hours**: Review all license transactions
4. **Within 24 hours**: Full security audit
5. **Within 48 hours**: Customer notification (if required)

## 🎯 Success Metrics

System is secure when:
- ✅ 0 high-severity vulnerabilities
- ✅ All security tests passing (100%)
- ✅ Rate limiting preventing abuse
- ✅ No unauthorized admin access
- ✅ All webhooks properly signed
- ✅ Input validation blocking attacks

---

**Security Level**: Production Ready ✅  
**Last Updated**: ${new Date().toISOString().split('T')[0]}  
**Next Review**: ${new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]} 