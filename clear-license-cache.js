const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('🧹 Clearing A-B/AI License Cache...');

// Clear the main license store
try {
  const licenseStore = new Store({ 
    name: 'config',
    defaults: { cacheExpires: 0, key: '' },
  });
  
  console.log('📍 Current license store location:', licenseStore.path);
  console.log('🔍 Current license key:', licenseStore.get('key') || 'none');
  
  licenseStore.clear();
  console.log('✅ Cleared main license store');
} catch (error) {
  console.log('⚠️  Could not clear main store:', error.message);
}

// Clear potential alternative stores with different app names
const appNames = [
  'abai-desktop',
  'ABAI', 
  'A-BAI',
  'A-B-AI',
  'abai',
  'config'
];

appNames.forEach(appName => {
  try {
    const store = new Store({ name: appName });
    if (store.get('key') || store.get('cacheExpires')) {
      console.log(`🔍 Found license data in "${appName}" store`);
      console.log(`📍 Location: ${store.path}`);
      store.clear();
      console.log(`✅ Cleared "${appName}" store`);
    }
  } catch (error) {
    // Silent fail for stores that don't exist
  }
});

// Clear localStorage-style cache files
const potentialPaths = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'abai-desktop'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'ABAI'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'A-BAI'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'A-B-AI'),
  path.join(os.homedir(), 'AppData', 'Local', 'abai-desktop'),
  path.join(os.homedir(), 'AppData', 'Local', 'ABAI'),
  path.join(os.homedir(), 'AppData', 'Local', 'A-BAI'),
  path.join(os.homedir(), 'AppData', 'Local', 'A-B-AI'),
];

potentialPaths.forEach(cachePath => {
  try {
    if (fs.existsSync(cachePath)) {
      console.log(`📂 Found cache directory: ${cachePath}`);
      const files = fs.readdirSync(cachePath);
      files.forEach(file => {
        if (file.includes('config') || file.includes('license')) {
          const filePath = path.join(cachePath, file);
          console.log(`🗑️  Removing: ${filePath}`);
          fs.unlinkSync(filePath);
        }
      });
    }
  } catch (error) {
    // Silent fail for paths that don't exist or can't be accessed
  }
});

console.log('');
console.log('🎯 License cache cleared!');
console.log('💡 Now you can test the license retrieval flow:');
console.log('   1. Launch your .exe');
console.log('   2. Click "Already Purchased"');
console.log('   3. Enter: skylervondra@gmail.com');
console.log('   4. Click "Retrieve License"');
console.log(''); 