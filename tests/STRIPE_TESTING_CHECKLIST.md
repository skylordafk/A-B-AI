# 🧪 Comprehensive Stripe & License Testing Checklist

## **Current Status**
✅ **Already Completed:**
- Basic server integration tests (5/5 passing)
- Production deployment working
- Webhook endpoint configured
- Basic activation flow tested
- CORS issues resolved

## **🔍 Additional Testing Required**

### **1. Server-Side Testing**

#### **A. End-to-End License Flow**
```bash
# Run comprehensive E2E tests
node tests/license-e2e.test.js

# Test specific scenarios
LICENSE_SERVER_URL=http://localhost:4100 node tests/license-e2e.test.js
LICENSE_SERVER_URL=https://license.spventerprises.com node tests/license-e2e.test.js
```

**Tests Coverage:**
- [ ] License activation with valid email
- [ ] License validation with valid key
- [ ] Invalid license rejection
- [ ] Server offline behavior (72-hour cache)
- [ ] Rate limiting (if implemented)
- [ ] Malformed request handling
- [ ] Production security (direct activation disabled)
- [ ] License persistence with electron-store
- [ ] Basic load testing (concurrent requests)
- [ ] License key format validation (UUID v4)

#### **B. Stripe Webhook Testing**
```bash
# Test webhook scenarios
STRIPE_WEBHOOK_SECRET=your_webhook_secret node test-stripe-webhooks.js

# Test with real webhook secret
WEBHOOK_SERVER_URL=https://license.spventerprises.com STRIPE_WEBHOOK_SECRET=whsec_... node test-stripe-webhooks.js
```

**Webhook Scenarios:**
- [ ] Valid webhook signature acceptance
- [ ] Invalid webhook signature rejection
- [ ] Missing signature rejection
- [ ] Checkout session completed processing
- [ ] License creation from successful payment
- [ ] Subscription cancellation handling
- [ ] Payment failure processing
- [ ] Unknown event type handling
- [ ] Malformed webhook rejection
- [ ] Webhook idempotency (duplicate prevention)

---

### **2. Client-Side Testing**

#### **A. Electron App License Flow**

**Development Mode Testing:**
```bash
# Start dev environment
pnpm dev

# Test scenarios:
```

**Manual Tests:**
- [ ] **Fresh Install**: Delete license data, launch app → should show activation screen
- [ ] **Email Validation**: Test empty, invalid, and valid email addresses
- [ ] **Development Activation**: Should create license and store locally
- [ ] **License Storage**: Verify license key stored in electron-store
- [ ] **App Restart**: License should persist and validate on restart
- [ ] **Offline Mode**: Disconnect internet, app should work with cached license
- [ ] **Cache Expiry**: Manually expire cache (set date in past), test revalidation

**Production Mode Testing:**
```bash
# Build and test production
pnpm build
pnpm package
# Run the built app
```

**Manual Tests:**
- [ ] **Stripe Redirect**: Should redirect to Stripe checkout (not direct activation)
- [ ] **Checkout Flow**: Complete actual payment flow
- [ ] **Success Return**: Should return to app and activate license
- [ ] **Cancel Flow**: Should return to activation screen
- [ ] **Invalid State**: Clear license mid-flow, test recovery

#### **B. Network Resilience Testing**

**Offline Scenarios:**
- [ ] **No Internet**: Launch app offline with valid cached license
- [ ] **Server Down**: License server unreachable, should use cache
- [ ] **Slow Network**: High latency, should timeout gracefully
- [ ] **Intermittent Connection**: Network drops during activation
- [ ] **DNS Issues**: License server domain unreachable

**Error Handling:**
- [ ] **400 Errors**: Malformed requests handled gracefully
- [ ] **500 Errors**: Server errors don't crash app
- [ ] **Network Timeout**: Long delays handled with user feedback
- [ ] **JSON Parse Errors**: Invalid responses handled safely

---

### **3. Security Testing**

#### **A. Input Validation**
- [ ] **SQL Injection**: Email field with SQL injection attempts
- [ ] **XSS Attempts**: Email field with script tags
- [ ] **Long Inputs**: Extremely long email addresses
- [ ] **Special Characters**: Unicode, emojis, special symbols
- [ ] **Empty/Null**: Null, undefined, empty string handling

