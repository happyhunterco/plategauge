import type { Goals, Macros, Profile } from './types';

export const round = (n: number) => Math.round(n);
export const sumMacros = (items: (Macros & { qty: number })[]): Macros =>
  items.reduce(
    (a, i) => ({
      calories: a.calories + i.calories * i.qty,
      protein: a.protein + i.protein * i.qty,
      carbs: a.carbs + i.carbs * i.qty,
      fat: a.fat + i.fat * i.qty,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

/**
 * Mifflin–St Jeor BMR × activity, then a goal adjustment.
 * Loss: ~20% deficit. Gain: ~10% surplus. Floors keep targets out of crash-diet territory.
 * Protein: 1.0 g/lb of target weight in a deficit (protects lean mass), 0.8 g/lb otherwise.
 * Fat: 27% of calories. Carbs fill the rest.
 */
export function computeGoals(p: Profile): Goals {
  const kg = p.weightLb * 0.4536;
  const cm = p.heightIn * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const tdee = bmr * p.activity;
  const adj = p.goal === 'lose' ? 0.8 : p.goal === 'gain' ? 1.1 : 1;
  const floor = p.sex === 'male' ? 1500 : 1200;
  const calories = Math.max(floor, Math.round((tdee * adj) / 10) * 10);
  const protein = Math.round((p.targetLb || p.weightLb) * (p.goal === 'lose' ? 1 : 0.8));
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

export const fmt = (n: number) => round(n).toLocaleString('en-US');
