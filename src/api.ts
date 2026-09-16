import { Alert, Platform } from 'react-native';
import { useStore } from './store';
import type { Draft, Idea, Macros, Recipe } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY ?? '';
export const DEMO = !API_URL;

type NewDraft = Omit<Draft, 'key'>;
const OFF_UA = 'PlateGauge/1.0 (support@plategauge.app)';

const num = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/* ---------------- Open Food Facts (barcodes + packaged search) ---------------- */

type OffProduct = {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string>;
};

function offToDraft(p: OffProduct, source: NewDraft['source']): NewDraft | null {
  const n = p.nutriments ?? {};
  const name = p.product_name?.trim();
  if (!name) return null;
  const hasServing = n['energy-kcal_serving'] != null;
  const pick = (k: string) => num(hasServing ? n[`${k}_serving`] : n[`${k}_100g`]);
  const calories = pick('energy-kcal');
  if (!calories) return null;
  return {
    name,
    brand: p.brands?.split(',')[0]?.trim(),
    serving: hasServing && p.serving_size ? p.serving_size : '100 g',
    calories,
    protein: pick('proteins'),
    carbs: pick('carbohydrates'),
    fat: pick('fat'),
    qty: 1,
    source,
  };
}

export async function lookupBarcode(code: string): Promise<NewDraft | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,serving_size,nutriments`,
    { headers: { 'User-Agent': OFF_UA } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return offToDraft(data.product, 'barcode');
}

export async function searchPackaged(q: string, signal?: AbortSignal): Promise<NewDraft[]> {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1&page_size=15` +
    `&fields=product_name,brands,serving_size,nutriments&search_terms=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { 'User-Agent': OFF_UA } });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.products ?? []) as OffProduct[])
    .map((p) => offToDraft(p, 'search'))
    .filter((d): d is NewDraft => !!d);
}

/* ---------------- AI endpoints (server/netlify/functions/ai.ts) ---------------- */

type Task = 'text' | 'photo' | 'crave' | 'menus' | 'kitchen';

/**
 * Apple requires clear disclosure and permission before personal data (like meal photos)
 * goes to a third-party AI service. Ask once, remember the answer, allow changing it in Progress.
 */
function ensureConsent(): Promise<void> {
  const { aiConsent, setAiConsent } = useStore.getState();
  if (aiConsent === true || Platform.OS === 'web') return Promise.resolve();
  const off = new Error('AI features are off. Turn them on in Progress to use this.');
  if (aiConsent === false) return Promise.reject(off);
  return new Promise((resolve, reject) => {
    Alert.alert(
      'Use AI estimates?',
      'To estimate meals and suggest food, PlateGauge sends what you type or photograph, plus your remaining calories and macros, to Anthropic’s Claude AI. Nothing else from your log is sent, and it isn’t used to identify you.',
      [
        { text: 'Don’t allow', style: 'cancel', onPress: () => { setAiConsent(false); reject(off); } },
        { text: 'Allow', onPress: () => { setAiConsent(true); resolve(); } },
      ],
      { cancelable: false }
    );
  });
}

async function ai<T>(task: Task, payload: Record<string, unknown>, demo: () => T): Promise<T> {
  await ensureConsent();
  if (!API_URL) {
    await new Promise((r) => setTimeout(r, 900));
    return demo();
  }
  const res = await fetch(`${API_URL}/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-key': APP_KEY },
    body: JSON.stringify({ task, ...payload }),
  });
  if (!res.ok) throw new Error(res.status === 429 ? 'Too many requests. Try again in a minute.' : 'Couldn’t reach PlateGauge. Check your connection and try again.');
  return (await res.json()) as T;
}

type FoodsOut = { foods: (Macros & { name: string; serving: string })[] };
const toDrafts = (o: FoodsOut, source: NewDraft['source']): NewDraft[] =>
  (o.foods ?? []).map((f) => ({ ...f, qty: 1, source }));

