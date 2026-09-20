import type { FoodItem } from '../../../../shared/food';
import { nutrients, num, withRestaurant } from './normalize';
import { OFF_UA, type BarcodeHit, type NutritionProvider, type ProviderSearch } from './types';

/**
 * Open Food Facts — the largest open barcode database (world coverage, ODbL).
 * Also supplies Nutri-Score, NOVA group and additives for the Label Score.
 * Product images are CC BY-SA; the app credits Open Food Facts when showing them.
 */
export type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  // The product endpoint normally returns a comma-separated string, while
  // search occasionally returns an array despite requesting the same field.
  brands?: string | string[];
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string>;
  nutriscore_grade?: string;
  nova_group?: number;
  additives_tags?: string[];
  image_front_small_url?: string;
  categories_tags?: string[];
  last_modified_t?: number;
};

const FIELDS =
  'code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments,nutriscore_grade,nova_group,additives_tags,image_front_small_url,categories_tags,last_modified_t';

export function offToItem(p: OffProduct): FoodItem | null {
  const n = p.nutriments ?? {};
  const name = (p.product_name_en || p.product_name || '').trim();
  if (!name) return null;
  const hasServing = num(n['energy-kcal_serving']) != null;
  const g = (k: string) => num(hasServing ? n[`${k}_serving`] : n[`${k}_100g`]);
  const kcal = g('energy-kcal') ?? (num(hasServing ? n['energy_serving'] : n['energy_100g']) ?? 0) / 4.184;
  if (!kcal) return null;
  const sodiumG = g('sodium');
  const grams = hasServing ? num(p.serving_quantity) : 100;
  const brand = (Array.isArray(p.brands) ? p.brands[0] : typeof p.brands === 'string' ? p.brands.split(',')[0] : '')?.trim() || null;
  const packagedServing = friendlyPackagedServing(name, p.serving_size);
  const item: FoodItem = {
    id: `off:${p.code}`,
    name,
    brand,
    kind: 'branded',
    serving: hasServing
      ? { description: packagedServing, quantity: 1, unit: 'serving', grams }
      : { description: '100 g', quantity: 100, unit: 'g', grams: 100 },
    nutrients: nutrients(kcal, g('proteins'), g('carbohydrates'), g('fat'), {
      fiber: g('fiber'),
      sugar: g('sugars'),
      sodium: sodiumG == null ? null : sodiumG * 1000,
    }),
    barcode: p.code ?? null,
    image: p.image_front_small_url ?? null,
    source: {
      provider: 'off',
      id: p.code,
      url: `https://world.openfoodfacts.org/product/${p.code}`,
      updatedAt: p.last_modified_t ? new Date(p.last_modified_t * 1000).toISOString() : undefined,
      quality: 'verified_packaged',
    },
  };
  return withRestaurant(item, false);
}

function friendlyPackagedServing(name: string, raw?: string): string {
  const cleaned = raw?.replace(/\s*\([^)]*\b(?:g|gram|grams|ml)\b[^)]*\)\s*/gi, ' ').trim();
  if (cleaned && !/^\d+(?:\.\d+)?\s*(?:g|gram|grams|ml)$/i.test(cleaned)) return cleaned;
  const value = name.toLowerCase();
  if (/\b(protein|granola|energy|snack|candy) bar\b|\bbar\b/.test(value)) return '1 bar';
  if (/\bshake\b/.test(value)) return '1 shake';
  if (/\byogurt\b/.test(value)) return '1 container';
  if (/\bcookie\b/.test(value)) return '1 cookie';
  if (/\bbottle\b/.test(value)) return '1 bottle';
  if (/\bcan\b/.test(value)) return '1 can';
  return '1 serving';
}

export function offSignals(p: OffProduct) {
  const n = p.nutriments ?? {};
  const sodium = num(n['sodium_100g']);
  return {
    nutriScore: p.nutriscore_grade && /^[a-e]$/.test(p.nutriscore_grade) ? p.nutriscore_grade : null,
    nova: typeof p.nova_group === 'number' ? p.nova_group : null,
    additives: Array.isArray(p.additives_tags) ? p.additives_tags : null,
    isBeverage: (p.categories_tags ?? []).some((c) => c === 'en:beverages'),
    per100g: {
      energyKcal: num(n['energy-kcal_100g']),
      sugars: num(n['sugars_100g']),
      saturatedFat: num(n['saturated-fat_100g']),
      sodiumMg: sodium == null ? null : sodium * 1000,
      fiber: num(n['fiber_100g']),
      protein: num(n['proteins_100g']),
    },
  };
}

export async function offProduct(code: string): Promise<OffProduct | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, {
    headers: { 'User-Agent': OFF_UA },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts ${res.status}`);
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  return data.status === 1 && data.product ? { ...data.product, code: data.product.code ?? code } : null;
}

export const off: NutritionProvider = {
  id: 'off',
  covers: ['branded'],
  configured: () => true, // public API, no key
  async search(s: ProviderSearch) {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(s.query)}&page=${s.page}&page_size=${s.pageSize}&fields=${FIELDS}`;
    const res = await fetch(url, { headers: { 'User-Agent': OFF_UA } });
    if (!res.ok) throw new Error(`Open Food Facts search ${res.status}`);
    const data = (await res.json()) as { hits?: OffProduct[] };
    return (data.hits ?? []).map(offToItem).filter((x): x is FoodItem => !!x);
  },
  async barcode(code: string): Promise<BarcodeHit | null> {
    const p = await offProduct(code);
    if (!p) return null;
    const item = offToItem(p);
    return item ? { item, signals: offSignals(p) } : null;
  },
};
