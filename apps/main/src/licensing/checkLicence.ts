import axios from 'axios';
import Store from 'electron-store';

const store = new Store<{cacheExpires: number, key: string}>({
  defaults: {cacheExpires: 0, key: ''}
});

export async function checkLicence(serverURL: string): Promise<boolean> {
  // Skip license check in development/test environments
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !serverURL) {
    return true;
  }

  const now = Date.now();
  const {cacheExpires, key} = store.store;
  
  // Offline grace period
  if (key && cacheExpires > now) { 
    return true; 
  }

  try {
    const response = await axios.post(`${serverURL}/validate`, {key});
    if (response.data.valid) {
      // Cache for 72 hours
      store.set('cacheExpires', now + 72 * 60 * 60 * 1000);
      return true;
    }
  } catch (error) {
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
    throw error;
  }
  
  return false;
} 