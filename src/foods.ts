import type { Draft } from './types';

type Base = Omit<Draft, 'key' | 'qty' | 'source'>;
const f = (name: string, serving: string, calories: number, protein: number, carbs: number, fat: number): Base => ({
  name, serving, calories, protein, carbs, fat,
});

// Common whole foods (USDA FoodData Central reference values, rounded).
export const COMMON: Base[] = [
  f('Egg, large', '1 egg', 72, 6, 0, 5),
  f('Egg whites', '1/2 cup', 63, 13, 1, 0),
  f('Chicken breast, cooked', '4 oz', 187, 35, 0, 4),
  f('Chicken thigh, cooked', '4 oz', 232, 28, 0, 13),
  f('Ground beef 90/10, cooked', '4 oz', 247, 30, 0, 13),
  f('Ground turkey 93/7, cooked', '4 oz', 206, 27, 0, 11),
  f('Salmon, cooked', '4 oz', 234, 25, 0, 14),
  f('Tuna, canned in water', '1 can (5 oz)', 120, 26, 0, 1),
  f('Shrimp, cooked', '4 oz', 112, 27, 0, 0),
  f('Steak, sirloin, cooked', '4 oz', 234, 34, 0, 10),
  f('Bacon', '2 slices', 86, 6, 0, 7),
  f('Greek yogurt, nonfat plain', '170 g', 100, 17, 6, 0),
  f('Cottage cheese, 2%', '1/2 cup', 92, 12, 5, 3),
  f('Milk, 2%', '1 cup', 122, 8, 12, 5),
  f('Cheddar cheese', '1 oz', 114, 7, 0, 9),
  f('Whey protein', '1 scoop (30 g)', 120, 24, 3, 1),
  f('White rice, cooked', '1 cup', 205, 4, 45, 0),
  f('Brown rice, cooked', '1 cup', 216, 5, 45, 2),
  f('Oats, dry', '1/2 cup', 150, 5, 27, 3),
  f('Sourdough bread', '1 slice', 120, 4, 23, 1),
  f('Whole wheat bread', '1 slice', 80, 4, 14, 1),
  f('Bagel, plain', '1 bagel', 277, 11, 55, 1),
  f('Flour tortilla, 8"', '1 tortilla', 146, 4, 25, 4),
  f('Pasta, cooked', '1 cup', 220, 8, 43, 1),
  f('Potato, baked', '1 medium', 161, 4, 37, 0),
  f('Sweet potato, baked', '1 medium', 103, 2, 24, 0),
  f('Banana', '1 medium', 105, 1, 27, 0),
  f('Apple', '1 medium', 95, 0, 25, 0),
  f('Blueberries', '1 cup', 84, 1, 21, 0),
  f('Strawberries', '1 cup', 49, 1, 12, 0),
  f('Avocado', '1/2 fruit', 120, 1, 6, 11),
  f('Broccoli', '1 cup', 31, 3, 6, 0),
  f('Spinach, raw', '2 cups', 14, 2, 2, 0),
  f('Mixed salad greens', '2 cups', 18, 1, 3, 0),
  f('Peanut butter', '2 tbsp', 190, 7, 7, 16),
  f('Almonds', '1 oz', 164, 6, 6, 14),
  f('Olive oil', '1 tbsp', 119, 0, 0, 14),
  f('Butter', '1 tbsp', 102, 0, 0, 12),
  f('Honey', '1 tbsp', 64, 0, 17, 0),
  f('Black beans, canned', '1/2 cup', 114, 7, 20, 0),
  f('Hummus', '2 tbsp', 70, 2, 4, 5),
  f('Coffee, black', '1 cup', 2, 0, 0, 0),
  f('Orange juice', '1 cup', 112, 2, 26, 0),
  f('Beer, regular', '12 oz', 153, 2, 13, 0),
  f('Pizza, cheese', '1 slice (14")', 285, 12, 36, 10),
  f('Burrito, chicken', '1 burrito', 690, 38, 75, 24),
];

export const searchCommon = (q: string) => {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const words = t.split(/\s+/);
  return COMMON.filter((c) => words.every((w) => c.name.toLowerCase().includes(w))).slice(0, 8);
};
