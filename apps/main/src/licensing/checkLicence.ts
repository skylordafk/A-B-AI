import axios from 'axios';
import Store from 'electron-store';

const store = new Store<{ cacheExpires: number; key: string }>({
  defaults: { cacheExpires: 0, key: '' },
});

export async function checkLicence(serverURL: string): Promise<boolean> {
  console.info('[License] Checking license with server:', serverURL);
  console.info('[License] NODE_ENV:', process.env.NODE_ENV);

  // Skip license check in development/test environments
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !serverURL) {
    console.info('[License] Skipping license check (dev/test mode or no server URL)');
    return true;
  }

  const now = Date.now();
  const { cacheExpires, key } = store.store;

  console.info('[License] Current license key:', key ? key.substring(0, 8) + '...' : 'none');
  console.info('[License] Cache expires:', new Date(cacheExpires).toISOString());

  // If no license key exists, return false immediately (should show activation page)
  if (!key) {
    console.info('[License] No license key found - should show activation');
    return false;
  }

  // Offline grace period - if we have a cached license and it's still valid
  if (key && cacheExpires > now) {
    console.info(
      '[License] Using cached license (valid until',
      new Date(cacheExpires).toISOString(),
      ')'
    );
    return true;
  }

  try {
    console.info('[License] Validating license with server...');
    const response = await axios.post(`${serverURL}/validate`, { key });
    if (response.data.valid) {
      // Cache for 72 hours
      store.set('cacheExpires', now + 72 * 60 * 60 * 1000);
      console.info('[License] License validated successfully');
      return true;
    }
    console.info('[License] License validation failed - invalid license');
  } catch (error) {
    console.info(
      '[License] Error validating license:',
      error instanceof Error ? error.message : String(error)
    );
    // If server is unreachable and we have a cached key, allow offline usage
    if (key && cacheExpires > 0) {
      console.warn('License server unreachable, using cached license');
      return true;
    }
    // In CI, allow the check to pass if server is unreachable
    if (process.env.CI) {
      console.warn('CI environment detected, bypassing license check');
      return true;
    }
    // If we have a license key but can't validate it, throw error (network issue)
    throw error;
  }

  // License key exists but is invalid
  return false;
}
