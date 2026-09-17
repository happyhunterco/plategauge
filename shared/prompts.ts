import type { FoodItem, Nutrients, Quality } from './food';
import { categoryOf } from './tags';

/** Prompts shared by the Netlify AI function and the in-preview Claude transport. */

const MACROS = '"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number|null, "sugar": number|null, "sodium": number|null';
const BASE = `You are PlateGauge's nutrition engine. Estimate like a registered dietitian using USDA FoodData Central reference values and realistic US portions. Reply with ONLY one JSON object: no prose, no markdown. Macros in grams, sodium in mg, calories in kcal, all for the serving described. Round to whole numbers. Use null when you can't estimate a value.`;

export const PROMPTS = {
  photo: `${BASE}
Look at the photo and identify every distinct food and drink that is actually visible. Describe what you see, not what is typical: name the real dish (e.g. "pepperoni pizza slice", "pad thai"), not a generic stand-in.
Estimate each portion from visual cues (plate ~10–11 in, utensils, hands, packaging). Include visible sauces, dressings and oils as separate items when they matter.
Shape: {"foods":[{"name": string, "serving": string, "grams": number|null, ${MACROS}, "confidence": "high"|"medium"|"low", "low": number, "high": number}], "notes": string}
"low"/"high" are a realistic calorie range for that item. If the image has no food, return {"foods": [], "notes": "No food found"}.`,
  label: `${BASE}
The photo is a Nutrition Facts label. Read the numbers exactly as printed; do not estimate. If a value isn't printed, use null.
Shape: {"name": string|null, "brand": string|null, "serving": string, "grams": number|null, ${MACROS}, "readable": boolean}
Set "readable" false if the label is blurry or cut off.`,
  text: `${BASE}
Split the description into individual foods. Use the amounts given; otherwise assume one typical serving.
Shape: {"foods":[{"name": string, "serving": string, "grams": number|null, ${MACROS}, "confidence": "high"|"medium"|"low", "low": number, "high": number}]}`,
  ideas: `${BASE}
Suggest 5 specific, real foods that match EVERY flavor, texture and temperature the person asked for. Match the craving first; then prefer options that fit the remaining budget and help with protein. Mix store-bought items and 10-minute snacks. Never suggest something that doesn't match the craving just because it's healthy.
Shape: {"ideas":[{"name": string, "serving": string, ${MACROS}, "tags": string[]}]}`,
  kitchen: `${BASE}
Create 2-3 recipes that mainly use the pantry items, fit the remaining budget per serving, and take under 30 minutes. Assume salt, pepper, oil and basic spices.
Shape: {"recipes":[{"title": string, "minutes": number, "servings": number, "calories": number, "protein": number, "carbs": number, "fat": number, "ingredients": string[], "steps": string[], "missing": string[]}]}`,
} as const;

export type AiTask = keyof typeof PROMPTS;

const num = (v: unknown, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
};
const opt = (v: unknown, max: number) => (v === null || v === undefined || v === '' ? null : num(v, max));
const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function nutrientsFrom(o: Record<string, unknown>): Nutrients {
  return {
    calories: Math.round(num(o.calories, 5000)),
    protein: Math.round(num(o.protein, 500)),
    carbs: Math.round(num(o.carbs, 800)),
    fat: Math.round(num(o.fat, 400)),
    fiber: opt(o.fiber, 150),
    sugar: opt(o.sugar, 500),
    sodium: opt(o.sodium, 20000),
  };
}

export function extractJson(text: string): Record<string, unknown> {
  const clean = text.replace(/```json|```/g, '');
  const m = clean.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : clean);
}

let seq = 0;
export function foodsFromAi(raw: Record<string, unknown>, quality: Quality, key: 'foods' | 'ideas' = 'foods'): FoodItem[] {
  const list = Array.isArray(raw[key]) ? (raw[key] as Record<string, unknown>[]) : [];
  return list.slice(0, 12).flatMap((f) => {
    const name = str(f.name, 80);
    if (!name) return [];
    const n = nutrientsFrom(f);
    const low = opt(f.low, 5000);
    const high = opt(f.high, 5000);
    const conf = ['high', 'medium', 'low'].includes(String(f.confidence)) ? (f.confidence as 'high' | 'medium' | 'low') : undefined;
    return [
      {
        id: `ai:${Date.now().toString(36)}${(seq++).toString(36)}`,
        name,
        kind: 'generic' as const,
        category: categoryOf(name),
        serving: { description: str(f.serving, 60) || '1 serving', quantity: 1, unit: 'serving', grams: opt(f.grams, 5000) },
        nutrients: n,
        tags: Array.isArray(f.tags) ? (f.tags as unknown[]).map((t) => str(t, 20)).filter(Boolean) : undefined,
        source: {
          provider: 'ai' as const,
          quality,
          confidence: conf,
          range: low != null && high != null && high >= low ? { low: Math.round(low), high: Math.round(high) } : undefined,
        },
      },
    ];
  });
}

export type LabelRead = { readable: boolean; name: string | null; brand: string | null; serving: string; grams: number | null; nutrients: Nutrients };
export function labelFromAi(raw: Record<string, unknown>): LabelRead {
  return {
    readable: raw.readable !== false,
    name: str(raw.name, 80) || null,
    brand: str(raw.brand, 60) || null,
    serving: str(raw.serving, 60) || '1 serving',
    grams: opt(raw.grams, 5000),
    nutrients: nutrientsFrom(raw),
  };
}

export type Recipe = {
  title: string;
  minutes: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  steps: string[];
  missing: string[];
};
export function recipesFromAi(raw: Record<string, unknown>): Recipe[] {
  const list = Array.isArray(raw.recipes) ? (raw.recipes as Record<string, unknown>[]) : [];
  const arr = (v: unknown, n: number, max: number) =>
    Array.isArray(v)
      ? v
          .map((x) => str(x, max))
          .filter(Boolean)
          .slice(0, n)
      : [];
  return list
    .slice(0, 4)
    .map((r) => ({
      title: str(r.title, 80),
      minutes: Math.round(num(r.minutes, 240)),
      servings: Math.max(1, Math.round(num(r.servings, 12))),
      calories: Math.round(num(r.calories, 5000)),
      protein: Math.round(num(r.protein, 500)),
      carbs: Math.round(num(r.carbs, 800)),
      fat: Math.round(num(r.fat, 400)),
      ingredients: arr(r.ingredients, 20, 120),
      steps: arr(r.steps, 12, 300),
      missing: arr(r.missing, 8, 60),
    }))
    .filter((r) => r.title);
}
