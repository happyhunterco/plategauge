import type { Config } from '@netlify/functions';
import { runCrave } from '../../../shared/crave';
import type { Intent } from '../../../shared/intent';
import { extractJson, foodsFromAi, PROMPTS } from '../../../shared/prompts';
import { aiConfigured, claude } from '../lib/anthropic';
import { guard, json } from '../lib/http';
import { lookupRestaurantItem, searchFoods } from '../lib/providers';

/** POST /api/crave { text, left, prefs, answers } → exact match, make-it-fit plans, similar options */
export default async (req: Request) => {
  const blocked = guard(req, { method: 'POST', perMinute: 30 });
  if (blocked) return blocked;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const text = typeof body.text === 'string' ? body.text.slice(0, 300) : '';
  if (!text.trim()) return json({ error: 'empty' }, 400);
  const left = body.left as { calories: number; protein: number; carbs: number; fat: number };
  const prefs = (body.prefs as { restrictions: string[]; allergies: string[] }) ?? { restrictions: [], allergies: [] };

  const result = await runCrave(
    { text, left, prefs, answers: (body.answers as Record<string, Partial<Intent>>) ?? {} },
    {
      search: async (q, o) => (await searchFoods({ q, page: 1, pageSize: o.limit ?? 10, restaurantId: o.restaurantId })).items,
      lookup: (rid, rname, q) => lookupRestaurantItem(rid, rname, q),
      ideas: aiConfigured()
        ? async (intent, l) => {
            const wants = [...intent.flavors, ...intent.textures, intent.temperature].filter(Boolean).join(', ');
            const out = await claude(PROMPTS.ideas, [{ type: 'text', text: `Craving: ${intent.raw}\nMust be: ${wants || 'whatever they described'}\nRemaining today: ${l.calories} kcal, ${l.protein}g protein, ${l.carbs}g carbs, ${l.fat}g fat.\nAvoid: ${[...prefs.restrictions, ...prefs.allergies].join(', ') || 'nothing'}` }], 1200);
            return foodsFromAi(extractJson(out), 'estimate', 'ideas');
          }
        : undefined,
    }
  );
  return json(result);
};

export const config: Config = { path: '/api/crave' };
