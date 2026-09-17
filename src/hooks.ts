import { useMemo } from 'react';
import { sum } from '../shared/nutrients';
import { exerciseBonus } from '../shared/targets';
import { streakInfo } from '../shared/streak';
import { dayKey } from './dates';
import { useStore } from './store';

export function useDayTotals(day: string) {
  const entries = useStore((s) => s.entries);
  const activities = useStore((s) => s.activities);
  const water = useStore((s) => s.water);
  const goals = useStore((s) => s.goals);
  const settings = useStore((s) => s.settings);
  const steps = useStore((s) => s.steps[day] ?? null);
  return useMemo(() => {
    const list = entries.filter((e) => e.date === day);
    const eaten = sum(
      list.map((e) => ({
        ...e.nutrients,
        calories: e.nutrients.calories * e.qty,
        protein: e.nutrients.protein * e.qty,
        carbs: e.nutrients.carbs * e.qty,
        fat: e.nutrients.fat * e.qty,
        fiber: e.nutrients.fiber == null ? null : e.nutrients.fiber * e.qty,
        sugar: e.nutrients.sugar == null ? null : e.nutrients.sugar * e.qty,
        sodium: e.nutrients.sodium == null ? null : e.nutrients.sodium * e.qty,
      })),
    );
    const acts = activities.filter((a) => a.date === day);
    const active = acts.reduce((a, x) => a + x.calories, 0);
    const bonus = exerciseBonus(active, settings.exerciseMode);
    const g = goals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    const budget = g.calories + bonus;
    const oz = water.filter((w) => w.date === day).reduce((a, w) => a + w.oz, 0);
    // Optional nutrients: partial sums are still useful; the UI marks them as "from foods with label data".
    const partial = (k: 'fiber' | 'sugar' | 'sodium') => list.reduce((a, e) => a + (e.nutrients[k] ?? 0) * e.qty, 0);
    const known = (k: 'fiber' | 'sugar' | 'sodium') => list.filter((e) => e.nutrients[k] != null).length;
    return {
      list,
      eaten,
      fiber: partial('fiber'),
      sugar: partial('sugar'),
      sodium: partial('sodium'),
      coverage: { fiber: known('fiber'), sugar: known('sugar'), sodium: known('sodium'), total: list.length },
      goals: g,
      active,
      bonus,
      budget,
      left: {
        calories: Math.round(budget - eaten.calories),
        protein: Math.round(g.protein - eaten.protein),
        carbs: Math.round(g.carbs - eaten.carbs),
        fat: Math.round(g.fat - eaten.fat),
      },
      acts,
      steps,
      oz,
    };
  }, [entries, activities, water, goals, settings.exerciseMode, steps, day]);
}

export function useLeftToday() {
  const day = useStore((s) => s.day);
  const t = useDayTotals(day);
  return {
    calories: Math.max(t.left.calories, 0),
    protein: Math.max(t.left.protein, 0),
    carbs: Math.max(t.left.carbs, 0),
    fat: Math.max(t.left.fat, 0),
  };
}

export function useStreak() {
  const entries = useStore((s) => s.entries);
  return useMemo(() => streakInfo(new Set(entries.map((e) => e.date)), dayKey()), [entries]);
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
