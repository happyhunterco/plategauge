import type { FoodItem, Nutrients } from '../../../../shared/food';
import { findRestaurant, restaurantById } from '../../../../shared/restaurants';
import { categoryOf } from '../../../../shared/tags';

export const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
export const r1 = (v: number | null | undefined) => (v == null ? null : Math.round(v * 10) / 10);

export function nutrients(calories: number, protein: number | null, carbs: number | null, fat: number | null, extra: { fiber?: number | null; sugar?: number | null; sodium?: number | null } = {}): Nutrients {
  return {
    calories: Math.round(calories),
    protein: r1(protein ?? 0)!,
    carbs: r1(carbs ?? 0)!,
    fat: r1(fat ?? 0)!,
    fiber: r1(extra.fiber ?? null),
    sugar: r1(extra.sugar ?? null),
    sodium: extra.sodium == null ? null : Math.round(extra.sodium),
  };
}

/** Title-case ALL CAPS database names without mangling brand casing elsewhere. */
export function tidyName(s: string) {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
}

/** Attach restaurant identity when a brand is a known chain. */
export function withRestaurant(item: FoodItem, isRestaurant: boolean): FoodItem {
  const found = item.brand ? findRestaurant(item.brand) : null;
  if (!isRestaurant && !found) return { ...item, category: item.category ?? categoryOf(item.name) };
  const r = found?.restaurant ?? null;
  return {
    ...item,
    kind: isRestaurant || r ? 'restaurant' : item.kind,
    restaurant: r?.id ?? item.restaurant ?? null,
    brand: r ? restaurantById(r.id)!.name : item.brand,
    category: item.category ?? categoryOf(item.name),
    source: { ...item.source, quality: isRestaurant || r ? 'verified_restaurant' : item.source.quality },
  };
}
