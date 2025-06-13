// Test script for A-B/AI License Server
// Run with: node test-license-server.js

const https = require('https');
const http = require('http');

const SERVER_URL = 'https://license.spventerprises.com';
const TEST_EMAIL = 'test@example.com';

console.log('🧪 Testing A-B/AI License Server...\n');

function makeRequest(url, method, data) {
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

async function testActivation() {
  console.log('1️⃣ Testing license activation...');

  try {
    const activationData = JSON.stringify({ email: TEST_EMAIL });
    const response = await makeRequest(`${SERVER_URL}/activate`, 'POST', activationData);

    if (response.statusCode === 200 && response.data.licenceKey) {
      console.log('✅ Activation successful!');
      console.log(`   License Key: ${response.data.licenceKey}`);
      return response.data.licenceKey;
    } else {
      console.log('❌ Activation failed:', response);
      return null;
    }
  } catch (error) {
    console.log('❌ Activation error:', error.message);
    return null;
  }
}

async function testValidation(licenseKey) {
  console.log('\n2️⃣ Testing license validation...');

  try {
    const validationData = JSON.stringify({ key: licenseKey });
    const response = await makeRequest(`${SERVER_URL}/validate`, 'POST', validationData);

    if (response.statusCode === 200 && response.data.valid === true) {
      console.log('✅ Validation successful!');
      console.log(`   License is valid: ${response.data.valid}`);
      return true;
    } else {
      console.log('❌ Validation failed:', response);
      return false;
    }
  } catch (error) {
    console.log('❌ Validation error:', error.message);
    return false;
  }
}

async function testInvalidKey() {
  console.log('\n3️⃣ Testing invalid license key...');

  try {
    const invalidData = JSON.stringify({ key: 'invalid-key-12345' });
    const response = await makeRequest(`${SERVER_URL}/validate`, 'POST', invalidData);

    if (response.statusCode === 200 && response.data.valid === false) {
      console.log('✅ Invalid key test successful!');
      console.log(`   License is valid: ${response.data.valid}`);
      return true;
    } else {
      console.log('❌ Invalid key test failed:', response);
      return false;
    }
  } catch (error) {
    console.log('❌ Invalid key test error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log(`🔗 Server URL: ${SERVER_URL}`);
  console.log(`📧 Test Email: ${TEST_EMAIL}\n`);

  // Test 1: Activation
  const licenseKey = await testActivation();
  if (!licenseKey) {
    console.log('\n❌ License server tests failed - activation not working');
    return;
  }

  // Test 2: Validation with valid key
  const validationSuccess = await testValidation(licenseKey);
  if (!validationSuccess) {
    console.log('\n❌ License server tests failed - validation not working');
    return;
  }

  // Test 3: Validation with invalid key
  const invalidTestSuccess = await testInvalidKey();
  if (!invalidTestSuccess) {
    console.log('\n❌ License server tests failed - invalid key handling not working');
    return;
  }

  console.log('\n🎉 All license server tests passed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Set up your Stripe account and get API keys');
  console.log('   2. Update apps/ui/src/shared/stripe.ts with your keys');
  console.log('   3. Test the full license flow in your app');
  console.log('\n💡 Your license server is ready for production!');
}

// Run the tests
runTests().catch(console.error);
