import path from 'path';
import fs from 'fs/promises';
// import axios from 'axios';
import { app } from 'electron';
// import Store from 'electron-store';

// const store = new Store();

const _GUMROAD_PRODUCT_ID = 'YOUR_GUMROAD_PRODUCT_ID';

export async function checkLicence(): Promise<boolean> {
  // License check is now bypassed
  return true;
}

export async function validateLicense(_key: string): Promise<{
  valid: boolean;
  plan?: string;
  expires?: string;
}> {
  const _LICENSE_SERVER_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate';
  // const GUMROAD_API_URL = `https://api.gumroad.com/v2/licenses/verify`;

  try {
    // const response = await axios.post(_LICENSE_SERVER_URL, {
    //   license_key: _key.trim(),
    // });

    // Gumroad (example)
    // const gumroadResponse = await axios.post(GUMROAD_API_URL, {
    //   product_permalink: _GUMROAD_PRODUCT_ID,
    //   license_key: _key.trim(),
    // });

    // if (gumroadResponse.data.success) {
    //   const { uses, purchase } = gumroadResponse.data;
    //   const isSubscription = purchase.is_subscription;
    //   const isActive = !purchase.chargebacked && !purchase.refunded;
    //   if (isActive) {
    //     return {
    //       valid: true,
    //       plan: isSubscription ? 'Subscription' : 'Lifetime',
    //       expires: purchase.subscription_ends_at,
    //     };
    //   }
    // }

    // if (response.data.valid) {
    //   return {
    //     valid: true,
    //     plan: response.data.plan,
    //     expires: response.data.expires,
    //   };
    // }

    return {
      valid: false,
    };
  } catch (error) {
    return {
      valid: false,
    };
  }
}

export async function storeLicenseKey(key: string) {
  const licenseDir = path.join(app.getPath('userData'), 'licenses');
  await fs.mkdir(licenseDir, { recursive: true });
  const licenseFile = path.join(licenseDir, 'license.key');
  await fs.writeFile(licenseFile, key, 'utf-8');
  // store.set('licenseKey', key);
}

export async function getStoredLicenseKey(): Promise<string | null> {
  const licenseDir = path.join(app.getPath('userData'), 'licenses');
  const licenseFile = path.join(licenseDir, 'license.key');

  try {
    if (await fs.stat(licenseFile).catch(() => null)) {
      return fs.readFile(licenseFile, 'utf-8');
    }
    return null;
  } catch {
    return null;
  }
  // return store.get('licenseKey', null);
}
