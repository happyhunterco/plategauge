import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FoodItem, Nutrients, Selection, SourceInfo } from '../shared/food';
import type { ExerciseMode, Goal, Sex } from '../shared/targets';
import type { LabelScore } from '../shared/productScore';
import { dayKey } from './dates';

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Profile = {
  name: string;
  username?: string | null;
  avatar?: string | null; // local file uri or remote url
  sex: Sex;
  age: number;
  heightIn: number;
  weightLb: number;
  targetLb: number;
  activity: number;
  goal: Goal;
  ratePerWeek: number;
  restrictions: string[];
  allergies: string[];
  favoriteRestaurants: string[];
};

export type Goals = { calories: number; protein: number; carbs: number; fat: number; fiber: number };

export type WorkoutPlan = {
  split: 'ppl' | 'upper_lower' | 'full_body' | 'strength_cardio';
  goal: 'general' | 'muscle' | 'strength' | 'fat_loss' | 'recomp';
  days: 3 | 4 | 5 | 6;
  minutes: 30 | 45 | 60 | 75;
  equipment: 'gym' | 'home' | 'bodyweight';
  cardio: 'walk' | 'incline_walk' | 'run' | 'bike' | 'row' | 'intervals';
  goals?: ('general' | 'muscle' | 'strength' | 'fat_loss')[];
  equipmentOptions?: ('gym' | 'home' | 'bodyweight')[];
  cardioOptions?: ('walk' | 'incline_walk' | 'run' | 'bike' | 'row' | 'intervals')[];
  experience?: 'beginner' | 'intermediate' | 'advanced';
  emphasis?: 'balanced' | 'glutes_legs' | 'upper_body' | 'athletic';
  limitations?: ('knees' | 'lower_back' | 'shoulders')[];
  trainingStyle?: 'mixed' | 'free_weights' | 'machines';
  personalized?: boolean;
};

export type Settings = {
  units: 'imperial' | 'metric';
  exerciseMode: ExerciseMode;
  waterGoalOz: number;
  stepGoal: number;
  notifications: { meals: boolean; water: boolean; weighIn: boolean };
  workoutPlan: WorkoutPlan;
};

export type Account = { id: string; email: string | null; provider: 'email' | 'apple' | 'google'; dev?: boolean };

/** One logged food. Nutrients are per ONE serving including any Build It changes; qty multiplies. */
export type Entry = {
  id: string;
  date: string;
  meal: Meal;
  createdAt: number;
  name: string;
  brand?: string | null;
  serving: string;
  qty: number;
  nutrients: Nutrients;
  source: SourceInfo;
  foodId?: string;
  barcode?: string | null;
  changes?: string[];
  customization?: { title: string; selection: Selection };
  via: 'search' | 'barcode' | 'photo' | 'text' | 'crave' | 'quick' | 'recipe' | 'custom';
};

export type Draft = {
  key: string;
  item: FoodItem;
  qty: number;
  changes?: string[];
  customization?: Entry['customization'];
  via: Entry['via'];
  score?: LabelScore | null;
};

