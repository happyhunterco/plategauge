import { sumMacros } from './nutrition';
import { useDayEntries, useStore } from './store';
import type { Macros } from './types';

/** What's still available in today's budget. */
export function useLeft(): Macros {
  const goals = useStore((s) => s.goals);
  const day = useStore((s) => s.day);
  const eaten = sumMacros(useDayEntries(day));
  const g = goals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  return {
    calories: Math.max(g.calories - eaten.calories, 0),
    protein: Math.max(g.protein - eaten.protein, 0),
    carbs: Math.max(g.carbs - eaten.carbs, 0),
    fat: Math.max(g.fat - eaten.fat, 0),
  };
}
