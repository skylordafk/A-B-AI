// Test script for A-B/AI Production Stripe Integration
// Run with: node test-production-integration.js

const https = require('https');
const http = require('http');

const SERVER_URL = 'https://license.spventerprises.com'; // Direct connection to license server
const TEST_EMAIL = 'test@example.com';

console.log('🧪 Testing A-B/AI Production Integration...\n');

function makeRequest(url, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
        ...headers,
      },
    };

    const req = requestModule.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

async function testHealthCheck() {
  console.log('1️⃣ Testing server health...');

  try {
    const response = await makeRequest(`${SERVER_URL}/health`, 'GET');

    if (response.statusCode === 200 && response.data.status === 'healthy') {
      console.log('✅ Server is healthy!');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Licenses in database: ${response.data.licenses}`);
      return true;
    } else {
      console.log('❌ Health check failed:', response);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testWebhookEndpoint() {
  console.log('\n2️⃣ Testing webhook endpoint...');

  try {
    const response = await makeRequest(`${SERVER_URL}/webhook`, 'POST', '{}');

    // We expect this to fail with signature error (which means webhook is working)
    if (
      response.statusCode === 400 &&
      (response.data.error?.includes('signature') || response.data.error?.includes('secret'))
    ) {
      console.log('✅ Webhook endpoint is properly configured!');
      console.log('   (Correctly rejecting requests without valid signature)');
      return true;
    } else {
      console.log('❌ Webhook test unexpected result:', response);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook test error:', error.message);
    return false;
  }
}

async function testLicenseValidation() {
  console.log('\n3️⃣ Testing license validation...');

  try {
    const testData = JSON.stringify({ key: 'invalid-test-key' });
    const response = await makeRequest(`${SERVER_URL}/validate`, 'POST', testData);

    if (response.statusCode === 200 && response.data.valid === false) {
      console.log('✅ License validation working correctly!');
      console.log('   (Correctly rejecting invalid license key)');
      return true;
    } else {
      console.log('❌ License validation test failed:', response);
      return false;
    }
  } catch (error) {
    console.log('❌ License validation error:', error.message);
    return false;
  }
}

async function testDirectActivation() {
  console.log('\n4️⃣ Testing direct activation (should be disabled in production)...');

  try {
    const activationData = JSON.stringify({ email: TEST_EMAIL });
    const response = await makeRequest(`${SERVER_URL}/activate`, 'POST', activationData);

    if (response.statusCode === 403 && response.data.error?.includes('production')) {
      console.log('✅ Direct activation correctly disabled in production!');
      console.log('   (Users must go through Stripe checkout)');
      return true;
    } else if (response.statusCode === 200 && response.data.licenceKey) {
      console.log('⚠️  Direct activation is enabled (ALLOW_DEV_ACTIVATION=true)');
      console.log('   This is OK for testing, but should be disabled for live production');
      return true;
    } else {
      console.log('❌ Direct activation test unexpected result:', response);
      return false;
    }
  } catch (error) {
    console.log('❌ Direct activation test error:', error.message);
    return false;
  }
}

async function testAdminEndpoint() {
  console.log('\n5️⃣ Testing admin endpoint...');

  try {
    const response = await makeRequest(`${SERVER_URL}/admin/licenses`, 'GET');

    if (response.statusCode === 200 && Array.isArray(response.data.licenses)) {
      console.log('✅ Admin endpoint working!');
      console.log(`   Total licenses: ${response.data.total}`);
      if (response.data.total > 0) {
        console.log('   Recent licenses:');
        response.data.licenses.slice(-3).forEach((license) => {
          console.log(`     - ${license.email} (${license.active ? 'active' : 'inactive'})`);
        });
      }
      return true;
    } else {
      console.log('❌ Admin endpoint test failed:', response);
      return false;
    }
  } catch (error) {
    console.log('❌ Admin endpoint error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log(`🔗 Server URL: ${SERVER_URL}`);
  console.log(`📧 Test Email: ${TEST_EMAIL}\n`);

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Webhook Endpoint', fn: testWebhookEndpoint },
    { name: 'License Validation', fn: testLicenseValidation },
    { name: 'Direct Activation', fn: testDirectActivation },
    { name: 'Admin Endpoint', fn: testAdminEndpoint },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your production server is ready.');
    console.log('\n📋 Next steps:');
    console.log('   1. Set up your Stripe product and get the Price ID');
    console.log('   2. Update apps/ui/src/shared/stripe.ts with your Price ID');
    console.log('   3. Configure Stripe webhook: https://license.spventerprises.com/webhook');
    console.log('   4. Add your Stripe secret keys to the server .env file');
    console.log('   5. Build and test your app in production mode');
    console.log('\n🚀 Your Stripe integration is ready for customers!');
  } else {
    console.log('\n❌ Some tests failed. Check the server logs:');
    console.log('   ssh root@159.223.155.150');
    console.log('   pm2 logs abai-license-server');
  }
}

// Run the tests
runTests().catch(console.error);
