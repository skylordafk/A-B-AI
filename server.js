import Fastify from 'fastify';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

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

// Webhook content type parser for raw body only for webhook endpoint
app.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
  // For webhook endpoint, keep as buffer for signature verification
  if (req.url === '/webhook') {
    done(null, Buffer.from(body));
  } else {
    // For other endpoints, parse as JSON
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (error) {
      done(error, undefined);
    }
  }
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
    console.warn(`Loaded ${licensesCache.size} licenses from database`);
  } catch (error) {
    console.warn('No existing license database found, starting fresh');
    licensesCache = new Map();
  }
}

// Save licenses to file
async function saveLicenses() {
  try {
    const licenses = Object.fromEntries(licensesCache);
    await fs.writeFile(DB_FILE, JSON.stringify(licenses, null, 2));
    console.warn(`Saved ${licensesCache.size} licenses to database`);
  } catch (error) {
    console.error('Failed to save licenses:', error);
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

  console.warn(`Created license for ${email}: ${licenseKey}`);
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
app.get('/health', async (_request, _reply) => {
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
    const { key } = request.body;

    if (!key) {
      return reply.code(400).send({ error: 'License key required' });
    }

    const isValid = await validateLicense(key);
    console.warn(`License validation: ${key.substring(0, 8)}... -> ${isValid}`);

    return reply.send({ valid: isValid });
  } catch (error) {
    console.error('Validation error:', error);
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
    // body is already a buffer due to content type parser for /webhook
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    console.warn(`Received webhook: ${event.type}`);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return reply.code(400).send({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.warn(`Payment completed for session: ${session.id}`);

        // Create license for the customer
        if (session.customer_email) {
          await createLicense(session.customer_email, {
            customerId: session.customer,
            subscriptionId: session.subscription,
            priceId: session.display_items?.[0]?.price?.id,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.warn(`Subscription cancelled: ${subscription.id}`);

        // Deactivate licenses for this subscription
        for (const [key, license] of licensesCache.entries()) {
          if (license.stripeSubscriptionId === subscription.id) {
            license.active = false;
            console.warn(`Deactivated license: ${key}`);
          }
        }
        await saveLicenses();
        break;
      }

      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    return reply.send({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
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
    const { email } = request.body;

    if (!email || !isValidEmail(email)) {
      return reply.code(400).send({ error: 'Valid email required' });
    }

    const license = await createLicense(email);
    return reply.send({
      success: true,
      licenseKey: license.key,
      email: license.email,
    });
  } catch (error) {
    console.error('Activation error:', error);
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
      console.warn(`No license found for email: ${sanitizedEmail}`);
      return reply.code(404).send({ error: 'No license found for this email' });
    }

    // Return the most recent license if multiple exist
    const mostRecentLicense = licenses.sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    )[0];

    console.warn(
      `Retrieved license for ${sanitizedEmail}: ${mostRecentLicense.key.substring(0, 8)}...`
    );

    return reply.send({
      licenseKey: mostRecentLicense.key,
      created: mostRecentLicense.created,
      active: mostRecentLicense.active,
    });
  } catch (error) {
    console.error('License retrieval error:', error);
    return reply.code(500).send({ error: 'Failed to retrieve license' });
  }
});

// Get license info endpoint

// Start the server
async function start() {
  try {
    await loadLicenses();

    const port = process.env.PORT || 4100;
    const host = '0.0.00'; // Listen on all interfaces

    await app.listen({ port, host });
    console.warn(`Server listening on http://${host}:${port}`);
    console.warn(`Health check: http://${host}:${port}/health`);
    console.warn(`License validation: http://${host}:${port}/validate`);
    console.warn(`Stripe webhook: http://${host}:${port}/webhook`);
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.warn('Shutting down server...');
  await saveLicenses();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.warn('Shutting down server...');
  await saveLicenses();
  process.exit(0);
});

start();
