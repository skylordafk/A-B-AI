// Stripe Webhook Testing Script
// Tests various Stripe webhook scenarios and edge cases
// Run with: node test-stripe-webhooks.js

const axios = require('axios');
const crypto = require('crypto');

const SERVER_URL = process.env.WEBHOOK_SERVER_URL || 'https://license.spventerprises.com';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

class StripeWebhookTester {
  constructor() {
    this.testResults = [];
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

  async log(test, status, message, details = null) {
    const result = { test, status, message, details, timestamp: new Date().toISOString() };
    this.testResults.push(result);

    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
    if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }

  async testWebhookSignatureValidation() {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: 'evt_test_webhook',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_12345',
          object: 'checkout.session',
          customer_email: 'test@example.com',
          payment_status: 'paid',
        },
      },
    });

    // Test 1: Valid signature
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
        await this.log('Valid Signature', 'PASS', 'Valid webhook signature accepted');
      } else {
        await this.log('Valid Signature', 'FAIL', `Valid signature rejected: ${response.status}`);
      }
    } catch (error) {
      await this.log('Valid Signature', 'FAIL', error.message);
    }

    // Test 2: Invalid signature
    try {
      const response = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid-signature',
        },
        validateStatus: () => true,
      });

      if (response.status === 400) {
        await this.log('Invalid Signature', 'PASS', 'Invalid webhook signature rejected');
      } else {
        await this.log(
          'Invalid Signature',
          'FAIL',
          `Invalid signature accepted: ${response.status}`
        );
      }
    } catch (error) {
      await this.log('Invalid Signature', 'FAIL', error.message);
    }

    // Test 3: Missing signature
    try {
      const response = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      });

      if (response.status === 400) {
        await this.log('Missing Signature', 'PASS', 'Missing webhook signature rejected');
      } else {
        await this.log(
          'Missing Signature',
          'FAIL',
          `Missing signature accepted: ${response.status}`
        );
      }
    } catch (error) {
      await this.log('Missing Signature', 'FAIL', error.message);
    }
  }

  async testCheckoutSessionCompleted() {
    const timestamp = Math.floor(Date.now() / 1000);
    const testEmail = `webhook-test-${Date.now()}@example.com`;

    const payload = JSON.stringify({
      id: `evt_test_${Date.now()}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          object: 'checkout.session',
          customer_email: testEmail,
          customer: `cus_test_${Date.now()}`,
          subscription: `sub_test_${Date.now()}`,
          payment_status: 'paid',
          mode: 'subscription',
          line_items: {
            data: [
              {
                price: { id: 'price_test_12345' },
              },
            ],
          },
        },
      },
    });

    try {
      const signature = this.createStripeSignature(payload, WEBHOOK_SECRET, timestamp);
      const response = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        validateStatus: () => true,
      });

      if (response.status === 200) {
        await this.log('Checkout Completed', 'PASS', 'Checkout session webhook processed');

        // Wait a moment then check if license was created
        setTimeout(async () => {
          try {
            const adminResponse = await axios.get(`${SERVER_URL}/admin/licenses`);
            const licenses = adminResponse.data.licenses || [];
            const createdLicense = licenses.find((l) => l.email === testEmail);

            if (createdLicense) {
              await this.log('License Creation', 'PASS', 'License created from webhook');
            } else {
              await this.log('License Creation', 'WARN', 'License not found after webhook');
            }
          } catch (error) {
            await this.log('License Creation', 'WARN', 'Could not verify license creation');
          }
        }, 2000);
      } else {
        await this.log(
          'Checkout Completed',
          'FAIL',
          `Webhook processing failed: ${response.status}`
        );
      }
    } catch (error) {
      await this.log('Checkout Completed', 'FAIL', error.message);
    }
  }

  async testSubscriptionCanceled() {
    const timestamp = Math.floor(Date.now() / 1000);
    const subscriptionId = `sub_test_cancel_${Date.now()}`;

    const payload = JSON.stringify({
      id: `evt_cancel_${Date.now()}`,
      object: 'event',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: subscriptionId,
          object: 'subscription',
          customer: `cus_test_${Date.now()}`,
          status: 'canceled',
        },
      },
    });

    try {
      const signature = this.createStripeSignature(payload, WEBHOOK_SECRET, timestamp);
      const response = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        validateStatus: () => true,
      });

      if (response.status === 200) {
        await this.log(
          'Subscription Canceled',
          'PASS',
          'Subscription cancellation webhook processed'
        );
      } else {
        await this.log(
          'Subscription Canceled',
          'FAIL',
          `Webhook processing failed: ${response.status}`
        );
      }
    } catch (error) {
      await this.log('Subscription Canceled', 'FAIL', error.message);
    }
  }

  async testPaymentFailed() {
    const timestamp = Math.floor(Date.now() / 1000);

    const payload = JSON.stringify({
      id: `evt_payment_failed_${Date.now()}`,
      object: 'event',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: `in_test_${Date.now()}`,
          object: 'invoice',
          subscription: `sub_test_${Date.now()}`,
          customer: `cus_test_${Date.now()}`,
          amount_due: 999,
          attempt_count: 1,
        },
      },
    });

    try {
      const signature = this.createStripeSignature(payload, WEBHOOK_SECRET, timestamp);
      const response = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        validateStatus: () => true,
      });

      if (response.status === 200) {
        await this.log('Payment Failed', 'PASS', 'Payment failed webhook processed');
      } else {
        await this.log('Payment Failed', 'FAIL', `Webhook processing failed: ${response.status}`);
      }
    } catch (error) {
      await this.log('Payment Failed', 'FAIL', error.message);
    }
  }

  async testUnknownEventType() {
    const timestamp = Math.floor(Date.now() / 1000);

    const payload = JSON.stringify({
      id: `evt_unknown_${Date.now()}`,
      object: 'event',
      type: 'unknown.event.type',
      data: {
        object: { id: 'test_unknown' },
      },
    });

    try {
      const signature = this.createStripeSignature(payload, WEBHOOK_SECRET, timestamp);
      const response = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        validateStatus: () => true,
      });

      if (response.status === 200) {
        await this.log('Unknown Event', 'PASS', 'Unknown event type handled gracefully');
      } else {
        await this.log('Unknown Event', 'FAIL', `Unknown event rejected: ${response.status}`);
      }
    } catch (error) {
      await this.log('Unknown Event', 'FAIL', error.message);
    }
  }

  async testMalformedWebhook() {
    const timestamp = Math.floor(Date.now() / 1000);

    const tests = [
      { name: 'Invalid JSON', payload: 'invalid-json', contentType: 'application/json' },
      { name: 'Empty Body', payload: '', contentType: 'application/json' },
      {
        name: 'Wrong Content Type',
        payload: 'test=data',
        contentType: 'application/x-www-form-urlencoded',
      },
      {
        name: 'Missing Event Type',
        payload: JSON.stringify({ id: 'evt_test', object: 'event' }),
        contentType: 'application/json',
      },
    ];

    for (const test of tests) {
      try {
        const signature = this.createStripeSignature(test.payload, WEBHOOK_SECRET, timestamp);
        const response = await axios.post(`${SERVER_URL}/webhook`, test.payload, {
          headers: {
            'Content-Type': test.contentType,
            'stripe-signature': signature,
          },
          validateStatus: () => true,
        });

        if (response.status >= 400) {
          await this.log(`Malformed Webhook (${test.name})`, 'PASS', 'Malformed webhook rejected');
        } else {
          await this.log(`Malformed Webhook (${test.name})`, 'FAIL', 'Malformed webhook accepted');
        }
      } catch (error) {
        await this.log(
          `Malformed Webhook (${test.name})`,
          'PASS',
          'Malformed webhook properly rejected'
        );
      }
    }
  }

  async testWebhookIdempotency() {
    const timestamp = Math.floor(Date.now() / 1000);
    const eventId = `evt_idempotency_${Date.now()}`;
    const testEmail = `idempotency-test-${Date.now()}@example.com`;

    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          object: 'checkout.session',
          customer_email: testEmail,
          customer: `cus_test_${Date.now()}`,
          payment_status: 'paid',
        },
      },
    });

    try {
      const signature = this.createStripeSignature(payload, WEBHOOK_SECRET, timestamp);

      // Send the same webhook twice
      const response1 = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        validateStatus: () => true,
      });

      const response2 = await axios.post(`${SERVER_URL}/webhook`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        validateStatus: () => true,
      });

      if (response1.status === 200 && response2.status === 200) {
        await this.log(
          'Webhook Idempotency',
          'WARN',
          'Duplicate webhooks both processed - consider implementing idempotency'
        );
      } else {
        await this.log('Webhook Idempotency', 'PASS', 'Webhook idempotency handling working');
      }
    } catch (error) {
      await this.log('Webhook Idempotency', 'FAIL', error.message);
    }
  }

  async runAllTests() {
    console.log('🔄 Starting Stripe Webhook Tests\n');
    console.log(`Testing webhook endpoint: ${SERVER_URL}/webhook`);

    if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'whsec_test_secret') {
      console.log(
        '⚠️  Using test webhook secret - set STRIPE_WEBHOOK_SECRET for production testing\n'
      );
    }

    await this.testWebhookSignatureValidation();
    await this.testCheckoutSessionCompleted();
    await this.testSubscriptionCanceled();
    await this.testPaymentFailed();
    await this.testUnknownEventType();
    await this.testMalformedWebhook();
    await this.testWebhookIdempotency();

    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 STRIPE WEBHOOK TEST REPORT');
    console.log('='.repeat(70));

    const passed = this.testResults.filter((r) => r.status === 'PASS').length;
    const failed = this.testResults.filter((r) => r.status === 'FAIL').length;
    const warnings = this.testResults.filter((r) => r.status === 'WARN').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📊 Total: ${this.testResults.length}`);

    if (failed === 0) {
      console.log('\n🎉 All webhook tests passed! Your webhook handling is robust.');
    } else {
      console.log('\n⚠️  Some webhook tests failed. Review the failures above.');
    }

    console.log('\n📋 Recommendations:');
    const hasIdempotencyWarning = this.testResults.some(
      (r) => r.test === 'Webhook Idempotency' && r.status === 'WARN'
    );

    if (hasIdempotencyWarning) {
      console.log('   • Consider implementing webhook idempotency to prevent duplicate processing');
    }

    console.log('   • Monitor webhook delivery in your Stripe Dashboard');
    console.log('   • Set up alerts for webhook failures');
    console.log(
      '   • Regularly test with Stripe CLI: stripe listen --forward-to your-domain/webhook'
    );
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new StripeWebhookTester();
  tester.runAllTests().catch(console.error);
}

module.exports = StripeWebhookTester;
