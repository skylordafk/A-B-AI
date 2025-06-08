/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */

// Bootstrap file for Electron with TypeScript
console.log('[Bootstrap] Starting...');
console.log('[Bootstrap] Current directory:', __dirname);
console.log('[Bootstrap] Loading ts-node...');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
  },
});

console.log('[Bootstrap] ts-node loaded, requiring main.ts...');

try {
  // Load the actual main file
  require('./main.ts');
  console.log('[Bootstrap] main.ts loaded successfully');
} catch (error) {
  console.error('[Bootstrap] Error loading main.ts:', error);
}