export type Water = { id: string; date: string; oz: number; createdAt: number };
export type Weight = { date: string; lb: number; createdAt: number };
export type Activity = {
  id: string;
  date: string;
  type: string;
  minutes: number;
  calories: number;
  createdAt: number;
  source: 'manual' | 'apple_health' | 'health_connect';
  externalId?: string;
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const DEFAULT_SETTINGS: Settings = {
  units: 'imperial',
  exerciseMode: 'none',
  waterGoalOz: 96,
  stepGoal: 8000,
  notifications: { meals: false, water: false, weighIn: false },
  workoutPlan: { split: 'full_body', goal: 'general', goals: ['general'], days: 3, minutes: 45, equipment: 'gym', equipmentOptions: ['gym'], cardio: 'walk', cardioOptions: ['walk'], experience: 'beginner', emphasis: 'balanced', limitations: [], trainingStyle: 'mixed', personalized: false },
};

type State = {
  profile: Profile | null;
  goals: Goals | null;
  goalsManual: boolean;
  subscription?: { status: string; plan: string | null; current_period_end: number | null } | null;
  set: (partial: Partial<State>) => void;
  settings: Settings;
  account: Account | null;
  entries: Entry[];
  water: Water[];
  weights: Weight[];
  activities: Activity[];
  workoutChecks: Record<string, boolean>;
  steps: Record<string, number>;
  savedFoods: FoodItem[];
  customFoods: FoodItem[];
  recentFoods: FoodItem[];
  recentSearches: string[];
  pantry: string[];
  aiConsent: boolean | null;
  unsynced: string[];

  // transient
  day: string;
  drafts: Draft[];
  draftMeal: Meal | null;
  hydrated: boolean;
  authReady: boolean;
  recovery: boolean;
  lastUndo: { label: string; undo: () => void } | null;

  setDay: (d: string) => void;
  setAccount: (a: Account | null) => void;
  setAuthReady: (v: boolean) => void;
  setRecovery: (v: boolean) => void;
  completeOnboarding: (p: Profile, g: Goals) => void;
  updateProfile: (p: Partial<Profile>) => void;
  setGoals: (g: Goals, manual: boolean) => void;
  updateSettings: (s: Partial<Settings>) => void;
  setAiConsent: (v: boolean | null) => void;

  stage: (drafts: Omit<Draft, 'key'>[], meal?: Meal | null) => void;
  updateDraft: (key: string, patch: Partial<Draft>) => void;
  removeDraft: (key: string) => void;
  commit: (meal: Meal) => Entry[];
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  removeEntry: (id: string) => Entry | undefined;
  restoreEntry: (e: Entry) => void;

  addWater: (oz: number) => Water;
  removeWater: (id: string) => void;
  logWeight: (lb: number) => void;
  removeWeight: (date: string) => void;
  addActivity: (a: Omit<Activity, 'id' | 'createdAt'>) => boolean;
  removeActivity: (id: string) => void;
  toggleWorkoutCheck: (key: string) => void;
  setSteps: (date: string, n: number) => void;

  toggleSaved: (f: FoodItem) => void;
  addCustomFood: (f: FoodItem) => void;
  removeCustomFood: (id: string) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;

  addPantry: (items: string[]) => void;
  removePantry: (item: string) => void;

  setUndo: (u: State['lastUndo']) => void;
  markUnsynced: (id: string) => void;
  clearUnsynced: () => void;
  hydrateFromCloud: (d: { profile: Profile | null; goals: Goals | null; goalsManual: boolean; settings: Settings | null; entries: Entry[] }) => void;
  resetAll: () => void;
};

const EMPTY = {
  profile: null,
  goals: null,
  goalsManual: false,
  settings: DEFAULT_SETTINGS,
  account: null,
  entries: [],
  water: [],
  weights: [],
  activities: [],
  workoutChecks: {},
  steps: {},
  savedFoods: [],
  customFoods: [],
  recentFoods: [],
  recentSearches: [],
  pantry: [],
  aiConsent: null,
  unsynced: [],
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      day: dayKey(),
      drafts: [],
      draftMeal: null,
      hydrated: false,
      set: (partial) => set(partial),
      authReady: false,
      recovery: false,
      lastUndo: null,

      setDay: (day) => set({ day }),
      setAccount: (account) => set({ account }),
      setAuthReady: (authReady) => set({ authReady }),
      setRecovery: (recovery) => set({ recovery }),
      completeOnboarding: (profile, goals) => {
        const today = dayKey();
        const weights = get().weights.filter((w) => w.date !== today);
        set({
          profile,
          goals,
          goalsManual: false,
          weights: [...weights, { date: today, lb: profile.weightLb, createdAt: Date.now() }].sort((a, b) => a.date.localeCompare(b.date)),
        });
      },
      updateProfile: (p) => {
        const cur = get().profile;
        if (cur) set({ profile: { ...cur, ...p } });
      },
      setGoals: (goals, manual) => set({ goals, goalsManual: manual }),
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      setAiConsent: (aiConsent) => set({ aiConsent }),

      stage: (drafts, meal = null) => set({ drafts: drafts.map((d) => ({ ...d, key: uid() })), draftMeal: meal }),
      updateDraft: (key, patch) => set({ drafts: get().drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)) }),
      removeDraft: (key) => set({ drafts: get().drafts.filter((d) => d.key !== key) }),
      commit: (meal) => {
        const { drafts, day, entries, recentFoods } = get();
        const now = Date.now();
        const added: Entry[] = drafts
          .filter((d) => d.qty > 0)
          .map((d) => ({
            id: uid(),
            date: day,
            meal,
            createdAt: now,
            name: d.item.name,
            brand: d.item.brand ?? null,
            serving: d.item.serving.description,
            qty: d.qty,
            nutrients: d.item.nutrients,
            source: d.item.source,
            foodId: d.item.id,
            barcode: d.item.barcode ?? null,
            changes: d.changes,
            customization: d.customization,
            via: d.via,
          }));
        const ids = new Set(drafts.map((d) => d.item.id));
        set({
          entries: [...entries, ...added],
          recentFoods: [...drafts.filter((d) => !d.changes?.length).map((d) => d.item), ...recentFoods.filter((r) => !ids.has(r.id))].slice(0, 30),
          drafts: [],
          draftMeal: null,
        });
        return added;
      },
      updateEntry: (id, patch) => set({ entries: get().entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }),
      removeEntry: (id) => {
        const e = get().entries.find((x) => x.id === id);
        set({ entries: get().entries.filter((x) => x.id !== id) });
        return e;
      },
      restoreEntry: (e) => set({ entries: [...get().entries, e] }),

      addWater: (oz) => {
        const w = { id: uid(), date: get().day, oz, createdAt: Date.now() };
        set({ water: [...get().water, w] });
        return w;
      },
      removeWater: (id) => set({ water: get().water.filter((w) => w.id !== id) }),
      logWeight: (lb) => {
        const date = get().day;
        const rest = get().weights.filter((w) => w.date !== date);
        set({ weights: [...rest, { date, lb, createdAt: Date.now() }].sort((a, b) => a.date.localeCompare(b.date)) });
        const p = get().profile;
        if (p && date === dayKey()) set({ profile: { ...p, weightLb: lb } });
      },
      removeWeight: (date) => set({ weights: get().weights.filter((w) => w.date !== date) }),
      addActivity: (a) => {
        // Imported workouts carry an external id; never import the same one twice.
        if (a.externalId && get().activities.some((x) => x.externalId === a.externalId)) return false;
        set({ activities: [...get().activities, { ...a, id: uid(), createdAt: Date.now() }] });
        return true;
      },
      removeActivity: (id) => set({ activities: get().activities.filter((a) => a.id !== id) }),
      toggleWorkoutCheck: (key) => set({ workoutChecks: { ...get().workoutChecks, [key]: !get().workoutChecks[key] } }),
      setSteps: (date, n) => set({ steps: { ...get().steps, [date]: n } }),

      toggleSaved: (f) => {
        const s = get().savedFoods;
        set({ savedFoods: s.some((x) => x.id === f.id) ? s.filter((x) => x.id !== f.id) : [f, ...s].slice(0, 200) });
      },
      addCustomFood: (f) => set({ customFoods: [f, ...get().customFoods.filter((x) => x.id !== f.id)] }),
      removeCustomFood: (id) => set({ customFoods: get().customFoods.filter((x) => x.id !== id) }),
      addRecentSearch: (q) => {
        const t = q.trim();
        if (t.length < 2) return;
        set({ recentSearches: [t, ...get().recentSearches.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8) });
      },
      clearRecentSearches: () => set({ recentSearches: [] }),

      addPantry: (items) => {
        const cur = get().pantry;
        const lower = new Set(cur.map((c) => c.toLowerCase()));
        set({ pantry: [...cur, ...items.map((i) => i.trim()).filter((i) => i && !lower.has(i.toLowerCase()))] });
      },
      removePantry: (item) => set({ pantry: get().pantry.filter((p) => p !== item) }),

      setUndo: (lastUndo) => set({ lastUndo }),
      markUnsynced: (id) => set({ unsynced: [...new Set([...get().unsynced, id])] }),
      clearUnsynced: () => set({ unsynced: [] }),
      hydrateFromCloud: (d) => {
        const cur = get();
        const byId = new Map(cur.entries.map((e) => [e.id, e]));
        for (const e of d.entries) byId.set(e.id, e);
        set({
          profile: d.profile ?? cur.profile,
          goals: d.goals ?? cur.goals,
          goalsManual: d.goalsManual,
          settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? cur.settings) },
          entries: [...byId.values()],
        });
      },
      resetAll: () => set({ ...EMPTY, drafts: [], day: dayKey() }),
    }),
    {
      name: 'plategauge-v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        profile: s.profile,
        goals: s.goals,
        goalsManual: s.goalsManual,
        settings: s.settings,
        account: s.account,
        entries: s.entries,
        water: s.water,
        weights: s.weights,
        activities: s.activities,
        workoutChecks: s.workoutChecks,
        steps: s.steps,
        savedFoods: s.savedFoods,
        customFoods: s.customFoods,
        recentFoods: s.recentFoods,
        recentSearches: s.recentSearches,
        pantry: s.pantry,
        aiConsent: s.aiConsent,
        unsynced: s.unsynced,
      }),
      migrate: (persisted, version) => migrate(persisted as Record<string, unknown>, version) as never,
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