export async function parseText(text: string): Promise<NewDraft[]> {
  const out = await ai<FoodsOut>('text', { text }, () => ({
    foods: [
      { name: 'Scrambled eggs', serving: '2 eggs', calories: 182, protein: 12, carbs: 2, fat: 14 },
      { name: 'Sourdough toast', serving: '1 slice', calories: 120, protein: 4, carbs: 23, fat: 1 },
    ],
  }));
  return toDrafts(out, 'text');
}

export async function analyzePhoto(base64: string, note?: string): Promise<NewDraft[]> {
  const out = await ai<FoodsOut>('photo', { image: base64, note }, () => ({
    foods: [
      { name: 'Grilled chicken', serving: '5 oz', calories: 234, protein: 44, carbs: 0, fat: 5 },
      { name: 'White rice', serving: '1 cup', calories: 205, protein: 4, carbs: 45, fat: 0 },
      { name: 'Roasted broccoli', serving: '1 cup', calories: 55, protein: 4, carbs: 8, fat: 2 },
    ],
  }));
  return toDrafts(out, 'photo');
}

export async function crave(prompt: string, left: Macros): Promise<Idea[]> {
  const out = await ai<{ ideas: Idea[] }>('crave', { prompt, left }, () => ({
    ideas: [
      { name: 'Protein yogurt bowl', serving: '1 bowl', calories: 320, protein: 30, carbs: 38, fat: 5, note: 'Sweet and crunchy with berries and a little granola.' },
      { name: 'Chicken quesadilla', serving: '1 tortilla', calories: 440, protein: 38, carbs: 30, fat: 18, note: 'Salty, melty, ten minutes in a pan.' },
      { name: 'Cottage cheese + honey', serving: '1 cup', calories: 250, protein: 24, carbs: 20, fat: 5, note: 'Fast, sweet, and keeps you full.' },
    ],
  }));
  return out.ideas ?? [];
}

export async function menus(restaurant: string, prompt: string, left: Macros): Promise<Idea[]> {
  const out = await ai<{ ideas: Idea[] }>('menus', { restaurant, prompt, left }, () => ({
    ideas: [
      { name: 'Chicken burrito bowl', where: restaurant, serving: '1 bowl', calories: 610, protein: 52, carbs: 60, fat: 17, note: 'White rice, black beans, fajita veggies, fresh salsa, lettuce. Skip cheese and sour cream.' },
      { name: 'Steak salad', where: restaurant, serving: '1 salad', calories: 420, protein: 35, carbs: 24, fat: 20, note: 'Romaine, steak, fajita veggies, corn salsa, half guac.' },
      { name: 'Chicken tacos (3)', where: restaurant, serving: '3 tacos', calories: 480, protein: 40, carbs: 45, fat: 14, note: 'Soft flour, chicken, pico, lettuce.' },
    ],
  }));
  return out.ideas ?? [];
}

export async function kitchen(pantry: string[], prompt: string, left: Macros): Promise<Recipe[]> {
  const out = await ai<{ recipes: Recipe[] }>('kitchen', { pantry, prompt, left }, () => ({
    recipes: [
      {
        title: 'Garlic rice chicken skillet', minutes: 20, servings: 2,
        calories: 480, protein: 42, carbs: 46, fat: 12,
        ingredients: ['12 oz chicken breast, diced', '1½ cups cooked rice', '2 cloves garlic', '1 cup broccoli', '1 tbsp olive oil', '2 tbsp soy sauce'],
        steps: ['Sear chicken in oil over medium-high, 6 minutes.', 'Add garlic and broccoli, cook 3 minutes.', 'Stir in rice and soy sauce until hot.'],
        missing: [],
      },
      {
        title: 'Egg and cheese breakfast tacos', minutes: 10, servings: 1,
        calories: 390, protein: 24, carbs: 30, fat: 19,
        ingredients: ['3 eggs', '2 flour tortillas', '1 oz cheddar', 'Salsa'],
        steps: ['Scramble eggs soft.', 'Warm tortillas, fill with eggs and cheese.', 'Top with salsa.'],
        missing: ['Salsa'],
      },
    ],
  }));
  return out.recipes ?? [];
}
