const Fastify = require('fastify');
const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_live_your_secret_key_here');

// Admin API key for secure endpoints
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || crypto.randomBytes(32).toString('hex');

// Initialize Fastify with security settings
const app = Fastify({
  logger: true,
  trustProxy: true, // Enable trust proxy for rate limiting
  bodyLimit: 1048576, // 1MB limit
});

// Add content type parser for webhooks (raw body)
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
  done(null, body);
});

// Simple file-based databases
const DB_FILE = path.join(__dirname, 'licenses.json');
const EVENTS_FILE = path.join(__dirname, 'processed-events.json');

// In-memory caches for performance
let licensesCache = new Map();
let processedEventsCache = new Set();

// Enhanced rate limiting - track requests per IP and endpoint
const rateLimitCache = new Map();
const RATE_LIMITS = {
  '/validate': { window: 60 * 1000, max: 20 }, // 20 requests per minute
  '/activate': { window: 60 * 1000, max: 5 }, // 5 requests per minute
  '/webhook': { window: 60 * 1000, max: 100 }, // 100 webhooks per minute
  '/retrieve-license': { window: 60 * 1000, max: 5 }, // 5 requests per minute
  default: { window: 60 * 1000, max: 30 }, // 30 requests per minute default
};

function checkRateLimit(ip, endpoint) {
  const now = Date.now();
  const key = `${ip}:${endpoint}`;
  const limit = RATE_LIMITS[endpoint] || RATE_LIMITS.default;

  const requests = rateLimitCache.get(key) || [];

  // Remove old requests outside the window
  const validRequests = requests.filter((time) => now - time < limit.window);

  if (validRequests.length >= limit.max) {
    console.warn(`Rate limit exceeded for ${ip} on ${endpoint}`);
    return false; // Rate limited
  }

  // Add current request
  validRequests.push(now);
  rateLimitCache.set(key, validRequests);

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

// Load processed events for idempotency
async function loadProcessedEvents() {
  try {
    const data = await fs.readFile(EVENTS_FILE, 'utf8');
    const events = JSON.parse(data);
    processedEventsCache = new Set(events);
    console.log(`Loaded ${processedEventsCache.size} processed events`);
  } catch (error) {
    console.log('No existing events database found, starting fresh');
    processedEventsCache = new Set();
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

// Save processed events
async function saveProcessedEvents() {
  try {
    const events = Array.from(processedEventsCache);
    await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));
  } catch (error) {
    console.error('Failed to save processed events:', error);
  }
}

// Check if event was already processed (idempotency)
function isEventProcessed(eventId) {
  return processedEventsCache.has(eventId);
}

// Mark event as processed
async function markEventProcessed(eventId) {
  processedEventsCache.add(eventId);

  // Keep only recent events (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentEvents = Array.from(processedEventsCache).filter((id) => {
    // Extract timestamp from event ID if possible
    const match = id.match(/evt_(\d+)/);
    if (match) {
      const timestamp = parseInt(match[1]) * 1000;
      return timestamp > sevenDaysAgo;
    }
    return true; // Keep if we can't parse timestamp
  });

  processedEventsCache = new Set(recentEvents);
  await saveProcessedEvents();
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
    lastValidated: null,
    validationCount: 0,
  };

  licensesCache.set(licenseKey, license);
  await saveLicenses();

  console.log(`Created license for ${email}: ${licenseKey}`);
  return license;
}

// Validate license with usage tracking
async function validateLicense(key) {
  const license = licensesCache.get(key);
  if (license && license.active) {
    // Update usage tracking
    license.lastValidated = new Date().toISOString();
    license.validationCount = (license.validationCount || 0) + 1;

    // Save periodically (every 10 validations)
    if (license.validationCount % 10 === 0) {
      await saveLicenses();
    }

    return true;
  }
  return false;
}

// Admin authentication middleware
function requireAdminAuth(request, reply, done) {
  const authHeader = request.headers.authorization;
  const apiKey =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.headers['x-api-key'];

  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    reply.code(401).send({ error: 'Unauthorized. Valid API key required.' });
    return;
  }

  done();
}

// Security headers and CORS
app.addHook('preHandler', async (request, reply) => {
  // Security headers
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CORS headers for browser requests
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  reply.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key, stripe-signature'
  );

  if (request.method === 'OPTIONS') {
    reply.code(200).send();
    return;
  }
});

// Request logging for audit trail
app.addHook('onRequest', async (request, reply) => {
  const ip = request.ip || request.connection.remoteAddress || 'unknown';
  console.log(`${new Date().toISOString()} - ${request.method} ${request.url} - IP: ${ip}`);
});

// Health check endpoint
app.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    licenses: licensesCache.size,
    processedEvents: processedEventsCache.size,
    timestamp: new Date().toISOString(),
  };
});

