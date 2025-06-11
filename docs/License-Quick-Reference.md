# A-B/AI License System Quick Reference

## 🚀 Quick Start

```bash
# Development (includes license server)
pnpm dev

# Production build
pnpm build
pnpm package
```

## 🔧 Key Configuration Files

### `apps/ui/src/shared/stripe.ts`
```typescript
export const STRIPE_PRICE_ID = 'price_power_100';
export const STRIPE_PK = 'pk_live_xxx'; // Replace in production
```

### Environment Variables
```bash
# Development
LICENCE_ENDPOINT=http://localhost:4100
NODE_ENV=development

# Production
LICENCE_ENDPOINT=https://your-license-api.com
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NODE_ENV=production
```

## 📡 API Endpoints

### Local Development Server (Port 4100)

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/activate` | POST | `{email: string}` | `{licenceKey: string}` |
| `/validate` | POST | `{key: string}` | `{valid: boolean}` |

### Production Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhook` | POST | Stripe webhook handler |
| `/validate` | POST | License validation |

## 🔑 License Storage

### Location by Platform
- **Windows**: `C:\Users\[USERNAME]\AppData\Roaming\abai-desktop\`
- **macOS**: `~/Library/Application Support/abai-desktop/`
- **Linux**: `~/.config/abai-desktop/`

### Store Structure
```json
{
  "key": "uuid-license-key",
  "cacheExpires": 1234567890000
}
```

## 🧪 Testing Commands

```bash
# Test license server
curl -X POST http://localhost:4100/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test validation
curl -X POST http://localhost:4100/validate \
  -H "Content-Type: application/json" \
  -d '{"key":"your-license-key"}'

# Stripe webhook testing
stripe listen --forward-to localhost:4100/webhook
```

## 🛠️ Debug Commands

### Electron DevTools Console
```javascript
// View current license
const Store = require('electron-store');
const store = new Store();
console.log(store.store);

// Manually set license (testing only)
store.set('key', 'test-license-key');
store.set('cacheExpires', Date.now() + 72*60*60*1000);

// Clear license
store.clear();
```

### Check License Status
```javascript
// In main process
const { checkLicence } = require('./licensing/checkLicence');
checkLicence('http://localhost:4100').then(console.log);
```

## 🚨 Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Your ABAI licence is invalid or expired" | No valid license found | Activate license |
| "Unable to validate licence" | Server unreachable | Check internet/server |
| "Failed to load Stripe" | Wrong Stripe key | Verify STRIPE_PK |

## 📦 Build Commands

```bash
# Current platform
pnpm package

# Windows (x64)
pnpm package:win

# macOS (Universal)
pnpm package:mac

# With npm fallback (Windows issues)
pnpm package:win:npm
```

## 🔒 Security Checklist

- [ ] Never commit secret keys
- [ ] Use environment variables
- [ ] Enable HTTPS in production
- [ ] Verify Stripe webhooks
- [ ] Implement rate limiting
- [ ] Log all activations
- [ ] Regular key rotation

## 📞 Support Flow

1. Check license validity
2. Review error logs
3. Test with dev server
4. Verify Stripe config
5. Check GitHub issues
6. Contact support

## 🎯 Key Files

- `apps/main/src/licensing/checkLicence.ts` - License validation
- `apps/ui/src/features/licensing/Activate.tsx` - Activation UI
- `scripts/licence-server.ts` - Dev license server
- `apps/ui/src/shared/stripe.ts` - Stripe config 