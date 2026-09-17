import type { Nutrients } from './food';

export type Sex = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain';
export type TargetInput = {
  sex: Sex;
  age: number;
  heightIn: number;
  weightLb: number;
  targetLb: number;
  activity: number; // 1.2 – 1.725
  goal: Goal;
  ratePerWeek: number; // lb per week, positive number
};

export type Targets = Pick<Nutrients, 'calories' | 'protein' | 'carbs' | 'fat'> & { fiber: number };
export type TargetResult = { targets: Targets; tdee: number; bmr: number; warnings: string[]; saferRate: number | null };

export const FLOOR = { male: 1500, female: 1200 } as const;

/**
 * Mifflin–St Jeor × activity. 1 lb ≈ 3,500 kcal, so each lb/week ≈ 500 kcal/day.
 * Loss faster than 1% of bodyweight per week or below the calorie floor gets a warning
 * and a safer suggested rate. Protein 1.0 g/lb goal weight in a deficit, 0.8 otherwise.
 */
export function computeTargets(p: TargetInput): TargetResult {
  const kg = p.weightLb * 0.4536;
  const cm = p.heightIn * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const tdee = bmr * p.activity;
  const warnings: string[] = [];
  let saferRate: number | null = null;

  let rate = p.goal === 'maintain' ? 0 : Math.max(0, p.ratePerWeek);
  if (p.goal === 'lose') {
    const maxRate = Math.floor((p.weightLb * 0.01) / 0.25) * 0.25;
    if (rate > maxRate) {
      warnings.push(`Losing ${rate} lb a week is faster than 1% of your bodyweight. That usually costs muscle and is hard to sustain.`);
      saferRate = Math.max(0.25, maxRate);
    }
  }
  if (p.goal === 'gain' && rate > 0.5) {
    warnings.push('Gaining more than 0.5 lb a week is mostly fat for most people.');
    saferRate = 0.5;
  }

  const delta = p.goal === 'lose' ? -rate * 500 : p.goal === 'gain' ? rate * 500 : 0;
  let calories = Math.round((tdee + delta) / 10) * 10;
  const floor = FLOOR[p.sex];
  if (calories < floor) {
    warnings.push(`That pace would put you under ${floor.toLocaleString()} calories a day, so your target was raised to ${floor.toLocaleString()}.`);
    calories = floor;
    if (saferRate === null && p.goal === 'lose') saferRate = Math.max(0.25, Math.floor((tdee - floor) / 500 / 0.25) * 0.25);
  }
  const goalWeight = p.targetLb > 0 ? p.targetLb : p.weightLb;
  const protein = Math.round(goalWeight * (p.goal === 'lose' ? 1 : 0.8));
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((calories / 1000) * 14);
  return { targets: { calories, protein, carbs, fat, fiber }, tdee: Math.round(tdee), bmr: Math.round(bmr), warnings, saferRate };
}

/** How much of today's activity is added to the food budget. */
export type ExerciseMode = 'none' | 'half' | 'full';
export const exerciseBonus = (activeCalories: number, mode: ExerciseMode) =>
  mode === 'full' ? Math.round(activeCalories) : mode === 'half' ? Math.round(activeCalories / 2) : 0;
