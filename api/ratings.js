// Shared star ratings for recordings. Vercel serverless function + Upstash Redis (REST, no SDK).
// GET  /api/ratings           -> { [versionId]: [sum, count] }
// POST /api/ratings {id,stars} -> { rating: [sum, count] }
// Limits without accounts: one vote per recording per day and one vote every 20 minutes, per hashed IP.
// Without Redis env vars: in-memory store locally, 503 on Vercel (the rest of the site keeps working).
import { createHash } from 'node:crypto';

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = { rsum: {}, rcount: {}, keys: new Map() }; // dev only

async function redis(cmds) {
  if (!URL) return memRedis(cmds);
  const r = await fetch(`${URL}/pipeline`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).map((x) => x.result);
}
function memRedis(cmds) {
  return cmds.map((cmd) => {
    const [c, k, a, b] = cmd;
    if (c === 'HGETALL') return Object.entries(mem[k]).flat();
    if (c === 'HINCRBY') return (mem[k][a] = (mem[k][a] || 0) + b);
    if (c === 'SET') { const t = mem.keys.get(k); if (t > Date.now()) return null; mem.keys.set(k, Date.now() + cmd[5] * 1e3); return 'OK'; }
    if (c === 'DEL') return mem.keys.delete(k) ? 1 : 0;
  });
}

const send = (res, status, data, cache) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', cache || 'no-store');
  res.end(JSON.stringify(data));
};
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = '';
  for await (const c of req) { s += c; if (s.length > 1e4) break; }
  try { return JSON.parse(s); } catch { return {}; }
}
const pairs = (flat) => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = +flat[i + 1]; return o; };

export default async function handler(req, res) {
  if (!URL && process.env.VERCEL) return send(res, 503, { error: 'off' });
  try {
    if (req.method === 'GET') {
      const [sum, count] = (await redis([['HGETALL', 'rsum'], ['HGETALL', 'rcount']])).map(pairs);
      const out = {};
      for (const id in count) out[id] = [sum[id] || 0, count[id]];
      return send(res, 200, out, 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const { id, stars } = await body(req);
    if (typeof id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(id) || !Number.isInteger(stars) || stars < 1 || stars > 5) return send(res, 400, { error: 'bad' });
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    const who = createHash('sha256').update(ip + (process.env.RATING_SALT || 'povesteca')).digest('hex').slice(0, 20);
    const [gap] = await redis([['SET', `rl:gap:${who}`, '1', 'NX', 'EX', 1200]]);
    if (gap !== 'OK') return send(res, 429, { error: 'wait', retryAfter: 1200 });
    const [once] = await redis([['SET', `rl:v:${who}:${id}`, '1', 'NX', 'EX', 86400]]);
    if (once !== 'OK') { await redis([['DEL', `rl:gap:${who}`]]); return send(res, 429, { error: 'today' }); }
    const [sum, count] = await redis([['HINCRBY', 'rsum', id, stars], ['HINCRBY', 'rcount', id, 1]]);
    return send(res, 200, { rating: [sum, count] });
  } catch (e) {
    return send(res, 503, { error: 'off' });
  }
}
