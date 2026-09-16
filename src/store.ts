import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dayKey } from './dates';
import type { Draft, Entry, Goals, Meal, Profile, WeighIn } from './types';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type State = {
  profile: Profile | null;
  goals: Goals | null;
  entries: Entry[];
  weights: WeighIn[];
  pantry: string[];
  recent: Draft[];
  aiConsent: boolean | null;
  // transient
  day: string;
  drafts: Draft[];
  draftMeal: Meal | null;
  hydrated: boolean;

  setDay: (d: string) => void;
  setAiConsent: (v: boolean | null) => void;
  saveProfile: (p: Profile, g: Goals) => void;
  setGoals: (g: Goals) => void;
  stage: (drafts: Omit<Draft, 'key'>[], meal?: Meal | null) => void;
  updateDraft: (key: string, patch: Partial<Draft>) => void;
  removeDraft: (key: string) => void;
  commit: (meal: Meal) => void;
  removeEntry: (id: string) => void;
  logWeight: (lb: number) => void;
  addPantry: (items: string[]) => void;
  removePantry: (item: string) => void;
  clearPantry: () => void;
  resetAll: () => void;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: null,
      goals: null,
      entries: [],
      weights: [],
      pantry: [],
      recent: [],
      aiConsent: null,
      day: dayKey(),
      drafts: [],
      draftMeal: null,
      hydrated: false,

      setDay: (day) => set({ day }),
      setAiConsent: (aiConsent) => set({ aiConsent }),
      saveProfile: (profile, goals) => {
        const weights = get().weights;
        const today = dayKey();
        const hasToday = weights.some((w) => w.date === today);
        set({
          profile,
          goals,
          weights: hasToday ? weights : [...weights, { date: today, lb: profile.weightLb }],
        });
      },
      setGoals: (goals) => set({ goals }),

      stage: (drafts, meal = null) =>
        set({ drafts: drafts.map((d) => ({ ...d, key: uid() })), draftMeal: meal }),
      updateDraft: (key, patch) =>
        set({ drafts: get().drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)) }),
      removeDraft: (key) => set({ drafts: get().drafts.filter((d) => d.key !== key) }),
      commit: (meal) => {
        const { drafts, day, entries, recent } = get();
        const now = Date.now();
        const added: Entry[] = drafts
          .filter((d) => d.qty > 0)
          .map((d) => ({ ...d, id: uid(), date: day, meal, createdAt: now }));
        const names = new Set(drafts.map((d) => d.name.toLowerCase()));
        set({
          entries: [...entries, ...added],
          recent: [...drafts.map((d) => ({ ...d, qty: 1 })), ...recent.filter((r) => !names.has(r.name.toLowerCase()))].slice(0, 25),
          drafts: [],
          draftMeal: null,
        });
      },
      removeEntry: (id) => set({ entries: get().entries.filter((e) => e.id !== id) }),

      logWeight: (lb) => {
        const date = dayKey();
        const rest = get().weights.filter((w) => w.date !== date);
        set({ weights: [...rest, { date, lb }].sort((a, b) => a.date.localeCompare(b.date)) });
      },

      addPantry: (items) => {
        const cur = get().pantry;
        const lower = new Set(cur.map((c) => c.toLowerCase()));
        const next = items.map((i) => i.trim()).filter((i) => i && !lower.has(i.toLowerCase()));
        set({ pantry: [...cur, ...next] });
      },
      removePantry: (item) => set({ pantry: get().pantry.filter((p) => p !== item) }),
      clearPantry: () => set({ pantry: [] }),

      resetAll: () =>
        set({ profile: null, goals: null, entries: [], weights: [], pantry: [], recent: [], drafts: [], aiConsent: null }),
    }),
    {
      name: 'plategauge-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        profile: s.profile,
        goals: s.goals,
        entries: s.entries,
        weights: s.weights,
        pantry: s.pantry,
        recent: s.recent,
        aiConsent: s.aiConsent,
      }),
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    }
  )
);

export const useDayEntries = (day: string) => {
  const entries = useStore((s) => s.entries);
  return entries.filter((e) => e.date === day);
};
