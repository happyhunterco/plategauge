import type { FoodItem, Nutrients } from '../food';
import { categoryOf } from '../tags';

/**
 * DEVELOPMENT DATA — for local testing and the web preview only.
 * Every item is labeled quality: 'development' and the app shows a "Development data" badge.
 * Production builds read nutrition from the providers configured on the server.
 */

const n = (
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  sodium: number | null = null,
  sugar: number | null = null,
  fiber: number | null = null,
): Nutrients => ({ calories, protein, carbs, fat, sodium, sugar, fiber });

let i = 0;
const item = (name: string, serving: string, nutrients: Nutrients, extra: Partial<FoodItem> = {}): FoodItem => ({
  id: `dev:${++i}`,
  name,
  kind: extra.restaurant ? 'restaurant' : extra.brand ? 'branded' : 'generic',
  category: categoryOf(name),
  serving: { description: serving, quantity: 1, unit: 'serving' },
  nutrients,
  source: { provider: 'dev', quality: 'development' },
  ...extra,
});

const culvers = { restaurant: 'culvers', brand: 'Culver’s' } as const;
const og = { restaurant: 'olive_garden', brand: 'Olive Garden' } as const;
const wendys = { restaurant: 'wendys', brand: 'Wendy’s' } as const;

export const DEV_FOODS: FoodItem[] = [
  item('ButterBurger Cheese Single', '1 burger', n(460, 24, 39, 23, 700, 7, 1), culvers),
  item('ButterBurger Single', '1 burger', n(390, 20, 38, 17, 480, 6, 1), culvers),
  item('ButterBurger Cheese Double', '1 burger', n(700, 41, 40, 42, 1020, 8, 1), culvers),
  item('ButterBurger Double', '1 burger', n(560, 33, 38, 30, 580, 6, 1), culvers),
  item('ButterBurger Cheese Triple', '1 burger', n(940, 58, 41, 61, 1340, 8, 1), culvers),
  item('ButterBurger Triple', '1 burger', n(730, 46, 38, 43, 680, 6, 1), culvers),
  item('Crinkle Cut Fries Small', 'small', n(230, 3, 30, 11, 100, 0, 3), culvers),
  item('Crinkle Cut Fries Regular', 'regular', n(320, 4, 42, 15, 140, 0, 4), culvers),
  item('Crinkle Cut Fries Large', 'large', n(430, 5, 57, 21, 190, 0, 5), culvers),
  item('Grilled Chicken Sandwich', '1 sandwich', n(390, 36, 36, 11, 1170, 7, 1), culvers),
  item('Chicken Tenders 2 piece', '2 pieces', n(330, 23, 18, 18, 900, 0, 1), culvers),
  item('Vanilla Frozen Custard', '1 scoop', n(310, 5, 29, 19, 150, 27, 0), culvers),
  item('Jr. Cheeseburger', '1 burger', n(290, 15, 26, 14, 690, 6, 1), wendys),
  item('Lasagna Classico', '1 entrée (422 g)', n(776, 48, 43, 46, 1899, 15, 7), og),
  item('Famous House Salad without Dressing', '1 serving', n(70, 3, 8, 3, 260, 3, 2), og),
  item('Signature Italian Dressing', '1 serving', n(80, 0, 4, 7, 570, 3, 0), og),
  item('Breadstick with Garlic Topping', '1 breadstick', n(140, 5, 25, 2.5, 460, 1, 1), og),
  item('Zuppa Toscana', '1 bowl', n(220, 7, 16, 15, 790, 3, 2), og),
  item('Minestrone', '1 bowl', n(110, 5, 17, 1, 730, 5, 4), og),
  item('Pasta e Fagioli', '1 bowl', n(150, 8, 17, 5, 680, 3, 4), og),
  item('Chicken Gnocchi Soup', '1 bowl', n(230, 12, 22, 11, 1140, 4, 1), og),
  item('Fettuccine Alfredo', '1 entrée', n(1310, 34, 97, 87, 1440, 6, 5), og),
  item('Cheeseburger', '1 burger', n(535, 30, 40, 28, 1000, 8, 2)),
  item('Pretzels', '1 oz', n(108, 3, 23, 1, 385, 1, 1), { tags: ['salty', 'crunchy'] }),
  item('Popcorn, air-popped', '3 cups', n(93, 3, 19, 1, 2, 0, 4), { tags: ['salty', 'crunchy'] }),
  item('Tortilla chips', '1 oz', n(138, 2, 19, 7, 119, 0, 1), { tags: ['salty', 'crunchy'] }),
  item('Roasted almonds', '1 oz', n(170, 6, 6, 15, 100, 1, 3), { tags: ['salty', 'crunchy'] }),
  item('Parmesan cheese crisps', '1 oz', n(150, 13, 1, 10, 450, 0, 0), { tags: ['salty', 'crunchy'] }),
  item('Rice cakes', '2 cakes', n(70, 1, 15, 1, 58, 0, 1), { tags: ['crunchy'] }),
  item('Beef jerky', '1 oz', n(116, 9, 3, 7, 590, 3, 1)),
  item('Dark chocolate', '1 oz', n(170, 2, 13, 12, 6, 7, 3)),
  item('Protein bar', '1 bar', n(200, 20, 22, 7, 180, 2, 10), { tags: ['sweet', 'chewy'] }),
  item('Frozen yogurt', '1/2 cup', n(110, 3, 19, 3, 60, 17, 0)),
  item('Greek yogurt with honey', '1 cup', n(190, 20, 25, 0, 70, 24, 0)),
  item('Apple with peanut butter', '1 apple + 1 tbsp', n(190, 4, 29, 8, 70, 21, 5)),
  item('Chicken burrito bowl', '1 bowl', n(620, 45, 60, 20, 1300, 5, 10)),
];

/** A few barcodes for the local flow (012345678905 is the standard test UPC). */
export const DEV_BARCODES: Record<string, { item: FoodItem; signals: import('../productScore').ProductSignals }> = {
  '012345678905': {
    item: { ...item('Sea Salt Pretzel Crisps', '1 oz (28 g)', n(110, 3, 23, 1, 250, 1, 1), { brand: 'Development Brand' }), barcode: '012345678905' },
    signals: { nutriScore: null, nova: 3, additives: [], per100g: { energyKcal: 393, sugars: 3.6, saturatedFat: 0, sodiumMg: 893, fiber: 3.6, protein: 10.7 } },
  },
};

export function devSearch(q: string, restaurantId?: string | null): FoodItem[] {
  const words = q
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .flatMap((w) => (w === 'cheeseburger' ? ['cheese', 'burger'] : w === 'butterburger' ? ['burger'] : [w]));
  if (!words.length) return [];
  return DEV_FOODS.filter((f) => !restaurantId || f.restaurant === restaurantId)
    .map((f) => {
      const name = f.name
        .toLowerCase()
        .replace(/butterburger/g, 'butterburger burger')
        .replace(/cheeseburger/g, 'cheeseburger cheese burger');
      const hits = words.filter((w) => name.includes(w) || name.includes(w.replace(/s$/, ''))).length;
      return { f, hits };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.f.name.length - b.f.name.length)
    .map((x) => x.f);
}

export function devLookup(restaurantId: string, query: string): FoodItem | null {
  const q = query.toLowerCase();
  return DEV_FOODS.find((f) => f.restaurant === restaurantId && f.name.toLowerCase() === q) ?? null;
}
