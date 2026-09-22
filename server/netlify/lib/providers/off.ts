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

export const OFF_FIELDS =
  'code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments,nutriscore_grade,nova_group,additives_tags,image_front_small_url,categories_tags,last_modified_t';

export function offToItem(p: OffProduct): FoodItem | null {
  const n = p.nutriments ?? {};
  const name = (p.product_name_en || p.product_name || '').trim();
  if (!name) return null;
  // A label like "1 bar" does not establish a gram weight. In particular,
  // taking its first digit as grams would turn a 200 kcal bar into 4 kcal.
  const weightMatch = p.serving_size?.match(/(\d+(?:\.\d+)?)\s*(?:g|gr|grams?)\b/i);
  const rawServingGrams = num(p.serving_quantity) ?? num(weightMatch?.[1]);
  const servingGrams = rawServingGrams && rawServingGrams > 0 && rawServingGrams <= 2_000 ? rawServingGrams : null;
  const hasServingNutrients = num(n['energy-kcal_serving']) != null || num(n['energy_serving']) != null;
  const perServing = (k: string) => {
    const direct = num(n[`${k}_serving`]);
    if (direct != null) return direct;
    const per100 = num(n[`${k}_100g`]);
    return per100 != null && servingGrams ? (per100 * servingGrams) / 100 : null;
  };
  const g = (k: string) => (servingGrams || hasServingNutrients ? perServing(k) : num(n[`${k}_100g`]));
  const kcal = g('energy-kcal') ?? (g('energy') ?? 0) / 4.184;
  if (!kcal) return null;
  const sodiumG = g('sodium');
  const brand = (Array.isArray(p.brands) ? p.brands[0] : typeof p.brands === 'string' ? p.brands.split(',')[0] : '')?.trim() || null;
  const packagedServing = friendlyPackagedServing(name, p.serving_size);
  const item: FoodItem = {
    id: `off:${p.code}`,
    name,
    brand,
    kind: 'branded',
    serving: servingGrams || hasServingNutrients
      ? { description: packagedServing, quantity: 1, unit: 'serving', grams: servingGrams }
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
  if (cleaned && /^1(?:\.0+)?\s+(?:bar|bars|cookie|cookies|bottle|can|shake|container)$/i.test(cleaned)) {
    return `1 ${cleaned.replace(/^1(?:\.0+)?\s+/i, '').toLowerCase().replace(/(?:bars|cookies)$/, (s) => s === 'bars' ? 'bar' : 'cookie')}`;
  }
  if (cleaned && !/^\d+(?:\.\d+)?\s*(?:g|gr|gram|grams|ml)$/i.test(cleaned)) return cleaned;
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
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`, {
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
    // The indexed search endpoint omits serving fields for many products. The
    // classic JSON search includes the label serving, so results can default to
    // one bar/container/item instead of misleading per-100-g nutrition.
    const size = Math.min(Math.max(s.pageSize * 3, 30), 60);
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(s.query)}&search_simple=1&action=process&json=1&page=${s.page}&page_size=${size}&fields=${OFF_FIELDS}`;
    let products: OffProduct[];
    try {
      const res = await fetch(url, { headers: { 'User-Agent': OFF_UA } });
      if (!res.ok) throw new Error(`Open Food Facts search ${res.status}`);
      products = ((await res.json()) as { products?: OffProduct[] }).products ?? [];
    } catch {
      // The classic API occasionally returns 503. Its indexed endpoint can
      // still return products; missing serving weights remain honest 100 g.
      const fallback = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(s.query)}&page=${s.page}&page_size=${size}`, {
        headers: { 'User-Agent': OFF_UA },
      });
      if (!fallback.ok) throw new Error(`Open Food Facts search ${fallback.status}`);
      products = ((await fallback.json()) as { hits?: OffProduct[] }).hits ?? [];
    }
    return products.map(offToItem).filter((x): x is FoodItem => !!x);
  },
  async barcode(code: string): Promise<BarcodeHit | null> {
    const p = await offProduct(code);
    if (!p) return null;
    const item = offToItem(p);
    return item ? { item, signals: offSignals(p) } : null;
  },
};
