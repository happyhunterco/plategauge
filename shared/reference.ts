import type { Nutrients } from './food';

/**
 * Typical component portions used ONLY for estimated modifiers
 * (e.g. "add mayo" when a restaurant doesn't publish topping nutrition).
 * Values follow USDA FoodData Central reference foods, rounded. Anything built
 * from these is labeled "Estimate" in the app.
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

export const REFERENCE = {
  mayo_tbsp: { label: 'Mayo (1 tbsp)', n: n(94, 0, 0, 10, 88, 0, 0) },
  cheese_slice: { label: 'American cheese (1 slice)', n: n(70, 4, 1, 6, 300, 1, 0) },
  bacon_2: { label: 'Bacon (2 slices)', n: n(86, 6, 0, 7, 274, 0, 0) },
  ketchup_tbsp: { label: 'Ketchup (1 tbsp)', n: n(17, 0, 5, 0, 136, 4, 0) },
  pickles: { label: 'Pickles', n: n(2, 0, 0, 0, 120, 0, 0) },
  onion: { label: 'Onion', n: n(5, 0, 1, 0, 0, 1, 0) },
  lettuce: { label: 'Lettuce', n: n(1, 0, 0, 0, 1, 0, 0) },
  tomato: { label: 'Tomato (2 slices)', n: n(7, 0, 2, 0, 2, 1, 0) },
  beef_patty: { label: 'Beef patty (3 oz cooked)', n: n(213, 21, 0, 14, 64, 0, 0) },
  burger_bun: { label: 'Hamburger bun', n: n(120, 4, 21, 2, 206, 3, 1) },
  fries_small: { label: 'Small fries', n: n(230, 3, 30, 11, 180, 0, 3) },
  fries_medium: { label: 'Medium fries', n: n(350, 4, 46, 17, 260, 0, 4) },
  soda_16: { label: 'Regular soda (16 oz)', n: n(200, 0, 54, 0, 45, 54, 0) },
  zero_drink: { label: 'Water or diet soda', n: n(0, 0, 0, 0, 0, 0, 0) },
  parmesan_tbsp: { label: 'Grated parmesan (1 tbsp)', n: n(22, 1, 1, 1, 76, 0, 0) },
  mozzarella_extra: { label: 'Extra mozzarella (per slice)', n: n(70, 5, 1, 5, 130, 0, 0) },
  pepperoni: { label: 'Pepperoni (per slice)', n: n(60, 3, 0, 5, 200, 0, 0) },
  sour_cream_2tbsp: { label: 'Sour cream (2 tbsp)', n: n(60, 1, 1, 6, 15, 1, 0) },
  guac_2oz: { label: 'Guacamole (2 oz)', n: n(90, 1, 5, 8, 190, 0, 3) },
  shredded_cheese: { label: 'Shredded cheese (¼ cup)', n: n(110, 7, 1, 9, 180, 0, 0) },
  chicken_3oz: { label: 'Grilled chicken (3 oz)', n: n(140, 26, 0, 3, 60, 0, 0) },
  rice_half_cup: { label: 'Rice (½ cup)', n: n(103, 2, 22, 0, 1, 0, 0) },
  flour_tortilla_lg: { label: 'Large flour tortilla', n: n(300, 8, 50, 8, 690, 1, 2) },
  ranch_2tbsp: { label: 'Ranch (2 tbsp)', n: n(129, 0, 2, 13, 270, 1, 0) },
  vinaigrette_2tbsp: { label: 'Vinaigrette (2 tbsp)', n: n(90, 0, 4, 8, 250, 3, 0) },
  butter_tbsp: { label: 'Butter (1 tbsp)', n: n(102, 0, 0, 12, 91, 0, 0) },
  syrup_2tbsp: { label: 'Syrup (2 tbsp)', n: n(104, 0, 27, 0, 4, 24, 0) },
  egg: { label: 'Egg', n: n(72, 6, 0, 5, 71, 0, 0) },
  sausage_patty: { label: 'Sausage patty', n: n(170, 8, 1, 15, 360, 0, 0) },
  whey_scoop: { label: 'Protein scoop', n: n(120, 24, 3, 1, 100, 1, 0) },
  peanut_butter_tbsp: { label: 'Peanut butter (1 tbsp)', n: n(95, 4, 4, 8, 70, 2, 1) },
  garlic_bread: { label: 'Garlic bread (1 piece)', n: n(150, 4, 18, 7, 280, 1, 1) },
  side_salad: { label: 'Side salad, no dressing', n: n(20, 1, 4, 0, 15, 2, 2) },
} as const;

export type RefKey = keyof typeof REFERENCE;
