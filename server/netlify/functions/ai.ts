/**
 * PlateGauge AI endpoint. POST /api/ai  { task, ...payload }
 * Env: ANTHROPIC_API_KEY (required), ANTHROPIC_MODEL (optional), APP_KEY (optional).
 * The API key never ships inside the app; the app only knows this URL.
 */
import type { Config, Context } from '@netlify/functions';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';
const MACROS = '"calories": number, "protein": number, "carbs": number, "fat": number';

const BASE = `You are PlateGauge's nutrition engine. Estimate like a registered dietitian using USDA-style reference values and realistic US portion sizes.
Reply with ONLY a JSON object, no prose, no markdown fences. Macros are grams, calories are kcal, all for ONE serving as described in "serving". Round to whole numbers.`;

const SPECS: Record<string, string> = {
  text: `Split the user's description into individual foods. Shape: {"foods":[{"name": string, "serving": string, ${MACROS}}]}. Use the amounts they give; if none, assume one typical serving.`,
  photo: `Identify every distinct food visible on the plate and estimate its portion from visual cues (plate ~10-11 in, utensils, hands). Shape: {"foods":[{"name": string, "serving": string, ${MACROS}}]}. If there is no food, return {"foods":[]}. Include visible sauces, dressings and cooking oil as their own items when meaningful.`,
  crave: `Suggest 3-5 specific foods or simple snacks that satisfy the craving and fit inside the remaining budget. Favor high-protein options when protein remaining is large. Shape: {"ideas":[{"name": string, "serving": string, ${MACROS}, "note": string}]}. "note" is one short sentence on why it hits the craving or how to make it. Mix quick store-bought and 10-minute homemade options.`,
  menus: `Recommend 3-5 real orders at the named restaurant that fit the remaining budget, with exact customizations (sizes, swaps, what to skip). Use the chain's published nutrition when you know it; otherwise estimate. Shape: {"ideas":[{"name": string, "where": string, "serving": string, ${MACROS}, "note": string}]}. "note" is the exact way to order it. If you don't recognize the restaurant, give orders that a typical restaurant of that type would have and say so in the note.`,
  kitchen: `Create 2-3 recipes that mainly use the pantry items, fit the remaining budget per serving, and take under 30 minutes. Assume salt, pepper, oil and basic spices are available. Shape: {"recipes":[{"title": string, "minutes": number, "servings": number, ${MACROS}, "ingredients": string[], "steps": string[], "missing": string[]}]}. Macros are per serving. "missing" lists anything needed that is not in the pantry (keep it short). Steps are short imperative sentences.`,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });

const clampNum = (v: unknown, max = 5000) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), max) : 0;
};
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const macros = (o: Record<string, unknown>) => ({
  calories: clampNum(o.calories),
  protein: clampNum(o.protein, 500),
  carbs: clampNum(o.carbs, 800),
  fat: clampNum(o.fat, 400),
});

function clean(task: string, raw: Record<string, unknown>) {
  const arr = (k: string) => (Array.isArray(raw[k]) ? (raw[k] as Record<string, unknown>[]) : []);
  if (task === 'text' || task === 'photo')
    return { foods: arr('foods').slice(0, 12).map((f) => ({ name: str(f.name, 80), serving: str(f.serving, 60) || '1 serving', ...macros(f) })).filter((f) => f.name) };
  if (task === 'kitchen')
    return {
      recipes: arr('recipes').slice(0, 4).map((r) => ({
        title: str(r.title, 80),
        minutes: clampNum(r.minutes, 240),
        servings: Math.max(1, clampNum(r.servings, 12)),
        ...macros(r),
        ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).map((x) => str(x, 120)).filter(Boolean).slice(0, 20),
        steps: (Array.isArray(r.steps) ? r.steps : []).map((x) => str(x, 300)).filter(Boolean).slice(0, 12),
        missing: (Array.isArray(r.missing) ? r.missing : []).map((x) => str(x, 60)).filter(Boolean).slice(0, 8),
      })),
    };
  return {
    ideas: arr('ideas').slice(0, 6).map((i) => ({
      name: str(i.name, 80),
      where: str(i.where, 60) || undefined,
      serving: str(i.serving, 60) || '1 serving',
      ...macros(i),
      note: str(i.note, 300),
    })),
  };
}

export default async (req: Request, _ctx: Context) => {
  if (req.method === 'OPTIONS')
    return new Response(null, {
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type, x-app-key',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (process.env.APP_KEY && req.headers.get('x-app-key') !== process.env.APP_KEY) return json({ error: 'unauthorized' }, 401);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'server not configured' }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  const task = String(body.task ?? '');
  const spec = SPECS[task];
  if (!spec) return json({ error: 'unknown task' }, 400);

  const left = body.left as Record<string, number> | undefined;
  const budget = left ? `Remaining today: ${left.calories} kcal, ${left.protein}g protein, ${left.carbs}g carbs, ${left.fat}g fat.` : '';
  const content: unknown[] = [];

  if (task === 'photo') {
    const image = str(body.image, 8_000_000);
    if (!image) return json({ error: 'missing image' }, 400);
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } });
    content.push({ type: 'text', text: `Estimate this meal.${body.note ? ` Note from user: ${str(body.note)}` : ''}` });
  } else if (task === 'text') {
    content.push({ type: 'text', text: `What I ate: ${str(body.text, 1000)}` });
  } else if (task === 'crave') {
    content.push({ type: 'text', text: `${budget}\nCraving: ${str(body.prompt, 500) || 'anything'}` });
  } else if (task === 'menus') {
    content.push({ type: 'text', text: `${budget}\nRestaurant: ${str(body.restaurant, 80)}\nWants: ${str(body.prompt, 300) || 'no preference'}` });
  } else {
    const pantry = Array.isArray(body.pantry) ? body.pantry.map((p) => str(p, 60)).slice(0, 60).join(', ') : '';
    content.push({ type: 'text', text: `${budget}\nPantry: ${pantry}\nIn the mood for: ${str(body.prompt, 300) || 'anything'}` });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: `${BASE}\n\n${spec}`,
      messages: [{ role: 'user', content }],
    }),
  });

  if (res.status === 429) return json({ error: 'rate limited' }, 429);
  if (!res.ok) {
    console.error('anthropic error', res.status, await res.text());
    return json({ error: 'upstream error' }, 502);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const match = text.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
  try {
    return json(clean(task, JSON.parse(match ? match[0] : text)));
  } catch {
    console.error('parse failure', text.slice(0, 500));
    return json({ error: 'could not read model output' }, 502);
  }
};

export const config: Config = { path: '/api/ai' };
