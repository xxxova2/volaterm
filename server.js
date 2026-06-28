import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001', 10);

const fastify = Fastify({ logger: false });

await fastify.register(cors, { origin: true });

// Rate limiting configuration
await fastify.register(rateLimit, {
  max: 30,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => ({
    code: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded, try again in ${context.ttl} seconds`,
    retryAfter: context.ttl,
  }),
});

// Input validation helper
function validateSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }
  const sanitized = symbol.trim().toUpperCase();
  // Allow 1-5 letter symbols only
  if (!/^[A-Z]{1,5}$/.test(sanitized)) {
    return null;
  }
  return sanitized;
}

const cacheStore = new Map();
const CACHE_TTL = 30000;

fastify.get('/api/health', async () => ({ status: 'ok', timestamp: Date.now() }));

fastify.get('/api/options/:symbol', async (request, reply) => {
  const { symbol: rawSymbol } = request.params;
  const symbol = validateSymbol(rawSymbol) || 'SPY';
  const now = Date.now();
  const { probe, max: maxStr } = request.query;
  const isProbe = probe === '1' || probe === 'true';
  const max = parseInt(maxStr, 10);
  const maxArg = Number.isFinite(max) && max > 0 ? max : null;

  const cached = cacheStore.get(symbol);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    if (isProbe) {
      const contracts = Array.isArray(cached.data.quotes) ? cached.data.quotes.length : 0;
      return { available: true, contracts };
    }
    return cached.data;
  }

  const args = [join(__dirname, 'fetch_options.py'), symbol];
  if (maxArg) args.push(String(maxArg));

  try {
    const result = await new Promise((resolve, reject) => {
      execFile('python3', args, { timeout: isProbe ? 12000 : 25000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('Python script error:', err);
          console.error('Python stderr:', stderr);
          console.error('Python stdout:', stdout?.slice(0, 500));
          const detail = stderr || stdout?.slice(0, 500) || err.message;
          return reject(new Error(detail));
        }
        try {
          const data = JSON.parse(stdout);
          if (data.error) {
            console.error('Data fetcher error:', data.error);
            return reject(new Error(data.error));
          }
          resolve(data);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          reject(new Error('Invalid response from data fetcher'));
        }
      });
    });

    const contracts = Array.isArray(result.quotes) ? result.quotes.length : 0;
    if (isProbe) return { available: contracts >= 10, contracts };

    cacheStore.set(symbol, { data: result, timestamp: now });
    return result;
  } catch (err) {
    console.error('API endpoint error:', err);
    reply.code(502);
    return { error: 'Failed to fetch data', detail: err.message };
  }
});

fastify.get('/api/history/spy', async () => {
  // Returns synthetic SPY history for the distribution tool
  const data = [];
  let price = 40;
  let vix = 18;
  const start = new Date('1993-01-29');
  const now = new Date();

  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const ret = (Math.random() - 0.5) * 0.02;
    price *= (1 + ret);
    vix = Math.max(8, Math.min(80, vix + (Math.random() - 0.5) * 2));
    data.push({
      date: d.toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
      return: Math.round(ret * 100000) / 100000,
      logReturn: Math.round(Math.log(1 + ret) * 100000) / 100000,
      vix: Math.round(vix * 10) / 10,
    });
  }

  return { symbol: 'SPY', data };
});

// Serve static files in production
try {
  await fastify.register(fastifyStatic, {
    root: join(__dirname, 'dist'),
    wildcard: false,
  });
} catch {}

fastify.setNotFoundHandler((request, reply) => {
  if (!request.url.startsWith('/api')) {
    return reply.sendFile('index.html');
  }
  reply.code(404).send({ error: 'Not found' });
});

await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Server running at http://localhost:${PORT}`);