// Stripe webhook endpoint - CRITICAL for production
app.post('/webhook', async (request, reply) => {
  const ip = request.ip || request.connection.remoteAddress || 'unknown';

  // Rate limiting
  if (!checkRateLimit(ip, '/webhook')) {
    return reply.code(429).send({ error: 'Rate limit exceeded' });
  }

  const sig = request.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    return reply.code(500).send({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    // Verify webhook signature - use request.body for buffer data
    const rawBody = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(JSON.stringify(request.body));
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log(`Received webhook: ${event.type} (${event.id})`);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return reply.code(400).send({ error: 'Invalid signature' });
  }

  try {
    // Check for idempotency - prevent duplicate processing
    if (isEventProcessed(event.id)) {
      console.log(`Event ${event.id} already processed, skipping`);
      return reply.send({ received: true, processed: false, reason: 'already_processed' });
    }

    // Mark event as being processed
    await markEventProcessed(event.id);

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Processing completed checkout session:', session.id);

        if (session.payment_status === 'paid') {
          // Create license for successful payment
          const license = await createLicense(session.customer_email, {
            customerId: session.customer,
            subscriptionId: session.subscription,
            priceId: session.line_items?.data?.[0]?.price?.id,
          });

          console.log(`License created for payment: ${license.key}`);
        } else {
          console.log(`Checkout session not paid: ${session.payment_status}`);
        }
        break;

      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        const subscription = event.data.object;
        console.log('Subscription canceled:', subscription.id);

        // Deactivate licenses associated with this subscription
        let deactivatedCount = 0;
        for (const [key, license] of licensesCache.entries()) {
          if (license.stripeSubscriptionId === subscription.id) {
            license.active = false;
            license.deactivatedAt = new Date().toISOString();
            license.deactivationReason = 'subscription_canceled';
            deactivatedCount++;
            console.log(`Deactivated license: ${key}`);
          }
        }

        if (deactivatedCount > 0) {
          await saveLicenses();
        }
        break;

      case 'invoice.payment_failed':
        // Handle failed payment
        const invoice = event.data.object;
        console.log('Payment failed for subscription:', invoice.subscription);

        // Mark licenses as payment failed (but don't deactivate immediately)
        for (const [key, license] of licensesCache.entries()) {
          if (license.stripeSubscriptionId === invoice.subscription) {
            license.paymentFailed = true;
            license.lastPaymentFailure = new Date().toISOString();
            console.log(`Payment failed for license: ${key}`);
          }
        }
        await saveLicenses();
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return reply.send({ received: true, processed: true, eventType: event.type });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return reply.code(500).send({ error: 'Webhook processing failed' });
  }
});

// License validation endpoint
app.post('/validate', async (request, reply) => {
  const ip = request.ip || request.connection.remoteAddress || 'unknown';

  // Rate limiting for validation endpoint
  if (!checkRateLimit(ip, '/validate')) {
    return reply.code(429).send({ error: 'Rate limit exceeded. Please try again later.' });
  }

  try {
    const { key } = request.body;

    if (!key) {
      return reply.code(400).send({ error: 'License key required' });
    }

    // Validate key format (basic check)
    if (typeof key !== 'string' || key.length < 10) {
      return reply.code(400).send({ error: 'Invalid license key format' });
    }

    const isValid = await validateLicense(key);
    console.log(`License validation: ${key.substring(0, 8)}... -> ${isValid}`);

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
    !email.includes(';') &&
    !email.includes('\\') &&
    !email.includes('/')
  );
}

// Development-only activation endpoint (bypasses Stripe for testing)
app.post('/activate', async (request, reply) => {
  const ip = request.ip || request.connection.remoteAddress || 'unknown';

  // Rate limiting
  if (!checkRateLimit(ip, '/activate')) {
    return reply.code(429).send({ error: 'Rate limit exceeded. Please try again later.' });
  }

  // SECURITY: Only allow in development or with special flag
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ACTIVATION) {
    console.warn(`Direct activation attempt blocked from ${ip}`);
    return reply.code(403).send({
      error: 'Direct activation disabled in production. Use Stripe checkout.',
      redirectUrl: 'https://checkout.stripe.com/your-checkout-url',
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

    // Check for duplicate licenses (optional rate limiting)
    const existingLicenses = Array.from(licensesCache.values()).filter(
      (license) => license.email === sanitizedEmail && license.active
    );

    if (existingLicenses.length > 0) {
      console.warn(`Duplicate license attempt for ${sanitizedEmail}`);
      return reply.code(409).send({
        error: 'License already exists for this email',
        existingKey: existingLicenses[0].key.substring(0, 8) + '...',
      });
    }

    const license = await createLicense(sanitizedEmail);
    console.log(`Development activation for ${sanitizedEmail}: ${license.key}`);

    return reply.send({ licenceKey: license.key });
  } catch (error) {
    console.error('Activation error:', error);
    return reply.code(500).send({ error: 'Activation failed' });
  }
});

// Retrieve license by email endpoint
app.post('/retrieve-license', async (request, reply) => {
  const ip = request.ip || request.connection.remoteAddress || 'unknown';

  // Rate limiting
  if (!checkRateLimit(ip, '/retrieve-license')) {
    return reply.code(429).send({ error: 'Rate limit exceeded. Please try again later.' });
  }

  try {
    const { email } = request.body;

    if (!email) {
      return reply.code(400).send({ error: 'Email required' });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return reply.code(400).send({ error: 'Invalid email format' });
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

// Get license info (for admin purposes)
app.get('/license/:key', { preHandler: requireAdminAuth }, async (request, reply) => {
  const { key } = request.params;
  const license = licensesCache.get(key);

  if (!license) {
    return reply.code(404).send({ error: 'License not found' });
  }

  // Return license info without sensitive data
  return reply.send({
    key: license.key,
    email: license.email,
    created: license.created,
    active: license.active,
    seats: license.seats,
    lastValidated: license.lastValidated,
    validationCount: license.validationCount,
    stripeCustomerId: license.stripeCustomerId,
    stripeSubscriptionId: license.stripeSubscriptionId,
    deactivatedAt: license.deactivatedAt,
    deactivationReason: license.deactivationReason,
    paymentFailed: license.paymentFailed,
  });
});

// Admin endpoint to list all licenses (protected with authentication)
app.get('/admin/licenses', { preHandler: requireAdminAuth }, async (request, reply) => {
  const page = parseInt(request.query.page) || 1;
  const limit = parseInt(request.query.limit) || 50;
  const offset = (page - 1) * limit;

  const allLicenses = Array.from(licensesCache.values()).map((license) => ({
    key: license.key,
    email: license.email,
    created: license.created,
    active: license.active,
    seats: license.seats,
    lastValidated: license.lastValidated,
    validationCount: license.validationCount || 0,
    stripeCustomerId: license.stripeCustomerId,
    stripeSubscriptionId: license.stripeSubscriptionId,
    deactivatedAt: license.deactivatedAt,
    paymentFailed: license.paymentFailed,
  }));

  // Sort by creation date (newest first)
  allLicenses.sort((a, b) => new Date(b.created) - new Date(a.created));

  const paginatedLicenses = allLicenses.slice(offset, offset + limit);

  return reply.send({
    licenses: paginatedLicenses,
    total: allLicenses.length,
    page,
    limit,
    totalPages: Math.ceil(allLicenses.length / limit),
  });
});

// Admin stats endpoint
app.get('/admin/stats', { preHandler: requireAdminAuth }, async (request, reply) => {
  const licenses = Array.from(licensesCache.values());
  const activeLicenses = licenses.filter((l) => l.active);
  const inactiveLicenses = licenses.filter((l) => !l.active);
  const recentLicenses = licenses.filter(
    (l) => new Date(l.created) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  return reply.send({
    total: licenses.length,
    active: activeLicenses.length,
    inactive: inactiveLicenses.length,
    recentlyCreated: recentLicenses.length,
    processedEvents: processedEventsCache.size,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  console.error('Server error:', error);
  reply.code(500).send({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    console.log('🔐 Starting Secure A-B/AI License Server...');
    console.log('Loading licenses from database...');
    await loadLicenses();

    console.log('Loading processed events...');
    await loadProcessedEvents();

    console.log('Starting license server...');
    await app.listen({ port: 4100, host: '0.0.0.0' });

    console.log('🚀 Secure A-B/AI License Server running on port 4100');
    console.log('📊 Health check: http://your-server:4100/health');
    console.log('🔗 Webhook URL: http://your-server:4100/webhook');
    console.log(`💾 Database: ${DB_FILE}`);
    console.log(`🔑 Loaded ${licensesCache.size} licenses`);
    console.log(`📝 Loaded ${processedEventsCache.size} processed events`);
    console.log(`🔐 Admin API Key: ${ADMIN_API_KEY.substring(0, 8)}...`);

    // Security warnings
    if (process.env.ALLOW_DEV_ACTIVATION === 'true') {
      console.warn('⚠️  WARNING: Direct activation is enabled (ALLOW_DEV_ACTIVATION=true)');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('⚠️  WARNING: STRIPE_WEBHOOK_SECRET not set');
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await saveLicenses();
  await saveProcessedEvents();
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await saveLicenses();
  await saveProcessedEvents();
  await app.close();
  process.exit(0);
});

start();
