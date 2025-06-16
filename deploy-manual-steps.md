# Manual Deployment Steps for Windows

Since the automated script didn't work from Windows, let's deploy manually:

## Step 1: Upload Files to Server

### Option A: Using SCP (if you have it)

```bash
scp production-license-server.js root@159.223.155.150:/root/
scp production-package.json root@159.223.155.150:/root/package.json
```

### Option B: Copy-paste method (easier for Windows)

1. **SSH to your server:**

   ```bash
   ssh root@159.223.155.150
   ```

2. **Stop the current server:**

   ```bash
   pm2 stop all
   pm2 delete all
   ```

3. **Create the new server file:**

   ```bash
   nano production-license-server.js
   ```

   Then copy-paste the entire contents of your local `production-license-server.js` file

4. **Create package.json:**

   ```bash
   nano package.json
   ```

   Then copy-paste the contents of your local `production-package.json` file

5. **Create environment file:**

   ```bash
   nano .env
   ```

   Add:

   ```env
   STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   NODE_ENV=production
   PORT=4100
   ```

6. **Install dependencies:**

   ```bash
   npm install
   ```

7. **Start the new server:**
   ```bash
   node production-license-server.js
   ```

If it starts successfully (you'll see the startup messages), then:

8. **Set up PM2:**
   ```bash
   # Stop the test run (Ctrl+C)
   pm2 start production-license-server.js --name "abai-license-server"
   pm2 save
   pm2 startup
   ```

## Step 2: Test the new server

From your local machine:

```bash
node test-production-integration.js
```

All tests should now pass!
