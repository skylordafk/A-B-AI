import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let Store: any;

async function findElectronStore(): Promise<any> {
  const possiblePaths = [
    // Standard npm install
    'electron-store',

    // pnpm paths from development
    '../../../node_modules/.pnpm/electron-store@8.1.0/node_modules/electron-store',
    '../../../../node_modules/.pnpm/electron-store@8.1.0/node_modules/electron-store',

    // Packaged app paths
    path.join(app.getAppPath(), 'node_modules/electron-store'),
    path.join(
      app.getAppPath(),
      'node_modules/.pnpm/electron-store@8.1.0/node_modules/electron-store'
    ),

    // Alternative packaged paths
    path.join(process.resourcesPath, 'app/node_modules/electron-store'),
    path.join(
      process.resourcesPath,
      'app/node_modules/.pnpm/electron-store@8.1.0/node_modules/electron-store'
    ),
  ];

  for (const modulePath of possiblePaths) {
    try {
      const store = await import(modulePath);

      return store.default || store;
    } catch (e) {
      // Continue to next path
    }
  }

  // If all else fails, try to find it in the file system
  try {
    const appPath = app.getAppPath();
    const searchPaths = [
      path.join(appPath, 'node_modules'),
      path.join(process.resourcesPath, 'app/node_modules'),
    ];

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        // Look for electron-store directly
        const directPath = path.join(searchPath, 'electron-store');
        if (fs.existsSync(directPath)) {
          const store = await import(directPath);
          return store.default || store;
        }

        // Look in .pnpm directory
        const pnpmPath = path.join(searchPath, '.pnpm');
        if (fs.existsSync(pnpmPath)) {
          const pnpmDirs = fs.readdirSync(pnpmPath);
          for (const dir of pnpmDirs) {
            if (dir.startsWith('electron-store@')) {
              const storePath = path.join(pnpmPath, dir, 'node_modules', 'electron-store');
              if (fs.existsSync(storePath)) {
                const store = await import(storePath);
                return store.default || store;
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[electronStore] File system search failed:', e);
  }

  throw new Error('Could not find electron-store module');
}

// Initialize store asynchronously
(async () => {
  try {
    Store = await findElectronStore();
  } catch (e) {
    console.error('[electronStore] Failed to load electron-store:', e);
    // Create a mock store as fallback
    Store = class MockStore {
      private data: Record<string, any> = {};

      get(key: string) {
        return this.data[key];
      }

      set(key: string, value: any) {
        this.data[key] = value;
      }

      delete(key: string) {
        delete this.data[key];
      }

      clear() {
        this.data = {};
      }
    };
  }
})();

export default Store;
