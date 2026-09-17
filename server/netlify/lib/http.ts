const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization, x-app-key',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

export const json = (body: unknown, status = 200, cacheSeconds = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...CORS,
      ...(cacheSeconds > 0
        ? { 'cache-control': 'public, max-age=60', 'netlify-cdn-cache-control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400` }
        : { 'cache-control': 'no-store' }),
    },
  });

export const env = (k: string) => (typeof process !== 'undefined' ? process.env[k] : undefined) || '';

/** Common guard: CORS preflight, optional app key, simple per-instance rate limit. */
const hits = new Map<string, { n: number; t: number }>();
export function guard(req: Request, opts: { method?: string; perMinute?: number } = {}): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (opts.method && req.method !== opts.method) return json({ error: `${opts.method} only` }, 405);
  const key = env('APP_KEY');
  if (key && req.headers.get('x-app-key') !== key) return json({ error: 'unauthorized' }, 401);
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'anon';
  const limit = opts.perMinute ?? 60;
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) hits.set(ip, { n: 1, t: now });
  else if (++h.n > limit) return json({ error: 'rate_limited' }, 429);
  return null;
}

export async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([p, new Promise<T>((_, rej) => (timer = setTimeout(() => rej(new Error(`${label} timed out`)), ms)))]);
  } finally {
    clearTimeout(timer);
  }
}

/** Small TTL cache per function instance; the CDN cache handles the rest. */
export class TTLCache<V> {
  private m = new Map<string, { v: V; exp: number }>();
  constructor(private ttlMs: number, private max = 500) {}
  get(k: string) {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (Date.now() > e.exp) {
      this.m.delete(k);
      return undefined;
    }
    return e.v;
  }
  set(k: string, v: V) {
    if (this.m.size >= this.max) this.m.delete(this.m.keys().next().value as string);
    this.m.set(k, { v, exp: Date.now() + this.ttlMs });
  }
}
