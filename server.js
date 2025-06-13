const Fastify = require('fastify');
const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

// Initialize Stripe with your secret key
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ||
    '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'
);

// Initialize Fastify
const app = Fastify({
  logger: true,
  trustProxy: true,
});

// Webhook content type parser for raw body
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
  done(null, body);
});

// Simple file-based database for licenses
const DB_FILE = path.join(__dirname, 'licenses.json');

// In-memory cache for performance
let licensesCache = new Map();

// Simple rate limiting
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimitCache.get(ip) || [];

  // Remove old requests outside the window
  const validRequests = requests.filter((time) => now - time < RATE_LIMIT_WINDOW);

  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // Rate limited
  }

  // Add current request
  validRequests.push(now);
  rateLimitCache.set(ip, validRequests);

  return true; // OK
}

// Load licenses from file on startup
async function loadLicenses() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    const licenses = JSON.parse(data);
    licensesCache = new Map(Object.entries(licenses));
    console.log(`✅ Loaded ${licensesCache.size} licenses from database`);
  } catch (error) {
    console.log('📝 No existing license database found, starting fresh');
    licensesCache = new Map();
  }
}

// Save licenses to file
async function saveLicenses() {
  try {
    const licenses = Object.fromEntries(licensesCache);
    await fs.writeFile(DB_FILE, JSON.stringify(licenses, null, 2));
    console.log(`💾 Saved ${licensesCache.size} licenses to database`);
  } catch (error) {
    console.error('❌ Failed to save licenses:', error);
  }
}

// Create a new license
async function createLicense(email, stripeData = {}) {
  const licenseKey = uuidv4();
  const license = {
    key: licenseKey,
    email: email,
    created: new Date().toISOString(),
    active: true,
    stripeCustomerId: stripeData.customerId || null,
    stripeSubscriptionId: stripeData.subscriptionId || null,
    stripePriceId: stripeData.priceId || null,
    seats: 1,
  };

  licensesCache.set(licenseKey, license);
  await saveLicenses();

  console.log(`🔑 Created license for ${email}: ${licenseKey}`);
  return license;
}

// Validate license
async function validateLicense(key) {
  const license = licensesCache.get(key);
  return !!(license && license.active);
}

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (
    typeof email === 'string' && email.length > 0 && email.length < 255 && emailRegex.test(email)
  );
}

// CORS headers for browser requests
app.addHook('preHandler', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, stripe-signature');

  if (request.method === 'OPTIONS') {
    reply.code(200).send();
    return;
  }
});

// Health check endpoint
app.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    licenses: licensesCache.size,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