#### **B. License Key Security**
- [ ] **Key Enumeration**: Can't guess valid license keys
- [ ] **Key Reuse**: Same key can't be used from multiple locations
- [ ] **Key Expiration**: Expired keys properly rejected
- [ ] **Key Tampering**: Modified keys rejected
- [ ] **Brute Force**: Rate limiting prevents key guessing

#### **C. Webhook Security**
- [ ] **Signature Validation**: Only signed webhooks accepted
- [ ] **Timestamp Validation**: Old webhooks rejected
- [ ] **Replay Attacks**: Duplicate webhooks handled
- [ ] **Malicious Payloads**: Large/malformed payloads rejected

---

### **4. Edge Cases & Error Scenarios**

#### **A. Stripe Integration Edge Cases**
- [ ] **Partial Payments**: Handle incomplete payment flows
- [ ] **Multiple Subscriptions**: Same email, multiple subscriptions
- [ ] **Subscription Changes**: Upgrades, downgrades, plan changes
- [ ] **Refunds**: Handle refunded payments (if applicable)
- [ ] **Chargebacks**: Handle disputed payments
- [ ] **Account Suspension**: Handle suspended Stripe accounts

#### **B. License Server Edge Cases**
- [ ] **Database Corruption**: Handle corrupted license database
- [ ] **Disk Full**: Handle storage failures gracefully
- [ ] **Memory Limits**: Handle high memory usage
- [ ] **Concurrent Access**: Multiple license operations simultaneously
- [ ] **Clock Skew**: Handle time synchronization issues

#### **C. Electron App Edge Cases**
- [ ] **Multiple Instances**: Prevent multiple app instances
- [ ] **Permission Issues**: Handle file system permission errors
- [ ] **Storage Corruption**: Handle corrupted electron-store data
- [ ] **Version Updates**: License compatibility across app versions
- [ ] **Platform Differences**: Windows, macOS, Linux behavior

---

### **5. Performance Testing**

#### **A. Load Testing**
```bash
# Test concurrent license validations
node -e "
const axios = require('axios');
const promises = Array.from({length: 50}, (_, i) => 
  axios.post('https://license.spventerprises.com/validate', {key: 'test-key-' + i})
    .catch(err => err.response)
);
Promise.all(promises).then(results => {
  console.log('Success:', results.filter(r => r.status === 200).length);
  console.log('Failed:', results.filter(r => r.status !== 200).length);
});
"
```

**Performance Metrics:**
- [ ] **Response Time**: < 2 seconds for license validation
- [ ] **Concurrent Users**: Handle 10+ simultaneous validations
- [ ] **Memory Usage**: Server memory remains stable
- [ ] **Database Performance**: License lookup performance
- [ ] **Cache Efficiency**: Effective use of 72-hour cache

#### **B. Stress Testing**
- [ ] **High Volume**: 100+ webhooks in short time
- [ ] **Large Payloads**: Maximum webhook payload size
- [ ] **Resource Exhaustion**: Handle resource limits gracefully
- [ ] **Extended Runtime**: 24+ hour continuous operation

---

### **6. User Experience Testing**

#### **A. Activation Flow UX**
- [ ] **Clear Instructions**: User understands activation process
- [ ] **Loading States**: Appropriate loading indicators
- [ ] **Error Messages**: Clear, actionable error messages
- [ ] **Success Feedback**: Clear confirmation of activation
- [ ] **Progress Indicators**: User knows where they are in flow

#### **B. Error Recovery UX**
- [ ] **Network Errors**: User can retry failed operations
- [ ] **Invalid Input**: Clear validation messages
- [ ] **Expired License**: Clear renewal instructions
- [ ] **Payment Failures**: Clear next steps for payment issues

---

### **7. Integration Testing**

#### **A. Stripe Dashboard Integration**
- [ ] **Webhook Logs**: Webhooks appear in Stripe dashboard
- [ ] **Event Processing**: All events processed successfully
- [ ] **Error Tracking**: Failed webhooks logged and retried
- [ ] **Customer Data**: Customer emails properly recorded

#### **B. Production Environment**
- [ ] **HTTPS**: All connections use HTTPS
- [ ] **Environment Variables**: All secrets properly configured
- [ ] **Monitoring**: Server health monitoring working
- [ ] **Backups**: License database backed up regularly
- [ ] **Logs**: Comprehensive logging for debugging

