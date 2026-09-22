import type { FoodItem, ProviderId, SearchPage } from '../../../../shared/food';
import { qualityRank } from '../../../../shared/food';
import { barcodeVariants } from '../../../../shared/barcode';
import { labelScore, type LabelScore, type ProductSignals } from '../../../../shared/productScore';
import { foodSearchScore } from '../../../../shared/rank';
import { findRestaurant, norm, restaurantById } from '../../../../shared/restaurants';
import { TTLCache, withTimeout } from '../http';
import { fatsecret } from './fatsecret';
import { hff } from './hff';
import { nutritionix } from './nutritionix';
import { off, offProduct, offSignals } from './off';
import type { NutritionProvider } from './types';
import { usda } from './usda';

export const PROVIDERS: NutritionProvider[] = [hff, nutritionix, fatsecret, usda, off];
export const configuredProviders = () => PROVIDERS.filter((p) => p.configured());

const searchCache = new TTLCache<SearchPage>(10 * 60_000);
const barcodeCache = new TTLCache<BarcodeResult>(60 * 60_000);

const restaurantSourceRank = (f: FoodItem) => (f.source.provider === 'hff' ? 2 : f.kind === 'restaurant' ? 1 : 0);

const companyKey = (value: string) =>
  norm(value.replace(/[’'`]/g, ''))
    .replace(/\b(inc|llc|ltd|company|co)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s$/, '');
const editDistance = (a: string, b: string) => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = old;
    }
  }
  return row[b.length]!;
};
const sameCompany = (a?: string | null, b?: string | null) => {
  const x = companyKey(a ?? '');
  const y = companyKey(b ?? '');
  if (!x || !y) return !x && !y;
  return x === y || (x.length >= 5 && y.length >= 5 && editDistance(x, y) <= 1);
};
const productNameKey = (name: string, brand?: string | null) => {
  const words = norm(name).split(' ').filter(Boolean);
  // Some databases prepend the maker to the food name; the brand field
  // already identifies it. Keep flavor words so distinct bars remain visible.
  const maker = companyKey(brand ?? '');
  const withoutMaker = maker && words.length > 2 ? words.filter((word) => companyKey(word) !== maker) : words;
  return [...new Set(withoutMaker.map((word) => (word.length > 3 ? word.replace(/s$/, '') : word)))].sort().join(' ');
};
const nutritionCompleteness = (item: FoodItem) =>
  [item.nutrients.calories, item.nutrients.protein, item.nutrients.carbs, item.nutrients.fat, item.nutrients.fiber, item.nutrients.sugar, item.nutrients.sodium].filter(
    (value) => value != null,
  ).length;
const copyScore = (item: FoodItem) =>
  qualityRank(item.source.quality) * 100 +
  (item.brand ? 20 : 0) +
  (item.serving.unit !== 'g' && item.serving.description !== '100 g' ? 40 : 0) +
  (item.serving.grams ? 10 : 0) +
  nutritionCompleteness(item);

/** Keep the best-quality copy of duplicates across providers. */
export function dedupe(items: FoodItem[]): FoodItem[] {
  const kept: FoodItem[] = [];
  for (const it of items) {
    const name = productNameKey(it.name, it.brand);
    const index = kept.findIndex((cur) => {
      if (cur.kind === 'branded' && it.kind === 'branded') return productNameKey(cur.name, cur.brand) === name && sameCompany(cur.brand, it.brand);
      return norm(cur.brand ?? cur.restaurant ?? '') === norm(it.brand ?? it.restaurant ?? '') && norm(cur.name) === norm(it.name);
    });
    if (index < 0) kept.push(it);
    else if (copyScore(it) > copyScore(kept[index]!)) kept[index] = it;
  }
  return kept;
}

export type SearchParams = { q: string; page: number; pageSize: number; kind?: string; brand?: string; restaurantId?: string | null };

