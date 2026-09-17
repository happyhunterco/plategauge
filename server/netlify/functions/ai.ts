import type { Config } from '@netlify/functions';
import { extractJson, foodsFromAi, labelFromAi, PROMPTS, recipesFromAi } from '../../../shared/prompts';
import { aiConfigured, claude } from '../lib/anthropic';
import { guard, json } from '../lib/http';

/** POST /api/ai  { task: 'photo'|'label'|'text'|'kitchen', ... } */
export default async (req: Request) => {
  const blocked = guard(req, { method: 'POST', perMinute: 20 });
  if (blocked) return blocked;
  if (!aiConfigured()) return json({ error: 'ai_not_configured' }, 503);

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
      return task === 'photo' ? json({ foods: foodsFromAi(raw, 'photo_estimate'), notes: str(raw.notes, 300) }) : json({ label: labelFromAi(raw) });
    }
    if (task === 'text') {
      const text = await claude(PROMPTS.text, [{ type: 'text', text: `What I ate: ${str(body.text, 1000)}` }]);
      return json({ foods: foodsFromAi(extractJson(text), 'estimate') });
    }
    if (task === 'kitchen') {
      const left = body.left as Record<string, number> | undefined;
      const pantry = Array.isArray(body.pantry) ? body.pantry.map((p) => str(p, 60)).slice(0, 60).join(', ') : '';
      const text = await claude(PROMPTS.kitchen, [{ type: 'text', text: `Remaining today: ${left?.calories ?? '?'} kcal, ${left?.protein ?? '?'}g protein.\nPantry: ${pantry}\nIn the mood for: ${str(body.prompt, 300) || 'anything'}` }]);
      return json({ recipes: recipesFromAi(extractJson(text)) });
    }
    return json({ error: 'unknown_task' }, 400);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 502;
    return json({ error: status === 429 ? 'rate_limited' : 'ai_failed' }, status);
  }
};

export const config: Config = { path: '/api/ai' };
