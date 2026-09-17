import type { Intent } from './intent';
import { categoryOf } from './tags';
import { restaurantById } from './restaurants';

export type Answer = { label: string; patch: Partial<Intent> };
export type Question = { id: string; prompt: string; options: Answer[]; blocking: boolean };

/** One short question at a time, only when the answer changes the result. */
export function nextQuestion(intent: Intent, ctx: { answered: string[]; exactFound: boolean; hasCheeseVariant: boolean; hasSizes: boolean }): Question | null {
  const ask = (q: Question) => (ctx.answered.includes(q.id) ? null : q);
  const r = restaurantById(intent.restaurantId);

  if (r && !intent.food) {
    return ask({
      id: 'restaurant_item',
      prompt: `What are you getting at ${r.name}?`,
      blocking: true,
      options: r.popular.slice(0, 3).map((p) => ({ label: p.label, patch: { food: p.words, category: categoryOf(p.words), specific: true } })),
    });
  }
  if (!intent.specific && !intent.flavors.length && !intent.textures.length && !intent.temperature && !intent.category) {
    return ask({
      id: 'mood',
      prompt: 'What sounds good?',
      blocking: true,
      options: [
        { label: 'Sweet', patch: { flavors: ['sweet'] } },
        { label: 'Salty', patch: { flavors: ['salty'] } },
        { label: 'A real meal', patch: { flavors: ['savory'], temperature: 'hot' } },
      ],
    });
  }
  if (intent.category === 'burger' && intent.cheese === null && ctx.hasCheeseVariant) {
    return ask({
      id: 'cheese',
      prompt: 'Which version?',
      blocking: false,
      options: [
        { label: 'Cheese', patch: { cheese: true, food: `${intent.food} cheese` } },
        { label: 'No cheese', patch: { cheese: false } },
        { label: 'Not sure', patch: {} },
      ],
    });
  }
  if (ctx.hasSizes && !intent.size && intent.category && ['fries', 'drink', 'frozen_dessert', 'smoothie'].includes(intent.category)) {
    return ask({
      id: 'size',
      prompt: 'What size?',
      blocking: false,
      options: [
        { label: 'Small', patch: { size: 'small' } },
        { label: 'Medium', patch: { size: 'medium' } },
        { label: 'Large', patch: { size: 'large' } },
      ],
    });
  }
  if (ctx.exactFound && intent.category === 'burger' && intent.patties === null && r?.menu?.length) {
    return ask({
      id: 'patties',
      prompt: 'How many patties?',
      blocking: false,
      options: [
        { label: 'One', patch: { patties: 1 } },
        { label: 'Two', patch: { patties: 2 } },
        { label: 'Three', patch: { patties: 3 } },
      ],
    });
  }
  return null;
}

export function applyAnswers(intent: Intent, answers: Record<string, Partial<Intent>>): Intent {
  let out = { ...intent };
  for (const patch of Object.values(answers)) out = { ...out, ...patch };
  if (answers.patties && out.patties) {
    out.food = out.food.replace(/\b(single|double|triple)\b/g, '').trim();
  }
  return out;
}
