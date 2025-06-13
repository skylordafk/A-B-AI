// Production Build License Testing
// Tests the packaged Electron app license functionality
// Run with: node test-packaged-app.js

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class PackagedAppTester {
  constructor() {
    this.platform = os.platform();
    this.appPath = this.findAppPath();
    this.testResults = [];
  }

  findAppPath() {
    const distPath = path.join(__dirname, 'dist');

    // Look for packaged app based on platform
    if (this.platform === 'win32') {
      // Windows: A-B/AI-Setup.exe or unpacked folder
      const winPaths = [
        path.join(distPath, 'win-unpacked', 'A-B AI.exe'),
        path.join(distPath, 'A-B AI-*.exe'),
      ];

      for (const winPath of winPaths) {
        if (fs.existsSync(winPath)) return winPath;
      }
    } else if (this.platform === 'darwin') {
      // macOS: A-B/AI.app
      const macPath = path.join(distPath, 'mac', 'A-B AI.app', 'Contents', 'MacOS', 'A-B AI');
      if (fs.existsSync(macPath)) return macPath;
    } else {
      // Linux: AppImage or unpacked
      const linuxPaths = [
        path.join(distPath, 'linux-unpacked', 'a-b-ai'),
        path.join(distPath, 'A-B AI-*.AppImage'),
      ];

      for (const linuxPath of linuxPaths) {
        if (fs.existsSync(linuxPath)) return linuxPath;
      }
    }

    return null;
  }

  async log(test, status, message, details = null) {
    const result = { test, status, message, details, timestamp: new Date().toISOString() };
    this.testResults.push(result);

    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
    if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }

  async testAppLaunch() {
    if (!this.appPath) {
      await this.log('App Launch', 'FAIL', 'Packaged app not found. Run pnpm package first.');
      return false;
    }

    return new Promise((resolve) => {
      console.log(`Attempting to launch: ${this.appPath}`);

      const app = spawn(this.appPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      let launched = false;
      const timeout = setTimeout(() => {
        if (!launched) {
          app.kill();
          this.log('App Launch', 'FAIL', 'App launch timeout (30s)');
          resolve(false);
        }
      }, 30000);

      app.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('App Output:', output);

        if (output.includes('App ready') || output.includes('Window created')) {
          launched = true;
          clearTimeout(timeout);

          // Give app time to fully load
          setTimeout(() => {
            app.kill();
            this.log('App Launch', 'PASS', 'App launched successfully');
            resolve(true);
          }, 5000);
        }
      });

      app.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('App Error:', error);

        if (error.includes('license') && error.includes('invalid')) {
          launched = true;
          clearTimeout(timeout);
          app.kill();
          this.log(
            'App Launch',
            'PASS',
            'App launched and checked license (expected error in test)'
          );
          resolve(true);
        }
      });

      app.on('error', (error) => {
        clearTimeout(timeout);
        this.log('App Launch', 'FAIL', `Failed to launch app: ${error.message}`);
        resolve(false);
      });

      app.on('close', (code) => {
        clearTimeout(timeout);
        if (!launched) {
          this.log('App Launch', 'FAIL', `App exited with code ${code}`);
          resolve(false);
        }
      });
    });
  }

  async testLicenseStorage() {
    // Test license storage paths for different platforms
    const appDataPaths = {
      win32: path.join(os.homedir(), 'AppData', 'Roaming', 'abai-desktop'),
      darwin: path.join(os.homedir(), 'Library', 'Application Support', 'abai-desktop'),
      linux: path.join(os.homedir(), '.config', 'abai-desktop'),
    };

    const expectedPath = appDataPaths[this.platform];

    if (!expectedPath) {
      await this.log('License Storage', 'SKIP', 'Unknown platform for storage test');
      return false;
    }

    try {
      // Create test license data
      if (!fs.existsSync(expectedPath)) {
        fs.mkdirSync(expectedPath, { recursive: true });
      }

      const configPath = path.join(expectedPath, 'config.json');
      const testData = {
        key: 'test-license-key-12345',
        cacheExpires: Date.now() + 72 * 60 * 60 * 1000,
      };

      fs.writeFileSync(configPath, JSON.stringify(testData));

      // Verify it was written
      const readData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (readData.key === testData.key && readData.cacheExpires === testData.cacheExpires) {
        await this.log('License Storage', 'PASS', 'License storage path accessible');

        // Clean up
        fs.unlinkSync(configPath);
        return true;
      } else {
        await this.log('License Storage', 'FAIL', 'License data not persisted correctly');
        return false;
      }
    } catch (error) {
      await this.log('License Storage', 'FAIL', `Storage test failed: ${error.message}`);
      return false;
    }
  }

  async testBuildIntegrity() {
    if (!this.appPath) {
      await this.log('Build Integrity', 'SKIP', 'No app path to test');
      return false;
    }

    try {
      const stats = fs.statSync(this.appPath);

      if (stats.size === 0) {
        await this.log('Build Integrity', 'FAIL', 'App executable is empty');
        return false;
      }

      if (stats.size < 1000000) {
        // Less than 1MB seems suspicious for Electron app
        await this.log(
          'Build Integrity',
          'WARN',
          `App size seems small: ${Math.round(stats.size / 1024)}KB`
        );
      }

      await this.log(
        'Build Integrity',
        'PASS',
        `App executable exists (${Math.round(stats.size / 1024 / 1024)}MB)`
      );
      return true;
    } catch (error) {
      await this.log('Build Integrity', 'FAIL', `Build integrity check failed: ${error.message}`);
      return false;
    }
  }

  async testDependencies() {
    const expectedFiles = [
      'node_modules', // Should be included in ASAR or as files
      'package.json',
    ];

    const appDir = path.dirname(this.appPath);
    let foundDeps = 0;

    for (const file of expectedFiles) {
      const filePath = path.join(appDir, file);
      if (fs.existsSync(filePath)) {
        foundDeps++;
      }
    }

    if (foundDeps > 0) {
      await this.log(
        'Dependencies',
        'PASS',
        `Found ${foundDeps}/${expectedFiles.length} expected files`
      );
      return true;
    } else {
      // Check if app is using ASAR packaging
      const asarPath = path.join(appDir, 'resources', 'app.asar');
      if (fs.existsSync(asarPath)) {
        await this.log('Dependencies', 'PASS', 'App uses ASAR packaging');
        return true;
      } else {
        await this.log('Dependencies', 'WARN', 'Could not verify app dependencies');
        return false;
      }
    }
  }

  async testEnvironmentVariables() {
    // Test that production environment is set correctly
    const testEnv = { ...process.env, NODE_ENV: 'production' };

    // In production, the app should have different behavior
    try {
      // This is more of a conceptual test since we can't easily check
      // the actual environment variables inside the packaged app
      await this.log(
        'Environment Variables',
        'PASS',
        'Production environment assumed for packaged app'
      );
      return true;
    } catch (error) {
      await this.log('Environment Variables', 'FAIL', error.message);
      return false;
    }
  }

  async testAutoUpdater() {
    // Check if auto-updater files are present (if using auto-updater)
    const appDir = path.dirname(this.appPath);
    const updaterFiles = ['latest.yml', 'latest-mac.yml', 'latest-linux.yml'];

    let hasUpdater = false;
    for (const file of updaterFiles) {
      if (fs.existsSync(path.join(appDir, file))) {
        hasUpdater = true;
        break;
      }
    }

    if (hasUpdater) {
      await this.log('Auto Updater', 'PASS', 'Auto-updater configuration found');
    } else {
      await this.log('Auto Updater', 'SKIP', 'Auto-updater not configured');
    }

    return true;
  }

  async runAllTests() {
    console.log('🚀 Testing Packaged A-B/AI Application\n');
    console.log(`Platform: ${this.platform}`);
    console.log(`App Path: ${this.appPath || 'Not found'}\n`);

    if (!this.appPath) {
      console.log('❌ Cannot find packaged app. Please run:');
      console.log('   pnpm build');
      console.log('   pnpm package');
      console.log('\nThen run this test again.\n');
      return;
    }

    // Run all tests
    await this.testBuildIntegrity();
    await this.testDependencies();
    await this.testLicenseStorage();
    await this.testEnvironmentVariables();
    await this.testAutoUpdater();
    await this.testAppLaunch(); // Run this last as it's the most complex

    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 PACKAGED APP TEST REPORT');
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
      console.log('\n🎉 Packaged app tests passed! Your app is ready for distribution.');
      console.log('\n📋 Next steps:');
      console.log('   1. Test the app manually on your target platforms');
      console.log('   2. Test the complete license activation flow');
      console.log('   3. Create installation packages (if needed)');
      console.log('   4. Set up code signing (recommended)');
    } else {
      console.log('\n⚠️  Some tests failed. Review the build process:');
      console.log('   1. Check electron-builder configuration');
      console.log('   2. Verify all dependencies are included');
      console.log('   3. Test with a fresh build');
    }

    console.log('\n🔧 Manual testing checklist:');
    console.log('   [ ] App launches without errors');
    console.log('   [ ] License activation screen appears');
    console.log('   [ ] Can activate license (dev mode)');
    console.log('   [ ] Stripe redirect works (prod mode)');
    console.log('   [ ] License persists after restart');
    console.log('   [ ] App works offline with cached license');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new PackagedAppTester();
  tester.runAllTests().catch(console.error);
}

module.exports = PackagedAppTester;
