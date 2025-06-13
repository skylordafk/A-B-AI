# 🔧 Production Server Fix Instructions

## Issue

The production server has a JSON parsing problem that prevents the `/validate` and `/activate` endpoints from working correctly.

## Root Cause

The secure version of the license server (`production-license-server-secure.js`) has this line:

```javascript
// Add content type parser for webhooks (raw body)
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
  done(null, body);
});
```

This breaks JSON parsing for all endpoints except webhooks.

## Solution

The webhook endpoint needs special handling, but other endpoints need normal JSON parsing.

## Quick Fix (SSH to your server and run these commands):

```bash
# SSH to your production server
ssh root@159.223.155.150

# Go to the license server directory
cd /root/abai-license-server

# Backup the current file
cp production-license-server-secure.js production-license-server-secure.js.backup

# Edit the file to fix JSON parsing
nano production-license-server-secure.js
```

## Replace lines 19-24 with:

```javascript
// Add content type parser for webhooks (raw body only for webhook endpoint)
app.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
  // For webhook endpoint, keep as buffer for signature verification
  if (req.url === '/webhook') {
    done(null, Buffer.from(body));
  } else {
    // For other endpoints, parse as JSON


```

## After making the change:

```bash
# Restart the server
pm2 restart abai-license-server

# Verify it's running
pm2 status

# Test the fix
curl -X POST https://license.spventerprises.com/validate \
  -H "Content-Type: application/json" \
  -d '{"key":"test-key"}'
```

## Expected Response After Fix:

```json
{ "valid": false }
```

Instead of:

```json
{ "error": "License key required" }
```

## Alternative: Deploy the Standard Version

If you prefer, you can deploy the standard version which doesn't have this issue:

```bash
# Copy the standard version
cp production-license-server.js production-license-server-secure.js

# Restart
pm2 restart abai-license-server
```

The standard version has all the essential features needed for customer use.
