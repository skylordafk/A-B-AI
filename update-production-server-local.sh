#!/bin/bash
# Script to update production server with retrieve-license endpoint (run directly on server)

echo "🚀 Updating A-B/AI License Server with retrieve-license endpoint..."

# Make sure we're in the right directory
cd /root/abai-license-server

# Check if production-license-server.js exists
if [ ! -f "production-license-server.js" ]; then
    echo "❌ production-license-server.js not found in current directory"
    echo "Current directory: $(pwd)"
    echo "Files in directory:"
    ls -la
    exit 1
fi

# Backup current server file
cp production-license-server.js production-license-server.backup.js
echo "📦 Backed up current server file"

# Check if retrieve-license endpoint already exists
if grep -q "retrieve-license" production-license-server.js; then
    echo "⚠️  retrieve-license endpoint already exists in the server file"
    echo "Do you want to continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Update cancelled"
        exit 1
    fi
fi

# Add the retrieve-license endpoint to the server
cat >> production-license-server.js << 'ENDPOINT'

// Retrieve license by email endpoint
app.post('/retrieve-license', async (request, reply) => {
  const clientIP = request.ip || request.connection.remoteAddress || 'unknown';

  // Rate limiting
  if (!checkRateLimit(clientIP)) {
    return reply.code(429).send({ error: 'Rate limit exceeded. Please try again later.' });
  }

  try {
    const { email } = request.body;

    if (!email || !isValidEmail(email)) {
      return reply.code(400).send({ error: 'Valid email required' });
    }

    // Sanitize and normalize email
    const sanitizedEmail = email.trim().toLowerCase();

    // Find license by email
    const licenses = Array.from(licensesCache.values()).filter(
      (license) => license.email === sanitizedEmail && license.active
    );

    if (licenses.length === 0) {
      console.log(`No license found for email: ${sanitizedEmail}`);
      return reply.code(404).send({ error: 'No license found for this email' });
    }

    // Return the most recent license if multiple exist
    const mostRecentLicense = licenses.sort((a, b) => 
      new Date(b.created).getTime() - new Date(a.created).getTime()
    )[0];

    console.log(`Retrieved license for ${sanitizedEmail}: ${mostRecentLicense.key.substring(0, 8)}...`);

    return reply.send({ 
      licenseKey: mostRecentLicense.key,
      created: mostRecentLicense.created,
      active: mostRecentLicense.active
    });
  } catch (error) {
    console.error('License retrieval error:', error);
    return reply.code(500).send({ error: 'Failed to retrieve license' });
  }
});
ENDPOINT

echo "✅ Added retrieve-license endpoint to server file"

# Restart the server
echo "🔄 Restarting PM2 service..."
pm2 restart abai-license-server

if [ $? -eq 0 ]; then
    echo "✅ Server updated and restarted successfully!"
    echo "🎉 The retrieve-license endpoint is now available."
else
    echo "❌ Failed to restart PM2 service"
    echo "Restoring backup..."
    cp production-license-server.backup.js production-license-server.js
    echo "🔄 Attempting to restart with backup..."
    pm2 restart abai-license-server
fi 