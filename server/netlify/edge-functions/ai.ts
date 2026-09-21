/**
 * AI food analysis — Netlify EDGE function (Deno runtime).
 *
 * Two reasons this is an edge function and not a regular one:
 *  1. Regular Netlify functions are killed after 10s; a real vision call to Claude often
 *     takes longer, so every photo/label scan was silently timing out.
 *  2. Edge functions don't count time spent awaiting fetch() against their limit.
 *
 * IMPORTANT: the Deno runtime requires file extensions on relative imports, which our
 * Node-side shared/ modules don't use. So this file imports NOTHING from shared/ — it
 * builds the prompt inline and returns Claude's RAW text/JSON. The app (src/services/ai.ts)
 * already normalizes raw model JSON via foodsFromAi/labelFromAi, so no parsing logic is
 * duplicated here. Keep the prompts here in sync with shared/prompts.ts.
 */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization, x-app-key',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });

declare const Netlify: { env: { get(key: string): string | undefined } };
const env = (k: string) => {
  try {
    return Netlify.env.get(k) ?? '';
  } catch {
    return '';
  }
};

const MACROS = '"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number|null, "sugar": number|null, "sodium": number|null';
const BASE = `You are Vahla's nutrition estimation engine. Use conservative USDA FoodData Central reference values and realistic US portions. Reply with ONLY one JSON object: no prose, no markdown. Macros in grams, sodium in mg, calories in kcal, all for the serving described. Round to whole numbers. Use null when you can't estimate a value.`;

const PROMPTS: Record<string, string> = {
  photo: `${BASE}
Look at the photo and identify every distinct food and drink that is actually visible. Describe what you see, not what is typical: name the real dish (e.g. "pepperoni pizza slice", "pad thai"), not a generic stand-in.
Estimate each portion from visual cues (plate ~10-11 in, utensils, hands, packaging). Include visible sauces, dressings and oils as separate items when they matter.
Shape: {"foods":[{"name": string, "serving": string, "grams": number|null, ${MACROS}, "confidence": "high"|"medium"|"low", "low": number, "high": number}], "notes": string}
"low"/"high" are a realistic calorie range for that item. If the image has no food, return {"foods": [], "notes": "No food found"}.`,
  label: `${BASE}
The photo is a Nutrition Facts label. Read the numbers exactly as printed; do not estimate. If a value isn't printed, use null.
Shape: {"name": string|null, "brand": string|null, "serving": string, "grams": number|null, ${MACROS}, "readable": boolean}
Set "readable" false if the label is blurry or cut off.`,
  text: `${BASE}
Split the description into individual foods. Use the amounts given; otherwise assume one typical serving.
Shape: {"foods":[{"name": string, "serving": string, "grams": number|null, ${MACROS}, "confidence": "high"|"medium"|"low", "low": number, "high": number}]}`,
  kitchen: `${BASE}
Create 2-3 recipes that mainly use the pantry items, fit the remaining budget per serving, and take under 30 minutes. Assume salt, pepper, oil and basic spices.
Shape: {"recipes":[{"title": string, "minutes": number, "servings": number, "calories": number, "protein": number, "carbs": number, "fat": number, "ingredients": string[], "steps": string[], "missing": string[]}]}`,
};

type Content = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

async function claude(system: string, content: Content[], maxTokens = 1500): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env('ANTHROPIC_MODEL') || 'claude-haiku-4-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
  });
  if (res.status === 429) throw Object.assign(new Error('rate_limited'), { status: 429 });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error('anthropic', res.status, detail);
    // Pass Anthropic's own reason back to the app so the user sees what's actually wrong
    // (invalid key, no billing/credits, unknown model) instead of a generic failure.
    let reason = `Anthropic ${res.status}`;
    try {
      const j = JSON.parse(detail) as { error?: { message?: string } };
      if (j.error?.message) reason = j.error.message;
    } catch {
      /* keep default */
    }
    if (res.status === 401) reason = 'API key is missing or invalid.';
    if (res.status === 400 && /credit|billing|balance/i.test(reason)) reason = 'Your Anthropic account has no credit. Add billing at console.anthropic.com.';
    throw Object.assign(new Error(reason), { status: 502, reason });
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

/** Pull the JSON object out of the model's reply. Mirrors extractJson in shared/prompts.ts. */
function extractJson(text: string): Record<string, unknown> {
  const clean = text.replace(/```json|```/g, '');
  const m = clean.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : clean);
}

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
      const text = await claude(PROMPTS[task], [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
        { type: 'text', text: task === 'photo' ? `Analyze this meal.${note ? ` The person says: ${note}` : ''}` : 'Read this nutrition label.' },
      ]);
      const raw = extractJson(text);
      // Return raw model JSON; the app normalizes it (foodsFromAi / labelFromAi).
      return task === 'photo' ? json({ foods: raw.foods ?? [], notes: raw.notes ?? '' }) : json({ label: raw });
    }
    if (task === 'text') {
      const text = await claude(PROMPTS.text, [{ type: 'text', text: `What I ate: ${str(body.text, 1000)}` }]);
      return json({ foods: extractJson(text).foods ?? [] });
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
      return json({ recipes: extractJson(text).recipes ?? [] });
    }
    return json({ error: 'unknown_task' }, 400);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 502;
    const reason = (e as { reason?: string }).reason;
    return json({ error: status === 429 ? 'rate_limited' : 'ai_failed', reason: reason ?? String((e as Error).message).slice(0, 200) }, status);
  }
};

export const config = { path: '/api/ai' };
