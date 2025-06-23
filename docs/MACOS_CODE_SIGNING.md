# macOS Code Signing Guide

## Problem
macOS users see "The disk you attached was not readable by this computer" or similar Gatekeeper warnings because the app isn't code-signed.

## Solution Overview
To distribute macOS apps without warnings, you need:
1. Apple Developer Account ($99/year)
2. Developer ID Application certificate
3. Code signing configuration
4. Notarization setup

## Step 1: Get Apple Developer Account
1. Sign up at [developer.apple.com](https://developer.apple.com)
2. Pay the $99 annual fee
3. Verify your account

## Step 2: Create Certificates
1. Open **Keychain Access** on your Mac
2. Go to **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority**
3. Enter your email and name, select "Saved to disk"
4. Go to [developer.apple.com/certificates](https://developer.apple.com/certificates)
5. Create a new **Developer ID Application** certificate
6. Upload your certificate request file
7. Download and install the certificate

## Step 3: Update electron-builder.yml
```yaml
mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch: [x64, arm64]
  artifactName: ${productName}-${version}-${arch}.${ext}
  identity: "Developer ID Application: Your Name (TEAM_ID)"
  hardenedRuntime: true
  gatekeeperAssess: false
  notarize:
    teamId: "YOUR_TEAM_ID"
  extendInfo:
    NSHighResolutionCapable: true
```

## Step 4: Set Up Notarization
1. Create an app-specific password:
   - Go to [appleid.apple.com](https://appleid.apple.com)
   - Sign in → Security → App-Specific Passwords
   - Generate a new password for "Electron Builder"
2. Add to your environment:
   ```bash
   export APPLE_ID="your-apple-id@email.com"
   export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
   export APPLE_TEAM_ID="your-team-id"
   ```

## Step 5: Update GitHub Actions
Add these secrets to your repository:
- `APPLE_ID`: Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Your team ID
- `CSC_LINK`: Base64-encoded p12 certificate
- `CSC_KEY_PASSWORD`: Certificate password

Update `.github/workflows/package.yml`:
```yaml
- name: Build for macOS
  if: matrix.os == 'macos-latest'
  env:
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    CSC_LINK: ${{ secrets.CSC_LINK }}
    CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
  run: pnpm package
```

## Temporary User Workaround
Until code signing is implemented, users can:
1. **Right-click** the DMG and select "Open"
2. Go to **System Preferences → Security & Privacy → General** and click "Open Anyway"
3. **Control+Click** the DMG and select "Open"

## Cost Consideration
- Apple Developer Account: $99/year
- Alternative: Document the workaround clearly in releases

## Testing
Test signed builds with:
```bash
spctl -a -t exec -vv /path/to/your/app.app
codesign -dv --verbose=4 /path/to/your/app.app
``` 