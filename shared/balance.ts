import type { Nutrients } from './food';

export type BalanceFactor = { id: string; label: string; points: number; max: number; detail: string };
export type Balance = { ready: false; message: string } | { ready: true; score: number; factors: BalanceFactor[]; skipped: string[] };

type Entry = { name: string; nutrients: Nutrients; qty: number };

/**
 * "Daily Balance": a transparent day-level check, never a verdict on single foods.
 * Only factors with enough data are scored; the rest are listed as skipped.
 */
export function dailyBalance(entries: Entry[], goals: { calories: number; protein: number; fiber: number }, dayComplete: boolean): Balance {
  const total = entries.reduce(
    (a, e) => ({
      cal: a.cal + e.nutrients.calories * e.qty,
      protein: a.protein + e.nutrients.protein * e.qty,
      fiberCal: a.fiberCal + (e.nutrients.fiber != null ? e.nutrients.calories * e.qty : 0),
      fiber: a.fiber + (e.nutrients.fiber ?? 0) * e.qty,
      sodiumCal: a.sodiumCal + (e.nutrients.sodium != null ? e.nutrients.calories * e.qty : 0),
      sodium: a.sodium + (e.nutrients.sodium ?? 0) * e.qty,
      sugarCal: a.sugarCal + (e.nutrients.sugar != null ? e.nutrients.calories * e.qty : 0),
      sugar: a.sugar + (e.nutrients.sugar ?? 0) * e.qty,
    }),
    { cal: 0, protein: 0, fiberCal: 0, fiber: 0, sodiumCal: 0, sodium: 0, sugarCal: 0, sugar: 0 },
  );
  if (entries.length < 2 || total.cal < 500) {
    return { ready: false, message: 'Log at least two meals to see today’s balance.' };
  }
  const factors: BalanceFactor[] = [];
  const skipped: string[] = [];
  const covered = (c: number) => c >= total.cal * 0.6;

  const pRatio = goals.protein > 0 ? total.protein / goals.protein : 0;
  const pTarget = dayComplete ? 1 : Math.min(1, total.cal / Math.max(goals.calories, 1));
  const pScore = Math.round(25 * Math.min(pRatio / Math.max(pTarget, 0.01), 1));
  factors.push({
    id: 'protein',
    label: 'Protein',
    points: pScore,
    max: 25,
    detail: `${Math.round(total.protein)}g of ${goals.protein}g${dayComplete ? '' : ' so far, on pace with your calories'}`,
  });

  const calRatio = total.cal / Math.max(goals.calories, 1);
  const calPts = dayComplete ? (Math.abs(calRatio - 1) <= 0.1 ? 20 : Math.abs(calRatio - 1) <= 0.2 ? 12 : 5) : calRatio <= 1.05 ? 20 : 8;
  factors.push({
    id: 'calories',
    label: 'Calories',
    points: calPts,
    max: 20,
    detail: calRatio <= 1.05 ? 'Within your target' : `${Math.round((calRatio - 1) * 100)}% over target`,
  });

  if (covered(total.fiberCal)) {
    const need = (total.cal / 1000) * 14;
    factors.push({
      id: 'fiber',
      label: 'Fiber',
      points: Math.round(20 * Math.min(total.fiber / Math.max(need, 1), 1)),
      max: 20,
      detail: `${Math.round(total.fiber)}g, about ${Math.round(need)}g fits what you’ve eaten`,
    });
  } else skipped.push('Fiber (not enough label data)');

  if (covered(total.sodiumCal)) {
    const pts = total.sodium <= 2300 ? 15 : total.sodium <= 3000 ? 8 : 3;
    factors.push({ id: 'sodium', label: 'Sodium', points: pts, max: 15, detail: `${Math.round(total.sodium).toLocaleString()} mg of the 2,300 mg guideline` });
  } else skipped.push('Sodium (not enough label data)');

  if (covered(total.sugarCal)) {
    const pct = (total.sugar * 4) / Math.max(total.cal, 1);
    factors.push({
      id: 'sugar',
      label: 'Sugar',
      points: pct <= 0.15 ? 10 : pct <= 0.25 ? 6 : 2,
      max: 10,
      detail: `${Math.round(pct * 100)}% of calories from total sugar`,
    });
  } else skipped.push('Sugar (not enough label data)');

  const distinct = new Set(entries.map((e) => e.name.toLowerCase())).size;
  factors.push({ id: 'variety', label: 'Variety', points: distinct >= 4 ? 10 : distinct >= 2 ? 6 : 2, max: 10, detail: `${distinct} different foods` });

  const got = factors.reduce((a, f) => a + f.points, 0);
  const max = factors.reduce((a, f) => a + f.max, 0);
  return { ready: true, score: Math.round((got / max) * 100), factors, skipped };
}
