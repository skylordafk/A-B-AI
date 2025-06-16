/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */

// Bootstrap file for Electron with TypeScript
console.info('[Bootstrap] Starting...');
console.info('[Bootstrap] Current directory:', __dirname);
console.info('[Bootstrap] Loading ts-node...');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
  },
});

console.info('[Bootstrap] ts-node loaded, requiring main.ts...');

try {
  // Load the actual main file
  require('./main.ts');
  console.info('[Bootstrap] main.ts loaded successfully');
} catch (error) {
  console.error('[Bootstrap] Error loading main.ts:', error);
}