export async function searchFoods(p: SearchParams): Promise<SearchPage> {
  const key = JSON.stringify(p);
  const hit = searchCache.get(key);
  if (hit) return hit;

  // A typed chain name is a restaurant filter even when the client did not
  // separately pass restaurantId. This keeps "Culver's cheeseburger" inside
  // Culver's instead of mixing in unrelated packaged cheeseburgers.
  const r = restaurantById(p.restaurantId) ?? findRestaurant(p.q)?.restaurant ?? null;
  const query = r && !norm(p.q).includes(norm(r.name)) ? `${r.name} ${p.q}` : p.q;
  const wantRestaurant = p.kind === 'restaurant' || !!r;
  const active = configuredProviders().filter((pr) => {
    if (!pr.search) return false;
    if (wantRestaurant) return pr.covers.includes('restaurant');
    if (p.kind === 'branded') return pr.covers.includes('branded');
    if (p.kind === 'generic') return pr.covers.includes('generic');
    return true;
  });

  const providers: SearchPage['providers'] = [];
  const results = await Promise.all(
    active.map(async (pr) => {
      try {
        const items = await withTimeout(
          pr.search!({ query, page: p.page, pageSize: p.pageSize, restaurantOnly: wantRestaurant, brandedOnly: p.kind === 'branded' }),
          5000,
          pr.id,
        );
        providers.push({ id: pr.id, ok: true });
        return items;
      } catch (e) {
        providers.push({ id: pr.id, ok: false, error: (e as Error).message });
        return [] as FoodItem[];
      }
    }),
  );

  let items = dedupe(results.flat());
  if (r) items = items.filter((i) => i.restaurant === r.id);
  if (p.kind && p.kind !== 'all') items = items.filter((i) => i.kind === p.kind);
  if (p.brand) items = items.filter((i) => norm(i.brand ?? '').includes(norm(p.brand!)));

  // Strip a recognized chain from the ranking query. Otherwise every item at
  // that chain gets points for the brand and weak matches can outrank the food.
  const found = findRestaurant(p.q);
  const relevanceQuery = found ? norm(p.q).replace(found.alias, ' ').replace(/\s+/g, ' ').trim() || p.q : p.q;
  items.sort(
    (a, b) =>
      foodSearchScore(relevanceQuery, b) - foodSearchScore(relevanceQuery, a) ||
      qualityRank(b.source.quality) - qualityRank(a.source.quality) ||
      restaurantSourceRank(b) - restaurantSourceRank(a) ||
      a.name.length - b.name.length,
  );

  const page: SearchPage = { items, page: p.page, hasMore: results.some((x) => x.length >= p.pageSize), providers };
  if (providers.some((x) => x.ok)) searchCache.set(key, page);
  return page;
}

const jaccard = (a: string, b: string) => {
  const A = new Set(norm(a).split(' '));
  const B = new Set(norm(b).split(' '));
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / new Set([...A, ...B]).size;
};

/** Exact menu item lookup for Build It. Strict matching so "Single" never resolves to "Cheese Single". */
export async function lookupRestaurantItem(restaurantId: string, restaurantName: string, query: string): Promise<FoodItem | null> {
  const page = await searchFoods({ q: query, page: 1, pageSize: 25, restaurantId });
  const brandWords = new Set(norm(restaurantName).split(' '));
  const clean = (s: string) =>
    norm(s)
      .split(' ')
      .filter((w) => !brandWords.has(w))
      .join(' ');
  let best: { item: FoodItem; s: number } | null = null;
  for (const it of page.items) {
    const s = jaccard(clean(query), clean(it.name));
    if (s >= 0.75 && (!best || s > best.s)) best = { item: it, s };
  }
  return best?.item ?? null;
}

export type BarcodeResult = {
  status: 'found' | 'not_found' | 'unavailable';
  code: string;
  item: FoodItem | null;
  score: LabelScore | null;
  tried: { id: ProviderId; ok: boolean; error?: string }[];
};

export function pickBestBarcodeHit(hits: { hit: { item: FoodItem; signals?: ProductSignals }; order: number }[]) {
  return (
    [...hits].sort(
      (a, b) =>
        qualityRank(b.hit.item.source.quality) - qualityRank(a.hit.item.source.quality) ||
        nutritionCompleteness(b.hit.item) - nutritionCompleteness(a.hit.item) ||
        a.order - b.order,
    )[0]?.hit ?? null
  );
}

/** Try every configured database and every barcode form (UPC-A / EAN-13 / GTIN-14 / UPC-E). */
export async function lookupBarcode(raw: string): Promise<BarcodeResult> {
  const variants = barcodeVariants(raw);
  const code = variants[0] ?? raw;
  const cached = barcodeCache.get(code);
  if (cached) return cached;

  const tried: BarcodeResult['tried'] = [];
  const barcodeProviders = configuredProviders().filter((p) => p.barcode);
  const providerResults = await Promise.all(
    barcodeProviders.map(async (pr, order) => {
      try {
        let hit = null;
        for (const v of variants) {
          hit = await withTimeout(pr.barcode!(v), 5000, pr.id);
          if (hit) break;
        }
        return { tried: { id: pr.id, ok: true } as BarcodeResult['tried'][number], found: hit ? { hit, order } : null };
      } catch (e) {
        return {
          tried: { id: pr.id, ok: false, error: (e as Error).message } as BarcodeResult['tried'][number],
          found: null,
        };
      }
    }),
  );
  tried.push(...providerResults.map((result) => result.tried));
  const found = providerResults.map((result) => result.found).filter((x): x is NonNullable<typeof x> => !!x);
  const best = pickBestBarcodeHit(found);
  let item = best?.item ?? null;
  let signals = best?.signals;

  // Score signals come from Open Food Facts even when nutrition came from elsewhere.
  if (item && item.source.provider !== 'off') {
    for (const v of variants) {
      const p = await offProduct(v).catch(() => null);
      if (p) {
        const s = offSignals(p);
        signals = { ...s, per100g: s.per100g.energyKcal != null ? s.per100g : signals?.per100g };
        if (!item.image) item = { ...item, image: p.image_front_small_url ?? item.image };
        break;
      }
    }
  }

  const status: BarcodeResult['status'] = item ? 'found' : tried.every((t) => !t.ok) ? 'unavailable' : 'not_found';
  const result: BarcodeResult = { status, code, item, score: item && signals ? labelScore(signals) : null, tried };
  if (status !== 'unavailable') barcodeCache.set(code, result);
  return result;
}

export { off };
