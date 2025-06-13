// Comprehensive Security Testing Script for A-B/AI License System
// Run with: node test-security-comprehensive.js

const axios = require('axios');
const crypto = require('crypto');

const SERVER_URL = process.env.TEST_SERVER_URL || 'https://license.spventerprises.com';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || null;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || null;

class SecurityTester {
  constructor() {
    this.testResults = [];
    this.vulnerabilityCount = 0;
    this.securityScore = 0;
  }

  async log(test, status, message, severity = 'INFO', details = null) {
    const result = {
      test,
      status,
      message,
      severity,
      details,
      timestamp: new Date().toISOString(),
    };
    this.testResults.push(result);

    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    const severityEmoji = severity === 'HIGH' ? '🚨' : severity === 'MEDIUM' ? '⚠️' : 'ℹ️';

    console.log(`${emoji} ${severityEmoji} ${test}: ${message}`);
    if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);

    // Track vulnerabilities
    if (status === 'FAIL' && (severity === 'HIGH' || severity === 'MEDIUM')) {
      this.vulnerabilityCount++;
    }
  }

  // Create a valid Stripe webhook signature
  createStripeSignature(payload, secret, timestamp) {
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }

  // Test 1: Direct Activation Security
  async testDirectActivationSecurity() {
    console.log('\n🔒 Testing Direct Activation Security...\n');

    try {
      const testEmail = `security-test-${Date.now()}@example.com`;
      const response = await axios.post(
        `${SERVER_URL}/activate`,
        { email: testEmail },
        {
          validateStatus: () => true,
        }
      );

      if (response.status === 403) {
        await this.log(
          'Direct Activation Security',
          'PASS',
          'Direct activation properly disabled in production',
          'INFO'
        );
      } else if (response.status === 200 && response.data.licenceKey) {
        await this.log(
          'Direct Activation Security',
          'FAIL',
          'Direct activation enabled - allows bypassing payment',
          'HIGH',
          { email: testEmail, warning: 'Free license creation possible' }
        );
      } else {
        await this.log(
          'Direct Activation Security',
          'WARN',
          `Unexpected response: ${response.status}`,
          'MEDIUM'
        );
      }
    } catch (error) {
      await this.log('Direct Activation Security', 'FAIL', error.message, 'MEDIUM');
    }
  }

  // Test 2: Admin Endpoint Authentication
  async testAdminAuthentication() {
    console.log('\n🔐 Testing Admin Authentication...\n');

    // Test without authentication
    try {
      const response = await axios.get(`${SERVER_URL}/admin/licenses`, {
        validateStatus: () => true,
      });

      if (response.status === 401 || response.status === 403) {
        await this.log('Admin Auth (No Key)', 'PASS', 'Admin endpoint properly protected', 'INFO');
      } else if (response.status === 200) {
        await this.log(
          'Admin Auth (No Key)',
          'FAIL',
          'Admin endpoint accessible without authentication',
          'HIGH',
          { exposedData: 'License data exposed to public' }
        );
      }
    } catch (error) {
      await this.log('Admin Auth (No Key)', 'FAIL', error.message, 'MEDIUM');
    }

    // Test with invalid API key
    try {
      const response = await axios.get(`${SERVER_URL}/admin/licenses`, {
        headers: { 'X-API-Key': 'invalid-key-12345' },
        validateStatus: () => true,
      });

      if (response.status === 401 || response.status === 403) {
        await this.log(
          'Admin Auth (Invalid Key)',
          'PASS',
          'Invalid API key properly rejected',
          'INFO'
        );
      } else {
        await this.log('Admin Auth (Invalid Key)', 'FAIL', 'Invalid API key accepted', 'HIGH');
      }
    } catch (error) {
      await this.log('Admin Auth (Invalid Key)', 'FAIL', error.message, 'MEDIUM');
    }

    // Test with valid API key (if provided)
    if (ADMIN_API_KEY) {
      try {
        const response = await axios.get(`${SERVER_URL}/admin/licenses`, {
          headers: { 'X-API-Key': ADMIN_API_KEY },
          validateStatus: () => true,
        });

        if (response.status === 200) {
          await this.log('Admin Auth (Valid Key)', 'PASS', 'Valid API key accepted', 'INFO');
        } else {
          await this.log(
            'Admin Auth (Valid Key)',
            'FAIL',
            `Valid API key rejected: ${response.status}`,
            'MEDIUM'
          );
        }
      } catch (error) {
        await this.log('Admin Auth (Valid Key)', 'FAIL', error.message, 'MEDIUM');
      }
    } else {
      await this.log(
        'Admin Auth (Valid Key)',
        'SKIP',
        'No ADMIN_API_KEY provided for testing',
        'INFO'
      );
    }
  }

  // Test 3: Webhook Security
  async testWebhookSecurity() {
    console.log('\n🔗 Testing Webhook Security...\n');

    if (!WEBHOOK_SECRET) {
      await this.log('Webhook Security', 'SKIP', 'No STRIPE_WEBHOOK_SECRET provided', 'MEDIUM');
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: `evt_security_test_${Date.now()}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_security_test_${Date.now()}`,
          customer_email: 'security@test.com',
          payment_status: 'paid',
        },
      },
    });

    // Test valid signature
    try {
      const validSignature = this.createStripeSignature(payload, WEBHOOK_SECRET, timestamp);
      const response = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': validSignature,
        },
        validateStatus: () => true,
      });

      if (response.status === 200) {
        await this.log(
          'Webhook Valid Signature',
          'PASS',
          'Valid webhook signature accepted',
          'INFO'
        );
      } else {
        await this.log(
          'Webhook Valid Signature',
          'FAIL',
          `Valid signature rejected: ${response.status}`,
          'HIGH'
        );
      }
    } catch (error) {
      await this.log('Webhook Valid Signature', 'FAIL', error.message, 'HIGH');
    }

    // Test signature bypass attempts
    const bypassAttempts = [
      { name: 'No Signature', headers: { 'Content-Type': 'application/json' } },
      {
        name: 'Invalid Signature',
        headers: { 'Content-Type': 'application/json', 'stripe-signature': 'fake-sig' },
      },
      {
        name: 'Empty Signature',
        headers: { 'Content-Type': 'application/json', 'stripe-signature': '' },
      },
      {
        name: 'Malformed Signature',
        headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=123,v1=' },
      },
    ];

    for (const attempt of bypassAttempts) {
      try {
        const response = await axios.post(`${SERVER_URL}/webhook`, payload, {
          headers: attempt.headers,
          validateStatus: () => true,
        });

        if (response.status >= 400) {
          await this.log(
            `Webhook ${attempt.name}`,
            'PASS',
            'Signature bypass attempt properly blocked',
            'INFO'
          );
        } else {
          await this.log(
            `Webhook ${attempt.name}`,
            'FAIL',
            'Signature bypass attempt succeeded',
            'HIGH'
          );
        }
      } catch (error) {
        await this.log(
          `Webhook ${attempt.name}`,
          'PASS',
          'Signature bypass attempt blocked with error',
          'INFO'
        );
      }
    }
  }

  // Test 4: Rate Limiting
  async testRateLimiting() {
    console.log('\n⚡ Testing Rate Limiting...\n');

    const endpoints = [
      { path: '/validate', method: 'POST', data: { key: 'test-key' } },
      { path: '/activate', method: 'POST', data: { email: 'rate@test.com' } },
    ];

    for (const endpoint of endpoints) {
      try {
        // Send rapid requests
        const requests = Array.from({ length: 30 }, (_, i) =>
          axios({
            method: endpoint.method,
            url: `${SERVER_URL}${endpoint.path}`,
            data: { ...endpoint.data, index: i },
            validateStatus: () => true,
          }).catch((error) => error.response || error)
        );

        const responses = await Promise.all(requests);
        const rateLimited = responses.some((r) => r.status === 429);

        if (rateLimited) {
          await this.log(`Rate Limiting ${endpoint.path}`, 'PASS', 'Rate limiting active', 'INFO');
        } else {
          await this.log(
            `Rate Limiting ${endpoint.path}`,
            'FAIL',
            'No rate limiting detected',
            'MEDIUM',
            { concern: 'Potential for abuse/DoS attacks' }
          );
        }
      } catch (error) {
        await this.log(`Rate Limiting ${endpoint.path}`, 'FAIL', error.message, 'MEDIUM');
      }
    }
  }

  // Test 5: Input Validation & Injection
  async testInputValidation() {
    console.log('\n🛡️ Testing Input Validation...\n');

    const maliciousInputs = [
      { name: 'SQL Injection', email: "admin'; DROP TABLE licenses; --" },
      { name: 'XSS Script', email: '<script>alert("xss")</script>' },
      { name: 'XSS Image', email: '<img src=x onerror=alert("xss")>' },
      { name: 'Command Injection', email: 'test@test.com; rm -rf /' },
      { name: 'Path Traversal', email: '../../etc/passwd' },
      { name: 'Null Bytes', email: 'test@test.com\0' },
      { name: 'Unicode Exploit', email: 'test@test.com\u0000' },
      { name: 'Long Input', email: 'a'.repeat(10000) + '@test.com' },
    ];

    let protectedInputs = 0;
    for (const input of maliciousInputs) {
      try {
        const response = await axios.post(
          `${SERVER_URL}/activate`,
          { email: input.email },
          { validateStatus: () => true }
        );

        if (response.status >= 400) {
          await this.log(
            `Input Validation (${input.name})`,
            'PASS',
            'Malicious input properly rejected',
            'INFO'
          );
          protectedInputs++;
        } else {
          await this.log(
            `Input Validation (${input.name})`,
            'FAIL',
            'Malicious input accepted',
            'HIGH'
          );
        }
      } catch (error) {
        await this.log(
          `Input Validation (${input.name})`,
          'PASS',
          'Malicious input blocked with error',
          'INFO'
        );
        protectedInputs++;
      }
    }

    // Overall input validation score
    const protectionRate = (protectedInputs / maliciousInputs.length) * 100;
    if (protectionRate >= 90) {
      await this.log(
        'Input Validation Overall',
        'PASS',
        `${protectionRate.toFixed(1)}% of malicious inputs blocked`,
        'INFO'
      );
    } else {
      await this.log(
        'Input Validation Overall',
        'FAIL',
        `Only ${protectionRate.toFixed(1)}% of malicious inputs blocked`,
        'HIGH'
      );
    }
  }

  // Test 6: Information Disclosure
  async testInformationDisclosure() {
    console.log('\n🔍 Testing Information Disclosure...\n');

    // Test error message information leakage
    const errorTests = [
      { path: '/validate', data: null, name: 'Null Body' },
      { path: '/validate', data: { invalidField: 'test' }, name: 'Invalid Field' },
      { path: '/activate', data: { email: 123 }, name: 'Wrong Type' },
      { path: '/nonexistent', data: {}, name: 'Not Found' },
    ];

    for (const test of errorTests) {
      try {
        const response = await axios.post(`${SERVER_URL}${test.path}`, test.data, {
          validateStatus: () => true,
        });

        // Check if error messages leak sensitive information
        const responseText = JSON.stringify(response.data).toLowerCase();
        const sensitiveInfo = [
          'password',
          'secret',
          'key',
          'token',
          'internal',
          'debug',
          'stack',
          'trace',
          'file',
          'directory',
          'server',
          'database',
        ];

        const leakedInfo = sensitiveInfo.filter((info) => responseText.includes(info));

        if (leakedInfo.length === 0) {
          await this.log(
            `Info Disclosure (${test.name})`,
            'PASS',
            'No sensitive information leaked in error',
            'INFO'
          );
        } else {
          await this.log(
            `Info Disclosure (${test.name})`,
            'FAIL',
            'Sensitive information leaked in error message',
            'MEDIUM',
            { leakedInfo, response: response.data }
          );
        }
      } catch (error) {
        await this.log(`Info Disclosure (${test.name})`, 'PASS', 'Error properly handled', 'INFO');
      }
    }
  }

  // Test 7: Webhook Idempotency
  async testWebhookIdempotency() {
    console.log('\n🔄 Testing Webhook Idempotency...\n');

    if (!WEBHOOK_SECRET) {
      await this.log('Webhook Idempotency', 'SKIP', 'No STRIPE_WEBHOOK_SECRET provided', 'MEDIUM');
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const eventId = `evt_idempotency_test_${Date.now()}`;
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_idempotency_test_${Date.now()}`,
          customer_email: `idempotency-${Date.now()}@test.com`,
          payment_status: 'paid',
        },
      },
    });

    try {
      const signature = this.createStripeSignature(payload, WEBHOOK_SECRET, timestamp);

      // Send the same webhook twice
      const response1 = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
        validateStatus: () => true,
      });

      const response2 = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
        validateStatus: () => true,
      });

      if (response1.status === 200 && response2.status === 200) {
        // Check if second response indicates already processed
        if (response2.data.processed === false && response2.data.reason === 'already_processed') {
          await this.log(
            'Webhook Idempotency',
            'PASS',
            'Duplicate webhook processing prevented',
            'INFO'
          );
        } else {
          await this.log(
            'Webhook Idempotency',
            'FAIL',
            'Duplicate webhooks both processed - potential for duplicate licenses',
            'MEDIUM'
          );
        }
      } else {
        await this.log('Webhook Idempotency', 'FAIL', 'Webhook requests failed', 'MEDIUM');
      }
    } catch (error) {
      await this.log('Webhook Idempotency', 'FAIL', error.message, 'MEDIUM');
    }
  }

  // Test 8: Security Headers
  async testSecurityHeaders() {
    console.log('\n🛡️ Testing Security Headers...\n');

    try {
      const response = await axios.get(`${SERVER_URL}/health`);
      const headers = response.headers;

      const securityHeaders = [
        { name: 'X-Content-Type-Options', expected: 'nosniff' },
        { name: 'X-Frame-Options', expected: 'DENY' },
        { name: 'X-XSS-Protection', expected: '1; mode=block' },
        { name: 'Referrer-Policy', expected: 'strict-origin-when-cross-origin' },
      ];

      for (const header of securityHeaders) {
        if (headers[header.name.toLowerCase()]) {
          await this.log(
            `Security Header (${header.name})`,
            'PASS',
            'Security header present',
            'INFO'
          );
        } else {
          await this.log(
            `Security Header (${header.name})`,
            'FAIL',
            'Security header missing',
            'MEDIUM'
          );
        }
      }
    } catch (error) {
      await this.log('Security Headers', 'FAIL', error.message, 'MEDIUM');
    }
  }

  // Run all security tests
  async runAllTests() {
    console.log('🔒 Starting Comprehensive Security Testing\n');
    console.log(`Target Server: ${SERVER_URL}`);
    console.log(`Webhook Secret: ${WEBHOOK_SECRET ? 'PROVIDED' : 'NOT PROVIDED'}`);
    console.log(`Admin API Key: ${ADMIN_API_KEY ? 'PROVIDED' : 'NOT PROVIDED'}\n`);

    await this.testDirectActivationSecurity();
    await this.testAdminAuthentication();
    await this.testWebhookSecurity();
    await this.testRateLimiting();
    await this.testInputValidation();
    await this.testInformationDisclosure();
    await this.testWebhookIdempotency();
    await this.testSecurityHeaders();

    this.generateSecurityReport();
  }

  generateSecurityReport() {
    console.log('\n' + '='.repeat(70));
    console.log('🔒 COMPREHENSIVE SECURITY REPORT');
    console.log('='.repeat(70));

    const passed = this.testResults.filter((r) => r.status === 'PASS').length;
    const failed = this.testResults.filter((r) => r.status === 'FAIL').length;
    const warnings = this.testResults.filter((r) => r.status === 'WARN').length;
    const skipped = this.testResults.filter((r) => r.status === 'SKIP').length;

    const highSeverity = this.testResults.filter(
      (r) => r.severity === 'HIGH' && r.status === 'FAIL'
    ).length;
    const mediumSeverity = this.testResults.filter(
      (r) => r.severity === 'MEDIUM' && r.status === 'FAIL'
    ).length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📊 Total: ${this.testResults.length}`);

    console.log('\n🚨 VULNERABILITY SUMMARY:');
    console.log(`🔴 High Severity: ${highSeverity}`);
    console.log(`🟡 Medium Severity: ${mediumSeverity}`);
    console.log(`📊 Total Vulnerabilities: ${this.vulnerabilityCount}`);

    // Calculate security score
    const totalTests = this.testResults.filter((r) => r.status !== 'SKIP').length;
    const securityScore = totalTests > 0 ? (passed / totalTests) * 100 : 0;

    console.log(`\n🏆 SECURITY SCORE: ${securityScore.toFixed(1)}%`);

    if (securityScore >= 90) {
      console.log('🟢 Security Status: EXCELLENT');
    } else if (securityScore >= 75) {
      console.log('🟡 Security Status: GOOD - Some improvements needed');
    } else if (securityScore >= 50) {
      console.log('🟠 Security Status: FAIR - Multiple issues to address');
    } else {
      console.log('🔴 Security Status: POOR - Critical security fixes needed');
    }

    console.log('\n📋 IMMEDIATE ACTIONS REQUIRED:');
    const highPriorityFails = this.testResults.filter(
      (r) => r.status === 'FAIL' && r.severity === 'HIGH'
    );

    if (highPriorityFails.length === 0) {
      console.log('✅ No critical security vulnerabilities found');
    } else {
      highPriorityFails.forEach((fail) => {
        console.log(`🚨 ${fail.test}: ${fail.message}`);
      });
    }

    console.log('\n📞 RECOMMENDATIONS:');
    console.log('1. Fix all HIGH severity vulnerabilities immediately');
    console.log('2. Address MEDIUM severity issues within 1 week');
    console.log('3. Implement proper monitoring and alerting');
    console.log('4. Regular security testing (weekly/monthly)');
    console.log('5. Security code review before deployments');

    // Save detailed report
    const report = {
      summary: {
        passed,
        failed,
        warnings,
        skipped,
        total: this.testResults.length,
        securityScore: securityScore.toFixed(1),
        vulnerabilities: {
          high: highSeverity,
          medium: mediumSeverity,
          total: this.vulnerabilityCount,
        },
      },
      results: this.testResults,
      timestamp: new Date().toISOString(),
      serverUrl: SERVER_URL,
    };

    const fs = require('fs');
    fs.writeFileSync('security-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📝 Detailed report saved to: security-test-report.json');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SecurityTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SecurityTester;
