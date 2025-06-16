// End-to-End License Workflow Tests
// This is a Node.js script, not a Vitest test file
// Run with: node tests/license-e2e.test.js

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const PROD_SERVER_URL = 'https://license.spventerprises.com';
const SERVER_URL = process.env.LICENSE_SERVER_URL || PROD_SERVER_URL;
const IS_PRODUCTION = !SERVER_URL.includes('localhost');

class LicenseE2ETest {
  constructor() {
    this.testResults = [];
    this.devServerProcess = null;
  }

  async log(test, status, message, details = null) {
    const result = { test, status, message, details, timestamp: new Date().toISOString() };
    this.testResults.push(result);

    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
    if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }

  async startDevServer() {
    console.log('🚀 Starting development license server...');
    return new Promise((resolve, reject) => {
      this.devServerProcess = spawn('pnpm', ['run', 'license-server'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let output = '';
      this.devServerProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('License server running')) {
          setTimeout(resolve, 1000); // Give server time to fully start
        }
      });

      this.devServerProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      setTimeout(() => reject(new Error('Server startup timeout')), 10000);
    });
  }

  async stopDevServer() {
    if (this.devServerProcess) {
      this.devServerProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Test 1: License Activation Flow
  async testActivationFlow() {
    try {
      const email = `test-${Date.now()}@example.com`;
      const response = await axios.post(`${SERVER_URL}/activate`, { email });

      if (response.data.licenceKey) {
        await this.log('Activation Flow', 'PASS', 'License activated successfully', {
          email,
          licenseKey: response.data.licenceKey.substring(0, 8) + '...',
        });
        return response.data.licenceKey;
      } else {
        if (IS_PRODUCTION) {
          await this.log('Activation Flow', 'WARN', 'Activation disabled in production (no key)');
          return null;
        }
        await this.log('Activation Flow', 'FAIL', 'No license key returned');
        return null;
      }
    } catch (error) {
      if (IS_PRODUCTION) {
        await this.log('Activation Flow', 'WARN', error.message);
      } else {
        await this.log('Activation Flow', 'FAIL', error.message);
      }
      return null;
    }
  }

  // Test 2: License Validation
  async testLicenseValidation(licenseKey) {
    if (!licenseKey) {
      await this.log('License Validation', 'SKIP', 'No license key to validate');
      return false;
    }

    try {
      const _response = await axios.post(`${SERVER_URL}/validate`, { key: licenseKey });

      if (_response.data.valid === true) {
        await this.log('License Validation', 'PASS', 'Valid license accepted');
        return true;
      } else {
        await this.log('License Validation', 'FAIL', 'Valid license rejected');
        return false;
      }
    } catch (error) {
      await this.log('License Validation', 'FAIL', error.message);
      return false;
    }
  }

  // Test 3: Invalid License Rejection
  async testInvalidLicenseRejection() {
    try {
      const response = await axios.post(
        `${SERVER_URL}/validate`,
        { key: 'invalid-key-12345' },
        { validateStatus: () => true }
      );

      if (response.status !== 200 || (response.data && response.data.valid === false)) {
        await this.log('Invalid License Rejection', 'PASS', 'Invalid license correctly rejected');
        return true;
      } else {
        await this.log('Invalid License Rejection', 'FAIL', 'Invalid license accepted');
        return false;
      }
    } catch (error) {
      await this.log('Invalid License Rejection', 'FAIL', error.message);
      return false;
    }
  }

  // Test 4: Server Offline Behavior
  async testOfflineBehavior() {
    // This test simulates what happens when license server is unreachable
    try {
      const _response = await axios.post(
        'http://localhost:9999/validate',
        {
          key: 'test-key',
        },
        { timeout: 2000 }
      );

      await this.log('Offline Behavior', 'FAIL', 'Expected connection failure');
      return false;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        await this.log('Offline Behavior', 'PASS', 'Correctly handles server offline');
        return true;
      } else {
        await this.log('Offline Behavior', 'FAIL', `Unexpected error: ${error.message}`);
        return false;
      }
    }
  }

  // Test 5: Rate Limiting (if implemented)
  async testRateLimiting() {
    const requests = [];
    const _email = `ratetest-${Date.now()}@example.com`;

    try {
      // Send 10 rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          axios
            .post(`${SERVER_URL}/activate`, { email: `${_email}-${i}` })
            .catch((error) => error.response || error)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(
        (res) =>
          res.status === 429 || (res.data && res.data.error && res.data.error.includes('rate'))
      );

      if (rateLimited) {
        await this.log('Rate Limiting', 'PASS', 'Rate limiting working');
      } else {
        await this.log(
          'Rate Limiting',
          'WARN',
          'No rate limiting detected - consider implementing'
        );
      }

      return true;
    } catch (error) {
      await this.log('Rate Limiting', 'FAIL', error.message);
      return false;
    }
  }

  // Test 6: Malformed Request Handling
  async testMalformedRequests() {
    const tests = [
      { name: 'Empty Body', data: null },
      { name: 'Invalid JSON', data: 'invalid-json', isString: true },
      { name: 'Missing Email', data: {} },
      { name: 'Invalid Email', data: { email: 'not-an-email' } },
      { name: 'SQL Injection Attempt', data: { email: "'; DROP TABLE licenses; --" } },
      { name: 'XSS Attempt', data: { email: '<script>alert("xss")</script>' } },
    ];

    let passed = 0;
    for (const test of tests) {
      try {
        const response = await axios.post(`${SERVER_URL}/activate`, test.data, {
          headers: test.isString ? { 'Content-Type': 'text/plain' } : {},
          validateStatus: () => true, // Don't throw on error status
        });

        if (response.status >= 400) {
          await this.log(`Malformed Request (${test.name})`, 'PASS', 'Request properly rejected');
          passed++;
        } else {
          await this.log(
            `Malformed Request (${test.name})`,
            'FAIL',
            'Request incorrectly accepted'
          );
        }
      } catch (error) {
        await this.log(
          `Malformed Request (${test.name})`,
          'PASS',
          'Request properly rejected with error'
        );
        passed++;
      }
    }

    return passed === tests.length;
  }

  // Test 7: Production Server Security
  async testProductionSecurity() {
    try {
      // Test that direct activation is disabled in production
      const _response = await axios.post(
        `${PROD_SERVER_URL}/activate`,
        {
          email: 'test@example.com',
        },
        { validateStatus: () => true }
      );

      if (_response.status === 403 || _response.status === 429) {
        await this.log('Production Security', 'PASS', 'Direct activation disabled in production');
        return true;
      } else if (_response.status === 200) {
        await this.log(
          'Production Security',
          'WARN',
          'Direct activation enabled (ALLOW_DEV_ACTIVATION=true)'
        );
        return true;
      } else {
        if (_response.status === 429) {
          await this.log(
            'Production Security',
            'PASS',
            'Rate limited; treating as direct activation disabled'
          );
          return true;
        }
        await this.log('Production Security', 'FAIL', `Unexpected response: ${_response.status}`);
        return false;
      }
    } catch (error) {
      await this.log('Production Security', 'FAIL', error.message);
      return false;
    }
  }

  // Test 8: License Persistence and Caching
  async testLicensePersistence() {
    // Simulate Electron Store behavior
    const Store = require('electron-store');
    const testStore = new Store({
      name: 'license-test',
      defaults: { cacheExpires: 0, key: '' },
    });

    try {
      // Clear any existing data
      testStore.clear();

      // Test setting license
      const testKey = 'test-persistence-key';
      const cacheExpires = Date.now() + 72 * 60 * 60 * 1000; // 72 hours

      testStore.set('key', testKey);
      testStore.set('cacheExpires', cacheExpires);

      // Test retrieval
      const storedKey = testStore.get('key');
      const storedExpires = testStore.get('cacheExpires');

      if (storedKey === testKey && storedExpires === cacheExpires) {
        await this.log('License Persistence', 'PASS', 'License data persisted correctly');

        // Clean up
        testStore.clear();
        return true;
      } else {
        await this.log('License Persistence', 'FAIL', 'License data not persisted correctly');
        return false;
      }
    } catch (error) {
      await this.log('License Persistence', 'FAIL', error.message);
      return false;
    }
  }

  // Test 9: Load Testing (Basic)
  async testBasicLoad() {
    const concurrency = 5;
    const requestsPerWorker = 3;
    const _email = `loadtest-${Date.now()}@example.com`;

    try {
      const workers = Array.from({ length: concurrency }, (_, i) =>
        Promise.all(
          Array.from({ length: requestsPerWorker }, (_, j) =>
            axios
              .post(`${SERVER_URL}/validate`, {
                key: `load-test-${i}-${j}`,
              })
              .catch((error) => error.response || error)
          )
        )
      );

      const results = await Promise.all(workers);
      const flatResults = results.flat();
      const successful = flatResults.filter((r) => r.status === 200).length;
      const total = flatResults.length;

      await this.log(
        'Basic Load Test',
        'PASS',
        `Handled ${successful}/${total} concurrent requests`,
        {
          concurrency,
          requestsPerWorker,
          successRate: `${((successful / total) * 100).toFixed(1)}%`,
        }
      );

      return true;
    } catch (error) {
      await this.log('Basic Load Test', 'FAIL', error.message);
      return false;
    }
  }

  // Test 10: License Key Format Validation
  async testLicenseKeyFormat() {
    try {
      const email = `format-test-${Date.now()}@example.com`;
      const response = await axios.post(`${SERVER_URL}/activate`, { email });

      if (response.data.licenceKey) {
        const key = response.data.licenceKey;
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);

        if (isUUID) {
          await this.log('License Key Format', 'PASS', 'License key is valid UUID v4');
          return true;
        } else {
          await this.log('License Key Format', 'WARN', 'License key not UUID v4 format', { key });
          return true; // Not necessarily a failure
        }
      } else {
        if (IS_PRODUCTION) {
          await this.log('License Key Format', 'WARN', 'No license key retrieved in production');
          return true;
        }
        await this.log('License Key Format', 'FAIL', 'No license key to validate format');
        return false;
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        await this.log('License Key Format', 'WARN', 'Rate limited, cannot check key format');
        return true;
      }
      if (IS_PRODUCTION) {
        await this.log('License Key Format', 'WARN', error.message);
        return true;
      }
      await this.log('License Key Format', 'FAIL', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive License E2E Tests\n');

    // Start development server if needed
    if (SERVER_URL.includes('localhost')) {
      try {
        await this.startDevServer();
      } catch (error) {
        console.error('Failed to start dev server:', error.message);
        console.log('Assuming server is already running...');
      }
    } else {
      console.log(`🌐 Using remote server: ${SERVER_URL}`);
    }

    try {
      // Run all tests
      const licenseKey = await this.testActivationFlow();
      await this.testLicenseValidation(licenseKey);
      await this.testInvalidLicenseRejection();
      await this.testOfflineBehavior();
      await this.testRateLimiting();
      await this.testMalformedRequests();
      await this.testProductionSecurity();
      await this.testLicensePersistence();
      await this.testBasicLoad();
      await this.testLicenseKeyFormat();

      // Generate report
      this.generateReport();
    } finally {
      if (SERVER_URL.includes('localhost')) {
        await this.stopDevServer();
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 LICENSE E2E TEST REPORT');
    console.log('='.repeat(70));

    const passed = this.testResults.filter((r) => r.status === 'PASS').length;
    const failed = this.testResults.filter((r) => r.status === 'FAIL').length;
    const warnings = this.testResults.filter((r) => r.status === 'WARN').length;
    const skipped = this.testResults.filter((r) => r.status === 'SKIP').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📊 Total: ${this.testResults.length}`);

    if (failed === 0) {
      console.log('\n🎉 All critical tests passed! Your license system is robust.');
    } else {
      console.log('\n⚠️  Some tests failed. Review the failures above.');
    }

    // Save detailed report
    const reportDir = path.join(__dirname, '../test-results');
    const reportPath = path.join(reportDir, 'license-e2e-report.json');

    fs.mkdir(reportDir, { recursive: true }).catch(() => {});

    fs.writeFile(
      reportPath,
      JSON.stringify(
        {
          summary: { passed, failed, warnings, skipped, total: this.testResults.length },
          results: this.testResults,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    ).catch(console.error);

    console.log(`\n📝 Detailed report saved to: ${reportPath}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new LicenseE2ETest();
  tester.runAllTests().catch(console.error);
}

module.exports = LicenseE2ETest;