---

### **8. Cross-Platform Testing**

#### **A. Operating Systems**
- [ ] **Windows 10/11**: Full license flow works
- [ ] **macOS**: Full license flow works  
- [ ] **Linux**: Full license flow works (if supported)

#### **B. Different Network Conditions**
- [ ] **Corporate Firewalls**: Works behind corporate networks
- [ ] **Proxy Servers**: Works through HTTP/HTTPS proxies
- [ ] **VPN Connections**: Works over VPN
- [ ] **Mobile Hotspots**: Works on mobile connections

---

### **9. Monitoring & Alerting**

#### **A. Server Monitoring**
- [ ] **Uptime Monitoring**: Alert if server goes down
- [ ] **Response Time**: Alert if responses > 5 seconds
- [ ] **Error Rate**: Alert if error rate > 5%
- [ ] **Webhook Failures**: Alert on webhook processing failures
- [ ] **License Creation**: Monitor license creation rate

#### **B. Business Metrics**
- [ ] **Activation Rate**: Track successful activations
- [ ] **Conversion Rate**: Track payment completion rate
- [ ] **Churn Rate**: Track subscription cancellations
- [ ] **Error Types**: Most common error scenarios

---

## **🚀 Test Execution Plan**

### **Phase 1: Automated Testing (2-3 hours)**
1. Run `node tests/license-e2e.test.js`
2. Run `node test-stripe-webhooks.js`
3. Fix any failing tests

### **Phase 2: Manual Testing (4-6 hours)**
1. Test development activation flow
2. Test production activation flow (with real payment)
3. Test all error scenarios
4. Test offline/network failure scenarios

### **Phase 3: Load Testing (1-2 hours)**
1. Test concurrent license validations
2. Test webhook load handling
3. Monitor server performance

### **Phase 4: User Acceptance Testing (2-3 hours)**
1. Fresh user perspective on activation flow
2. Test with real credit card (small amount)
3. Test complete customer journey

---

## **📋 Test Scripts to Run**

```bash
# 1. Run all automated tests
npm run test                              # Unit tests
npm run test:e2e                         # Playwright tests
node tests/license-e2e.test.js          # License E2E tests
node test-stripe-webhooks.js            # Webhook tests

# 2. Test production integration
node test-production-integration.js     # Your existing test

# 3. Manual testing checklist
# Work through each manual test scenario above

# 4. Load testing
# Use the provided load testing scripts
```

## **🔧 Tools for Testing**

### **Stripe CLI (Recommended)**
```bash
# Install Stripe CLI
# Listen to live webhooks
stripe listen --forward-to localhost:4100/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

### **Postman/Insomnia**
- Create collection for license server endpoints
- Test various webhook payloads
- Automate repetitive API tests

### **Network Simulation**
- Use browser dev tools to simulate slow/offline network
- Test with VPN/proxy
- Use tools like Charles Proxy for network manipulation

---

## **✅ Success Criteria**

Your license system is ready for production when:

- [ ] **All automated tests pass** (100% success rate)
- [ ] **Manual testing complete** (all scenarios tested)
- [ ] **Performance requirements met** (< 2s response time)
- [ ] **Security validated** (no vulnerabilities found)
- [ ] **Error handling robust** (graceful failure recovery)
- [ ] **User experience smooth** (clear, intuitive flow)
- [ ] **Monitoring in place** (alerts configured)
- [ ] **Documentation complete** (troubleshooting guides)

## **📞 When You Need Help**

If you encounter issues during testing:

1. **Check server logs**: `pm2 logs abai-license-server`
2. **Review Stripe Dashboard**: Look for webhook delivery failures
3. **Check network connectivity**: Ensure firewall/proxy settings correct
4. **Verify environment variables**: All secrets properly configured
5. **Test with Stripe CLI**: Use `stripe listen` for real-time debugging

---

**🎯 Focus Areas Based on Your Current Success:**

Since you've already got the basic flow working, prioritize:
1. **Edge case testing** (network failures, malformed data)
2. **Security testing** (input validation, webhook security)
3. **Performance testing** (concurrent users, load handling)
4. **User experience testing** (error messages, loading states)

This comprehensive testing will ensure your Stripe and License workflow is production-ready and can handle real-world scenarios robustly! 