// License validation endpoint - MAIN ENDPOINT
app.post('/validate', async (request, reply) => {
  const clientIP = request.ip || request.connection.remoteAddress || 'unknown';

  // Rate limiting
  if (!checkRateLimit(clientIP)) {
    return reply.code(429).send({ error: 'Rate limit exceeded. Please try again later.' });
  }

  try {
    let bodyData;

    // Handle different request body formats
    if (Buffer.isBuffer(request.body)) {
      try {
        bodyData = JSON.parse(request.body.toString());
      } catch (e) {
        return reply.code(400).send({ error: 'Invalid JSON in request body' });
      }
    } else if (typeof request.body === 'object') {
      bodyData = request.body;
    } else if (typeof request.body === 'string') {
      try {
        bodyData = JSON.parse(request.body);
      } catch (e) {
        return reply.code(400).send({ error: 'Invalid JSON in request body' });
      }
    } else {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    const { key } = bodyData;

    if (!key) {
      return reply.code(400).send({ error: 'License key required' });
    }

    const isValid = await validateLicense(key);
    console.log(`🔍 License validation: ${key.substring(0, 8)}... -> ${isValid}`);

    return reply.send({ valid: isValid });
  } catch (error) {
    console.error('❌ Validation error:', error);
    return reply.code(500).send({ error: 'Validation failed' });
  }
});

// Stripe webhook endpoint
app.post('/webhook', async (request, reply) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your_webhook_secret_here';

  let event;

  try {
    // Get raw body for webhook verification
    const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.from(request.body);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log(`📨 Received webhook: ${event.type}`);
  } catch (err) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return reply.code(400).send({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`💳 Payment completed for session: ${session.id}`);

        // Create license for the customer
        if (session.customer_email) {
          await createLicense(session.customer_email, {
            customerId: session.customer,
            subscriptionId: session.subscription,
            priceId: session.display_items?.[0]?.price?.id,
          });
        }
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        console.log(`🚫 Subscription cancelled: ${subscription.id}`);

        // Deactivate licenses for this subscription
        for (const [key, license] of licensesCache.entries()) {
          if (license.stripeSubscriptionId === subscription.id) {
            license.active = false;
            console.log(`🔒 Deactivated license: ${key}`);
          }
        }
        await saveLicenses();
        break;

      default:
        console.log(`🤷 Unhandled event type: ${event.type}`);
    }

    return reply.send({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return reply.code(500).send({ error: 'Webhook processing failed' });
  }
});

// License activation endpoint (for manual license creation)
app.post('/activate', async (request, reply) => {
  const clientIP = request.ip || request.connection.remoteAddress || 'unknown';

  // Rate limiting
  if (!checkRateLimit(clientIP)) {
    return reply.code(429).send({ error: 'Rate limit exceeded. Please try again later.' });
  }

  try {
    let bodyData;

    // Handle different request body formats
    if (Buffer.isBuffer(request.body)) {
      try {
        bodyData = JSON.parse(request.body.toString());
      } catch (e) {
        return reply.code(400).send({ error: 'Invalid JSON in request body' });
      }
    } else if (typeof request.body === 'object') {
      bodyData = request.body;
    } else if (typeof request.body === 'string') {
      try {
        bodyData = JSON.parse(request.body);
      } catch (e) {
        return reply.code(400).send({ error: 'Invalid JSON in request body' });
      }
    } else {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    const { email } = bodyData;

    if (!email || !isValidEmail(email)) {
      return reply.code(400).send({ error: 'Valid email required' });
    }

    const license = await createLicense(email);
    return reply.send({ 
      success: true, 
      licenseKey: license.key,
      email: license.email 
    });
  } catch (error) {
    console.error('❌ Activation error:', error);
    return reply.code(500).send({ error: 'Activation failed' });
  }
});

// Retrieve license by email endpoint
app.post('/retrieve-license', async (request, reply) => {
  const clientIP = request.ip || request.connection.remoteAddress || 'unknown';

  // Rate limiting
  if (!checkRateLimit(clientIP)) {
    return reply.code(429).send({ error: 'Rate limit exceeded. Please try again later.' });
  }

  try {
    let bodyData;

    // Handle different request body formats
    if (Buffer.isBuffer(request.body)) {
      try {
        bodyData = JSON.parse(request.body.toString());
      } catch (e) {
        return reply.code(400).send({ error: 'Invalid JSON in request body' });
      }
    } else if (typeof request.body === 'object') {
      bodyData = request.body;
    } else if (typeof request.body === 'string') {
      try {
        bodyData = JSON.parse(request.body);
      } catch (e) {
        return reply.code(400).send({ error: 'Invalid JSON in request body' });
      }
    } else {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    const { email } = bodyData;

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
      console.log(`❌ No license found for email: ${sanitizedEmail}`);
      return reply.code(404).send({ error: 'No license found for this email' });
    }

    // Return the most recent license if multiple exist
    const mostRecentLicense = licenses.sort((a, b) => 
      new Date(b.created).getTime() - new Date(a.created).getTime()
    )[0];

    console.log(`✅ Retrieved license for ${sanitizedEmail}: ${mostRecentLicense.key.substring(0, 8)}...`);

    return reply.send({ 
      licenseKey: mostRecentLicense.key,
      created: mostRecentLicense.created,
      active: mostRecentLicense.active
    });
  } catch (error) {
    console.error('❌ License retrieval error:', error);
    return reply.code(500).send({ error: 'Failed to retrieve license' });
  }
});

// Get license info endpoint

// Start the server
async function start() {
  try {
    await loadLicenses();
    
    const port = process.env.PORT || 4100;
    const host = '0.0.0.0'; // Listen on all interfaces
    
    await app.listen({ port, host });
    console.log(`🚀 Server listening on http://${host}:${port}`);
    console.log(`🌐 Health check: http://${host}:${port}/health`);
    console.log(`🔑 License validation: http://${host}:${port}/validate`);
    console.log(`📨 Stripe webhook: http://${host}:${port}/webhook`);
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  await saveLicenses();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down server...');
  await saveLicenses();
  process.exit(0);
});

start(); 