/** v1 (first release) → v2: nested nutrients, richer profile, fiber goal, settings. */
type V1Entry = {
  id: string;
  date: string;
  meal: Meal;
  createdAt: number;
  name: string;
  brand?: string;
  serving: string;
  qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
};
export function migrate(s: Record<string, unknown>, version: number) {
  if (version >= 2) return s;
  const p = s.profile as (Partial<Profile> & { goal?: Goal }) | null;
  const g = s.goals as Omit<Goals, 'fiber'> | null;
  const entries = ((s.entries as V1Entry[]) ?? []).map((e): Entry => ({
    id: e.id,
    date: e.date,
    meal: e.meal,
    createdAt: e.createdAt,
    name: e.name,
    brand: e.brand ?? null,
    serving: e.serving,
    qty: e.qty,
    nutrients: { calories: e.calories, protein: e.protein, carbs: e.carbs, fat: e.fat, fiber: null, sugar: null, sodium: null },
    source: {
      provider: e.source === 'search' ? 'dev' : 'ai',
      quality: ['photo'].includes(e.source) ? 'photo_estimate' : e.source === 'quick' ? 'user' : 'estimate',
    },
    via: (['photo', 'text', 'crave', 'quick', 'recipe', 'barcode', 'search'].includes(e.source) ? e.source : 'search') as Entry['via'],
  }));
  return {
    ...s,
    profile: p ? { name: '', restrictions: [], allergies: [], favoriteRestaurants: [], ratePerWeek: p.goal === 'maintain' ? 0 : 1, ...p } : null,
    goals: g ? { ...g, fiber: Math.round((g.calories / 1000) * 14) } : null,
    goalsManual: false,
    settings: DEFAULT_SETTINGS,
    entries,
    weights: ((s.weights as { date: string; lb: number }[]) ?? []).map((w) => ({ ...w, createdAt: 0 })),
    water: [],
    activities: [],
    steps: {},
    savedFoods: [],
    customFoods: [],
    recentFoods: [],
    recentSearches: [],
    unsynced: [],
    account: null,
  };
}

export const useDayEntries = (day: string) => {
  const entries = useStore((s) => s.entries);
  return entries.filter((e) => e.date === day);
};
