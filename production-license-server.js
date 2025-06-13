const Fastify = require('fastify');
const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_live_your_secret_key_here');

// Initialize Fastify
const app = Fastify({
  logger: true,
});

// Add content type parser for webhooks (raw body)
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
  done(null, body);
});

// Simple file-based database for licenses (you can upgrade to PostgreSQL/MongoDB later)
const DB_FILE = path.join(__dirname, 'licenses.json');

// In-memory cache for performance
let licensesCache = new Map();

// Simple rate limiting - track requests per IP
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

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
    console.log(`Loaded ${licensesCache.size} licenses from database`);
  } catch (error) {
    console.log('No existing license database found, starting fresh');
    licensesCache = new Map();
  }
}

// Save licenses to file
async function saveLicenses() {
  try {
    const licenses = Object.fromEntries(licensesCache);
    await fs.writeFile(DB_FILE, JSON.stringify(licenses, null, 2));
    console.log(`Saved ${licensesCache.size} licenses to database`);
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

  console.log(`Created license for ${email}: ${licenseKey}`);
  return license;
}

// Validate license
async function validateLicense(key) {
  const license = licensesCache.get(key);
  return !!(license && license.active); // Convert undefined to false
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
  return { status: 'healthy', licenses: licensesCache.size };
});

// Stripe webhook endpoint - CRITICAL for production
app.post('/webhook', async (request, reply) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    return reply.code(400).send({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    // Verify webhook signature - use request.body for buffer data
    const rawBody = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(JSON.stringify(request.body));
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log(`Received webhook: ${event.type}`);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return reply.code(400).send({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Processing completed checkout session:', session.id);

        // Create license for successful payment
        const license = await createLicense(session.customer_email, {
          customerId: session.customer,
          subscriptionId: session.subscription,
          priceId: session.line_items?.data?.[0]?.price?.id,
        });

        // TODO: Send license key via email here
        console.log(`License created for payment: ${license.key}`);
        break;

      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        const subscription = event.data.object;
        console.log('Subscription canceled:', subscription.id);

        // Deactivate licenses associated with this subscription
        for (const [key, license] of licensesCache.entries()) {
          if (license.stripeSubscriptionId === subscription.id) {
            license.active = false;
            console.log(`Deactivated license: ${key}`);
          }
        }
        await saveLicenses();
        break;

      case 'invoice.payment_failed':
        // Handle failed payment
        const invoice = event.data.object;
        console.log('Payment failed for subscription:', invoice.subscription);
        // Could temporarily deactivate license or send notification
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return reply.send({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return reply.code(500).send({ error: 'Webhook processing failed' });
  }
});

// License validation endpoint
app.post('/validate', async (request, reply) => {
  // Rate limiting for validation endpoint
  const clientIP = request.ip || request.connection.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIP)) {
    return reply.code(429).send({ error: 'Rate limit exceeded. Please try again later.' });
  }

  try {
    const { key } = request.body;

    if (!key) {
      return reply.code(400).send({ error: 'License key required' });
    }

    const isValid = await validateLicense(key);
    console.log(`License validation: ${key} -> ${isValid}`);

    return reply.send({ valid: isValid });
  } catch (error) {
    console.error('Validation error:', error);
    return reply.code(500).send({ error: 'Validation failed' });
  }
});

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (
    typeof email === 'string' &&
    email.length > 0 &&
    email.length < 255 &&
    emailRegex.test(email) &&
    !email.includes('<') &&
    !email.includes('>') &&
    !email.includes('"') &&
    !email.includes("'") &&
    !email.includes('&') &&
    !email.includes(';')
  );
}

// Development-only activation endpoint (bypasses Stripe for testing)
app.post('/activate', async (request, reply) => {
  // Rate limiting
  const clientIP = request.ip || request.connection.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIP)) {
    return reply.code(429).send({ error: 'Rate limit exceeded. Please try again later.' });
  }

  // Only allow in development or with special flag
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ACTIVATION) {
    return reply.code(403).send({
      error: 'Direct activation disabled in production. Use Stripe checkout.',
    });
  }

  try {
    const { email } = request.body;

    if (!email) {
      return reply.code(400).send({ error: 'Email required' });
    }

    // Validate email format and prevent malicious input
    if (!isValidEmail(email)) {
      return reply.code(400).send({ error: 'Invalid email format' });
    }

    // Sanitize email (remove any potential XSS)
    const sanitizedEmail = email.trim().toLowerCase();

    const license = await createLicense(sanitizedEmail);
    console.log(`Development activation for ${sanitizedEmail}: ${license.key}`);

    return reply.send({ licenceKey: license.key });
  } catch (error) {
    console.error('Activation error:', error);
    return reply.code(500).send({ error: 'Activation failed' });
  }
});

// Get license info (for admin purposes)
app.get('/license/:key', async (request, reply) => {
  const { key } = request.params;
  const license = licensesCache.get(key);

  if (!license) {
    return reply.code(404).send({ error: 'License not found' });
  }

  // Return license info without sensitive data
  return reply.send({
    email: license.email,
    created: license.created,
    active: license.active,
    seats: license.seats,
  });
});

// Admin endpoint to list all licenses (protect this in production!)
app.get('/admin/licenses', async (request, reply) => {
  // Add authentication here in production
  const licenses = Array.from(licensesCache.values()).map((license) => ({
    key: license.key,
    email: license.email,
    created: license.created,
    active: license.active,
    seats: license.seats,
  }));

  return reply.send({ licenses, total: licenses.length });
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  console.error('Server error:', error);
  reply.code(500).send({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    console.log('Loading licenses from database...');
    await loadLicenses();

    console.log('Starting license server...');
    await app.listen({ port: 4100, host: '0.0.0.0' });

    console.log('🚀 A-B/AI License Server running on port 4100');
    console.log('📊 Health check: http://your-server:4100/health');
    console.log('🔗 Webhook URL: http://your-server:4100/webhook');
    console.log(`💾 Database: ${DB_FILE}`);
    console.log(`🔑 Loaded ${licensesCache.size} licenses`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await saveLicenses();
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await saveLicenses();
  await app.close();
  process.exit(0);
});

start();
