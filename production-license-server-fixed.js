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
        console.log('💳 Processing completed checkout session:', session.id);

        if (session.customer_email) {
          const license = await createLicense(session.customer_email, {
            customerId: session.customer,
            subscriptionId: session.subscription,
            priceId: session.line_items?.data?.[0]?.price?.id,
          });
          console.log(`✅ License created for payment: ${license.key}`);
        }
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        console.log('❌ Subscription canceled:', subscription.id);

        // Deactivate licenses associated with this subscription
        for (const [key, license] of licensesCache.entries()) {
          if (license.stripeSubscriptionId === subscription.id) {
            license.active = false;
            console.log(`🚫 Deactivated license: ${key}`);
          }
        }
        await saveLicenses();
        break;

      case 'invoice.payment_failed':
        const invoice = event.data.object;
        console.log('💸 Payment failed for subscription:', invoice.subscription);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return reply.send({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return reply.code(500).send({ error: 'Webhook processing failed' });
  }
});

// Development activation endpoint (for testing)
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

    if (!email) {
      return reply.code(400).send({ error: 'Email required' });
    }

    if (!isValidEmail(email)) {
      return reply.code(400).send({ error: 'Invalid email format' });
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const license = await createLicense(sanitizedEmail);
    console.log(`🧪 Development activation for ${sanitizedEmail}: ${license.key}`);

    return reply.send({ licenseKey: license.key });
  } catch (error) {
    console.error('❌ Activation error:', error);
    return reply.code(500).send({ error: 'Activation failed' });
  }
});

// Get license info
app.get('/license/:key', async (request, reply) => {
  const { key } = request.params;
  const license = licensesCache.get(key);

  if (!license) {
    return reply.code(404).send({ error: 'License not found' });
  }

  return reply.send({
    email: license.email,
    created: license.created,
    active: license.active,
    seats: license.seats,
  });
});

// Admin endpoint to list all licenses
app.get('/admin/licenses', async (request, reply) => {
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
  console.error('❌ Server error:', error);
  reply.code(500).send({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    console.log('🔄 Loading licenses from database...');
    await loadLicenses();

    console.log('🚀 Starting A-B/AI License Server...');
    await app.listen({ port: 4100, host: '0.0.0.0' });

    console.log('');
    console.log('🎉 A-B/AI License Server is RUNNING!');
    console.log('📍 Port: 4100');
    console.log('📊 Health check: http://your-server:4100/health');
    console.log('🔗 Webhook URL: http://your-server:4100/webhook');
    console.log('🔍 Validate URL: http://your-server:4100/validate');
    console.log(`💾 Database: ${DB_FILE}`);
    console.log(`🔑 Loaded ${licensesCache.size} licenses`);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await saveLicenses();
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await saveLicenses();
  await app.close();
  process.exit(0);
});

// Start the server
start();
