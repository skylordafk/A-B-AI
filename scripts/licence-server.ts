import Fastify from 'fastify';
import { v4 as uuidv4 } from 'uuid';

const app = Fastify();
const keys = new Map<string, { created: number; seats: number }>();

// Add CORS headers for browser requests
app.addHook('preHandler', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    reply.code(200).send();
    return;
  }
});

app.post('/activate', async (req, res) => {
  const { email: _email } = req.body as { email: string };
  const key = uuidv4();
  keys.set(key, { created: Date.now(), seats: 1 });
  return res.send({ licenceKey: key });
});

app.post('/validate', async (req, res) => {
  const { key } = req.body as { key: string };
  return res.send({ valid: keys.has(key) });
});

app.listen({ port: 4100, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('License server running on port 4100, accessible from all interfaces');
});
