import type { FoodItem, Nutrients } from './food';
import type { Intent } from './intent';
import { categoryOf } from './tags';

/**
 * Built-in mood suggestions with real, conservative nutrition (USDA reference values,
 * rounded). These guarantee Crave always has something to show for an abstract craving
 * ("salty and crunchy", "sweet and cold") even when no AI and no restaurant database
 * covers it. Labeled quality:'estimate' and marked as generic reference portions.
 */

const n = (
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  sodium: number | null = null,
  sugar: number | null = null,
  fiber: number | null = null,
): Nutrients => ({
  calories,
  protein,
  carbs,
  fat,
  sodium,
  sugar,
  fiber,
});

type Seed = { name: string; serving: string; n: Nutrients; tags: string[] };

const SEEDS: Seed[] = [
  { name: 'Pretzels', serving: '1 oz', n: n(108, 3, 23, 1, 385, 1, 1), tags: ['salty', 'crunchy'] },
  { name: 'Air-popped popcorn', serving: '3 cups', n: n(93, 3, 19, 1, 2, 0, 4), tags: ['salty', 'crunchy'] },
  { name: 'Tortilla chips', serving: '1 oz', n: n(138, 2, 19, 7, 119, 0, 1), tags: ['salty', 'crunchy'] },
  { name: 'Roasted almonds', serving: '1 oz', n: n(170, 6, 6, 15, 100, 1, 3), tags: ['salty', 'crunchy'] },
  { name: 'Cheese crisps', serving: '1 oz', n: n(150, 13, 1, 10, 450, 0, 0), tags: ['salty', 'crunchy', 'cheesy'] },
  { name: 'Rice cakes', serving: '2 cakes', n: n(70, 1, 15, 1, 58, 0, 1), tags: ['crunchy'] },
  { name: 'Beef jerky', serving: '1 oz', n: n(116, 9, 3, 7, 590, 3, 1), tags: ['salty', 'savory', 'chewy'] },
  { name: 'Dill pickle spears', serving: '2 spears', n: n(8, 0, 2, 0, 550, 1, 1), tags: ['salty', 'sour', 'crunchy'] },
  { name: 'String cheese', serving: '1 stick', n: n(80, 7, 1, 6, 200, 0, 0), tags: ['salty', 'savory'] },
  { name: 'Apple', serving: '1 medium', n: n(95, 0, 25, 0, 2, 19, 4), tags: ['sweet', 'crunchy', 'fruity', 'cold'] },
  { name: 'Baby carrots with hummus', serving: '1 cup + 2 tbsp', n: n(150, 4, 20, 6, 320, 8, 6), tags: ['crunchy', 'savory'] },
  { name: 'Granola', serving: '1/2 cup', n: n(210, 5, 36, 6, 40, 12, 4), tags: ['crunchy', 'sweet'] },
  { name: 'Dark chocolate', serving: '1 oz', n: n(170, 2, 13, 12, 6, 7, 3), tags: ['sweet', 'chocolate'] },
  { name: 'Chocolate protein shake', serving: '1 bottle', n: n(160, 30, 5, 3, 200, 2, 1), tags: ['sweet', 'chocolate', 'creamy', 'cold'] },
  { name: 'Brownie', serving: '1 small', n: n(230, 3, 32, 11, 130, 22, 1), tags: ['sweet', 'chocolate'] },
  { name: 'Chocolate milk', serving: '1 cup', n: n(190, 8, 30, 5, 150, 24, 1), tags: ['sweet', 'chocolate', 'creamy', 'cold'] },
  { name: 'Protein bar', serving: '1 bar', n: n(200, 20, 22, 7, 180, 2, 10), tags: ['sweet', 'chewy'] },
  { name: 'Frozen yogurt', serving: '1/2 cup', n: n(110, 3, 19, 3, 60, 17, 0), tags: ['sweet', 'cold', 'creamy'] },
  { name: 'Ice cream bar', serving: '1 bar', n: n(200, 3, 22, 12, 55, 19, 0), tags: ['sweet', 'cold', 'creamy', 'chocolate'] },
  { name: 'Fruit smoothie', serving: '12 oz', n: n(210, 4, 46, 2, 60, 38, 4), tags: ['sweet', 'cold', 'fruity', 'creamy'] },
  { name: 'Greek yogurt with honey', serving: '1 cup', n: n(190, 20, 25, 0, 70, 24, 0), tags: ['sweet', 'cold', 'creamy'] },
  { name: 'Apple with peanut butter', serving: '1 apple + 1 tbsp', n: n(190, 4, 29, 8, 70, 21, 5), tags: ['sweet', 'crunchy', 'fruity'] },
  { name: 'Cottage cheese with berries', serving: '1 cup', n: n(180, 24, 12, 4, 460, 8, 2), tags: ['creamy', 'cold', 'sweet'] },
  { name: 'Pudding cup', serving: '1 cup', n: n(120, 2, 22, 3, 130, 18, 0), tags: ['sweet', 'creamy', 'cold'] },
  { name: 'Mac and cheese', serving: '1 cup', n: n(310, 11, 40, 11, 700, 6, 2), tags: ['creamy', 'cheesy', 'savory'] },
  { name: 'Spicy tortilla chips', serving: '1 oz', n: n(140, 2, 18, 7, 200, 1, 1), tags: ['spicy', 'crunchy', 'salty'] },
  { name: 'Buffalo wings', serving: '4 wings', n: n(320, 24, 2, 24, 900, 1, 0), tags: ['spicy', 'savory'] },
  { name: 'Jalapeno poppers', serving: '4 pieces', n: n(260, 6, 22, 16, 560, 3, 2), tags: ['spicy', 'crunchy', 'cheesy'] },
  { name: 'Iced coffee with milk', serving: '12 oz', n: n(60, 2, 9, 2, 40, 8, 0), tags: ['cold', 'creamy'] },
  { name: 'Chicken burrito bowl', serving: '1 bowl', n: n(620, 45, 60, 20, 1300, 5, 10), tags: ['savory', 'hot'] },
  { name: 'Grilled cheese', serving: '1 sandwich', n: n(400, 15, 33, 23, 760, 5, 2), tags: ['savory', 'hot', 'cheesy'] },
  { name: 'Chicken noodle soup', serving: '1 bowl', n: n(180, 12, 22, 5, 900, 3, 2), tags: ['savory', 'hot'] },
  { name: 'Turkey sandwich', serving: '1 sandwich', n: n(360, 24, 40, 11, 1100, 6, 4), tags: ['savory'] },
];

let seq = 0;
function toItem(seed: Seed): FoodItem {
  return {
    id: `mood:${seed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${seq++}`,
    name: seed.name,
    kind: 'generic',
    category: categoryOf(seed.name),
    serving: { description: seed.serving, quantity: 1, unit: 'serving' },
    nutrients: seed.n,
    tags: seed.tags,
    source: { provider: 'template', quality: 'estimate' },
  };
}

/** Real foods matching a mood craving. Scored elsewhere; here we just return a broad, on-mood pool. */
export function moodFoods(intent: Intent): FoodItem[] {
  const want = new Set<string>([...intent.flavors, ...intent.textures, ...(intent.temperature ? [intent.temperature] : [])]);
  if (!want.size) return [];
  const scored = SEEDS.map((seed) => {
    const hits = seed.tags.filter((t) => want.has(t)).length;
    return { seed, hits };
  }).filter((x) => x.hits > 0);
  // Prefer foods that match more of the requested moods; keep a healthy spread.
  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, 12).map((x) => toItem(x.seed));
}
