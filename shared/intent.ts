import type { FoodCategory } from './food';
import { findRestaurant, norm } from './restaurants';
import { categoryOf, FLAVORS, TEXTURES, type Flavor, type Temperature, type Texture } from './tags';

export type Intent = {
  raw: string;
  restaurantId: string | null;
  restaurantName: string | null;
  /** What they asked for, without the restaurant and filler words: "double cheeseburger" */
  food: string;
  category: FoodCategory | null;
  size: 'small' | 'medium' | 'large' | null;
  quantity: number | null;
  patties: 1 | 2 | 3 | null;
  cheese: boolean | null;
  add: string[];
  remove: string[];
  prep: string[];
  flavors: Flavor[];
  textures: Texture[];
  temperature: Temperature | null;
  portion: number | null; // 0.5 = half
  wantsAlternatives: boolean;
  /** true when the user named a specific dish (not just a mood) */
  specific: boolean;
};

const FILLER =
  /\b(i want|i d like|i would like|i m craving|im craving|craving|i need|give me|can i get|can i have|get me|let me get|i feel like|feeling like|in the mood for|something|some|a|an|the|from|at|of|please|really|kinda|kind of|like|for)\b/g;
const NUM: Record<string, number> = { one: 1, single: 1, two: 2, double: 2, couple: 2, pair: 2, three: 3, triple: 3, four: 4, five: 5, six: 6, half: 0.5 };

export function parseCraving(text: string): Intent {
  const raw = text.trim();
  let t = ` ${norm(raw)} `;
  const found = findRestaurant(t);
  if (found) t = t.replace(` ${found.alias} `, ' ');

  const remove: string[] = [];
  t = t.replace(/\b(?:no|without|hold the|minus|skip the)\s+([a-z]+(?:\s(?:sauce|cream|dressing))?)/g, (_, w: string) => {
    remove.push(w);
    return ' ';
  });
  const add: string[] = [];
  t = t.replace(/\b(?:extra|add|with extra|plus)\s+([a-z]+)/g, (_, w: string) => {
    add.push(w);
    return ' ';
  });
  t = t.replace(/\bwith\s+([a-z]+)(?:\s+and\s+([a-z]+))?/g, (_, a: string, b?: string) => {
    add.push(a);
    if (b) add.push(b);
    return ' ';
  });

  const words = t.split(' ').filter(Boolean);
  const has = (re: RegExp) => re.test(t);

  const size = has(/\b(small|kids|junior|jr)\b/) ? 'small' : has(/\b(medium|regular)\b/) ? 'medium' : has(/\b(large|big|xl)\b/) ? 'large' : null;
  const patties = has(/\b(triple|three patt)/) ? 3 : has(/\b(double|two patt|2 patt)/) ? 2 : has(/\b(single|one patt)\b/) ? 1 : null;
  const cheese = remove.includes('cheese') ? false : has(/cheese ?burger|\bcheese\b|cheesy/) || add.includes('cheese') ? true : null;

  let quantity: number | null = null;
  const q = t.match(/\b(\d+|one|two|three|four|five|six|couple|pair)\b(?!\s*(?:oz|g|inch|piece))/);
  if (q && !/double|triple|single/.test(q[1])) quantity = /\d/.test(q[1]) ? Number(q[1]) : (NUM[q[1]] ?? null);

  const portion = has(/\bhalf\b|\bhalf of\b/) ? 0.5 : has(/\bfew bites\b|\blittle bit\b/) ? 0.25 : null;
  const prep = words.filter((w) => ['grilled', 'fried', 'crispy', 'baked', 'spicy', 'blackened', 'smoked', 'steamed', 'roasted'].includes(w));
  const flavors = FLAVORS.filter((f) => words.includes(f));
  const textures = TEXTURES.filter((x) => words.includes(x));
  const temperature: Temperature | null = has(/\b(cold|frozen|iced|chilled|refreshing)\b/) ? 'cold' : has(/\b(hot|warm|toasty)\b/) ? 'hot' : null;
  const wantsAlternatives = has(/\b(alternative|alternatives|instead|similar|options|other ideas|something else)\b/);

  const moodWords = new Set<string>([
    ...FLAVORS,
    ...TEXTURES,
    'cold',
    'hot',
    'warm',
    'frozen',
    'iced',
    'snack',
    'food',
    'meal',
    'treat',
    'dinner',
    'lunch',
    'breakfast',
    'eat',
    'alternative',
    'alternatives',
    'and',
    'or',
    'but',
    'not',
    'too',
    'very',
    'healthy',
    'light',
    'filling',
    'quick',
    'good',
    'with',
    'options',
    'similar',
    'instead',
  ]);
  const food = norm(t.replace(FILLER, ' ').replace(/\b(small|medium|regular|large|big|xl|kids|half|\d+|one|two|three|couple|pair)\b/g, ' '));
  const foodWords = food.split(' ').filter((w) => w && !moodWords.has(w));
  const category = categoryOf(food) ?? (words.includes('breakfast') ? 'breakfast' : null);
  const specific = foodWords.length > 0 && (category !== null || !!found);

  return {
    raw,
    restaurantId: found?.restaurant.id ?? null,
    restaurantName: found?.restaurant.name ?? null,
    food: foodWords.join(' '),
    category,
    size,
    quantity,
    patties: patties as Intent['patties'],
    cheese,
    add: add.filter((w) => !['cheese'].includes(w) || cheese !== false),
    remove,
    prep,
    flavors,
    textures,
    temperature,
    portion,
    wantsAlternatives,
    specific,
  };
}

/** The words used to look the exact item up in a provider. */
export function exactQuery(i: Intent): string {
  const parts = [i.food];
  if (i.patties === 2 && !/double/.test(i.food)) parts.unshift('double');
  if (i.patties === 3 && !/triple/.test(i.food)) parts.unshift('triple');
  if (i.size) parts.push(i.size);
  return parts.join(' ').trim();
}
