import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';
import { getPublicKeys } from './keys.js';
import { signClaim } from './sign.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '16kb' }));

app.get('/keys', (_req, res) => {
  res.json(getPublicKeys());
});

app.post('/sign', (req, res) => {
  const { nonce, dob } = req.body ?? {};
  if (typeof nonce !== 'string' || !nonce.length) {
    return res.status(400).json({ error: 'nonce required' });
  }
  if (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return res.status(400).json({ error: 'dob must be YYYY-MM-DD' });
  }
  const { token, kid } = signClaim({ nonce, dob });
  console.log(`[sign] kid=${kid} nonce=${nonce.slice(0, 8)}… dob=${dob}`);
  res.json({ token, kid });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
