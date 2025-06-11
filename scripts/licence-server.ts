import Fastify from 'fastify';
import { v4 as uuidv4 } from 'uuid';

const app = Fastify();
const keys = new Map<string, {created: number, seats: number}>();

app.post('/activate', async (req, res) => {
  const {email} = req.body as {email: string};
  const key = uuidv4();
  keys.set(key, {created: Date.now(), seats: 1});
  return res.send({licenceKey: key});
});

app.post('/validate', async (req, res) => {
  const {key} = req.body as {key: string};
  return res.send({valid: keys.has(key)});
});

app.listen({port: 4100}, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('License server running on port 4100');
}); 