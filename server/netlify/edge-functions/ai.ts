import { extractJson, foodsFromAi, labelFromAi, PROMPTS, recipesFromAi } from '../../../shared/prompts';

/**
 * AI food analysis, as a Netlify EDGE function rather than a regular one.
 *
 * Why: regular Netlify functions get killed after 10 seconds. A real photo of a meal
 * sent to Claude for analysis routinely takes longer than that, so every photo/label
 * scan was silently timing out. Edge functions don't count time spent waiting on a
 * fetch() response against their execution limit, only actual CPU time — so the
 * ~15-25s a vision call can take is fine here (response header timeout is 40s).
 * This route replaces the old server/netlify/functions/ai.ts, which is now unused.
 */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization, x-app-key',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });

// Netlify's Edge runtime (Deno) exposes env vars through this global, not process.env.
declare const Netlify: { env: { get(key: string): string | undefined } };
const env = (k: string) => {
  try {
    return Netlify.env.get(k) ?? '';
  } catch {
    return '';
  }
};

type Content = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

async function claude(system: string, content: Content[], maxTokens = 1500): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env('ANTHROPIC_MODEL') || 'claude-sonnet-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
  });
  if (res.status === 429) throw Object.assign(new Error('rate_limited'), { status: 429 });
  if (!res.ok) {
    console.error('anthropic', res.status, (await res.text()).slice(0, 500));
    throw Object.assign(new Error('upstream'), { status: 502 });
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

// Best-effort per-isolate rate limit. Edge isolates are short-lived and regional, so this
// is a soft speed bump, not a hard guarantee — good enough alongside the app-level consent gate.
const hits = new Map<string, { n: number; t: number }>();
function tooMany(ip: string, perMinute = 20) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > perMinute;
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const appKey = env('APP_KEY');
  if (appKey && req.headers.get('x-app-key') !== appKey) return json({ error: 'unauthorized' }, 401);
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'anon';
  if (tooMany(ip)) return json({ error: 'rate_limited' }, 429);
  if (!env('ANTHROPIC_API_KEY')) return json({ error: 'ai_not_configured' }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const task = String(body.task ?? '');
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

  try {
    if (task === 'photo' || task === 'label') {
      const image = str(body.image, 8_000_000);
      if (!image) return json({ error: 'missing_image' }, 400);
      const note = str(body.note, 300);
      const text = await claude(PROMPTS[task as 'photo' | 'label'], [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
        { type: 'text', text: task === 'photo' ? `Analyze this meal.${note ? ` The person says: ${note}` : ''}` : 'Read this nutrition label.' },
      ]);
      const raw = extractJson(text);
      return task === 'photo' ? json({ foods: foodsFromAi(raw, 'photo_estimate'), notes: str(raw.notes, 300) }) : json({ label: labelFromAi(raw) });
    }
    if (task === 'text') {
      const text = await claude(PROMPTS.text, [{ type: 'text', text: `What I ate: ${str(body.text, 1000)}` }]);
      return json({ foods: foodsFromAi(extractJson(text), 'estimate') });
    }
    if (task === 'kitchen') {
      const left = body.left as Record<string, number> | undefined;
      const pantry = Array.isArray(body.pantry)
        ? body.pantry
            .map((p) => str(p, 60))
            .slice(0, 60)
            .join(', ')
        : '';
      const text = await claude(PROMPTS.kitchen, [
        {
          type: 'text',
          text: `Remaining today: ${left?.calories ?? '?'} kcal, ${left?.protein ?? '?'}g protein.\nPantry: ${pantry}\nIn the mood for: ${str(body.prompt, 300) || 'anything'}`,
        },
      ]);
      return json({ recipes: recipesFromAi(extractJson(text)) });
    }
    return json({ error: 'unknown_task' }, 400);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 502;
    return json({ error: status === 429 ? 'rate_limited' : 'ai_failed' }, status);
  }
};

export const config = { path: '/api/ai' };
