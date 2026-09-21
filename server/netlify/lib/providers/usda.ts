import type { FoodItem } from '../../../../shared/food';
import { findRestaurant } from '../../../../shared/restaurants';
import { env } from '../http';
import { nutrients, num, tidyName, withRestaurant } from './normalize';
import type { BarcodeHit, NutritionProvider, ProviderSearch } from './types';

/** USDA FoodData Central — generic foods, branded foods (with GTIN/UPC), SR restaurant foods. */
type FdcNutrient = { nutrientId?: number; nutrientNumber?: string; value?: number };
type FdcFood = {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  publishedDate?: string;
  foodNutrients?: FdcNutrient[];
  foodCategory?: string;
};

const ID = { kcal: [1008, 2047, 2048], protein: [1003], carbs: [1005], fat: [1004], fiber: [1079], sugar: [2000, 1063], sodium: [1093] };
const pick = (list: FdcNutrient[], ids: number[]) => {
  for (const id of ids) {
    const v = list.find((n) => n.nutrientId === id)?.value;
    if (v != null) return v;
  }
  return null;
};

export function fdcToItem(f: FdcFood): FoodItem | null {
  const list = f.foodNutrients ?? [];
  const kcal100 = pick(list, ID.kcal);
  if (kcal100 == null) return null;
  const branded = f.dataType === 'Branded';
  // Search results report per 100 g/ml. Branded foods also give a serving size to convert to.
  const grams = f.servingSize && /^(g|ml|grm|mlt)$/i.test(f.servingSizeUnit ?? '') ? f.servingSize : commonWholeFoodServing(f.description)?.grams ?? null;
  const k = grams ? grams / 100 : 1;
  const v = (ids: number[]) => {
    const x = pick(list, ids);
    return x == null ? null : x * k;
  };
  // SR Legacy restaurant foods look like "OLIVE GARDEN, lasagna classico"
  const prefix = f.description.split(',')[0];
  const chain = !branded ? findRestaurant(prefix) : null;
  const name = chain ? tidyName(f.description.split(',').slice(1).join(',')) : tidyName(f.description);
  const brand = chain ? chain.restaurant.name : branded ? tidyName(f.brandName || f.brandOwner || '') || null : null;
  const item: FoodItem = {
    id: `usda:${f.fdcId}`,
    name,
    brand,
    kind: branded ? 'branded' : 'generic',
    serving: grams
      ? {
          // Keep the weight for calculations, but show the package's natural
          // household unit. A raw gram weight is not useful as a serving label.
          description: cleanHouseholdServing(f.householdServingFullText) || commonWholeFoodServing(f.description)?.description || friendlyPackagedServing(name),
          quantity: 1,
          unit: 'serving',
          grams,
        }
      : { description: '100 g', quantity: 100, unit: 'g', grams: 100 },
    nutrients: nutrients(kcal100 * k, v(ID.protein), v(ID.carbs), v(ID.fat), { fiber: v(ID.fiber), sugar: v(ID.sugar), sodium: v(ID.sodium) }),
    barcode: f.gtinUpc ?? null,
    source: {
      provider: 'usda',
      id: String(f.fdcId),
      url: `https://fdc.nal.usda.gov/food-details/${f.fdcId}/nutrients`,
      updatedAt: f.publishedDate,
      quality: branded ? 'verified_packaged' : 'database',
    },
  };
  return withRestaurant(item, !!chain);
}

function cleanHouseholdServing(raw?: string): string {
  return raw?.replace(/\s*\([^)]*\b(?:g|gram|grams|ml)\b[^)]*\)\s*/gi, ' ').replace(/\s+/g, ' ').trim() ?? '';
}

function commonWholeFoodServing(name: string): { description: string; grams: number } | null {
  const value = name.toLowerCase();
  if (/\b(juice|sauce|pie|dried|canned|baby food|salad|noodle|substitute|powder)\b/.test(value)) return null;
  const whole: [RegExp, string, number][] = [
    [/\bapples?\b/, '1 medium apple', 182],
    [/\bbananas?\b/, '1 medium banana', 118],
    [/\boranges?\b/, '1 medium orange', 131],
    [/\bpears?\b/, '1 medium pear', 178],
    [/\bpeaches?\b/, '1 medium peach', 150],
    [/\bavocados?\b/, '1 avocado', 201],
    [/\beggs?\b/, '1 large egg', 50],
  ];
  const match = whole.find(([pattern]) => pattern.test(value));
  return match ? { description: match[1], grams: match[2] } : null;
}

function friendlyPackagedServing(name: string): string {
  const value = name.toLowerCase();
  if (/\b(protein|granola|energy|snack|candy) bar\b|\bbar\b/.test(value)) return '1 bar';
  if (/\bshake\b/.test(value)) return '1 shake';
  if (/\byogurt\b/.test(value)) return '1 container';
  if (/\bcookie\b/.test(value)) return '1 cookie';
  if (/\bbottle\b/.test(value)) return '1 bottle';
  if (/\bcan\b/.test(value)) return '1 can';
  return '1 serving';
}

async function fdcSearch(body: Record<string, unknown>): Promise<FdcFood[]> {
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(env('USDA_FDC_API_KEY'))}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const data = (await res.json()) as { foods?: FdcFood[] };
  return data.foods ?? [];
}

export const usda: NutritionProvider = {
  id: 'usda',
  covers: ['generic', 'branded', 'restaurant'],
  configured: () => !!env('USDA_FDC_API_KEY'),
  async search(s: ProviderSearch) {
    const dataType = s.brandedOnly
      ? ['Branded']
      : s.restaurantOnly
        ? ['SR Legacy', 'Survey (FNDDS)']
        : ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'];
    const foods = await fdcSearch({ query: s.query, dataType, pageSize: s.pageSize, pageNumber: s.page });
    return foods.map(fdcToItem).filter((x): x is FoodItem => !!x);
  },
  async barcode(code: string): Promise<BarcodeHit | null> {
    const foods = await fdcSearch({ query: code, dataType: ['Branded'], pageSize: 5 });
    const strip = (x: string) => x.replace(/^0+/, '');
    const hit = foods.find((f) => f.gtinUpc && strip(f.gtinUpc) === strip(code));
    const item = hit ? fdcToItem(hit) : null;
    if (!item || !hit) return null;
    const list = hit.foodNutrients ?? [];
    return {
      item,
      signals: {
        per100g: {
          energyKcal: pick(list, ID.kcal),
          sugars: pick(list, ID.sugar),
          saturatedFat: pick(list, [1258]),
          sodiumMg: pick(list, ID.sodium),
          fiber: pick(list, ID.fiber),
          protein: pick(list, ID.protein),
        },
      },
    };
  },
};

export { num };
