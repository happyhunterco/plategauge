import type { Nutrients } from './food';

export const ZERO: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
const OPT = ['fiber', 'sugar', 'sodium'] as const;

/** Optional nutrients stay null when any input is unknown, so totals never look more complete than they are. */
export function add(a: Nutrients, b: Nutrients, k = 1): Nutrients {
  const out: Nutrients = {
    calories: a.calories + b.calories * k,
    protein: a.protein + b.protein * k,
    carbs: a.carbs + b.carbs * k,
    fat: a.fat + b.fat * k,
  };
  for (const key of OPT) {
    const x = a[key];
    const y = b[key];
    out[key] = x == null || y == null ? null : x + y * k;
  }
  return out;
}

export const sub = (a: Nutrients, b: Nutrients) => add(a, b, -1);
export const scale = (a: Nutrients, k: number) => add(ZERO, a, k);
export const sum = (list: Nutrients[]) => list.reduce((acc, n) => add(acc, n), { ...ZERO });

export function clampNonNegative(n: Nutrients): Nutrients {
  const c = (v: number) => Math.max(0, v);
  const o = (v: number | null | undefined) => (v == null ? v : Math.max(0, v));
  return { calories: c(n.calories), protein: c(n.protein), carbs: c(n.carbs), fat: c(n.fat), fiber: o(n.fiber), sugar: o(n.sugar), sodium: o(n.sodium) };
}

export function roundN(n: Nutrients): Nutrients {
  const r = (v: number) => Math.round(v);
  const r1 = (v: number | null | undefined) => (v == null ? v : Math.round(v * 10) / 10);
  return {
    calories: r(n.calories),
    protein: r1(n.protein)!,
    carbs: r1(n.carbs)!,
    fat: r1(n.fat)!,
    fiber: r1(n.fiber),
    sugar: r1(n.sugar),
    sodium: n.sodium == null ? n.sodium : Math.round(n.sodium),
  };
}

export type Budget = Pick<Nutrients, 'calories' | 'protein' | 'carbs' | 'fat'>;

export const remainingAfter = (left: Budget, n: Nutrients): Budget => ({
  calories: left.calories - n.calories,
  protein: left.protein - n.protein,
  carbs: left.carbs - n.carbs,
  fat: left.fat - n.fat,
});

/** A food "fits" when it lands at or under the calories left, with a small tolerance. */
export const CAL_TOLERANCE = 50;
export const fits = (left: Budget, n: Nutrients) => n.calories <= left.calories + CAL_TOLERANCE;

/** Human delta: "+80 cal, +5g protein, +7g fat" */
export function describeDelta(d: Nutrients): string {
  const parts: string[] = [];
  const s = (v: number) => (v > 0 ? '+' : '−') + Math.abs(Math.round(v));
  if (Math.round(d.calories) !== 0) parts.push(`${s(d.calories)} cal`);
  if (Math.abs(d.protein) >= 1) parts.push(`${s(d.protein)}g protein`);
  if (Math.abs(d.carbs) >= 1) parts.push(`${s(d.carbs)}g carbs`);
  if (Math.abs(d.fat) >= 1) parts.push(`${s(d.fat)}g fat`);
  return parts.length ? parts.join(', ') : 'No change';
}
