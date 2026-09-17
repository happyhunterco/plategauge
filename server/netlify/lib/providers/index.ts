import type { FoodItem, ProviderId, SearchPage } from '../../../../shared/food';
import { qualityRank } from '../../../../shared/food';
import { barcodeVariants } from '../../../../shared/barcode';
import { labelScore, type LabelScore, type ProductSignals } from '../../../../shared/productScore';
import { norm, restaurantById } from '../../../../shared/restaurants';
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

const dedupeKey = (f: FoodItem) => `${norm(f.brand ?? '')}|${norm(f.name)}|${Math.round(f.nutrients.calories / 10)}`;

/** Keep the best-quality copy of duplicates across providers. */
export function dedupe(items: FoodItem[]): FoodItem[] {
  const map = new Map<string, FoodItem>();
  for (const it of items) {
    const k = dedupeKey(it);
    const cur = map.get(k);
    if (!cur || qualityRank(it.source.quality) > qualityRank(cur.source.quality)) map.set(k, it);
  }
  return [...map.values()];
}

export type SearchParams = { q: string; page: number; pageSize: number; kind?: string; brand?: string; restaurantId?: string | null };

export async function searchFoods(p: SearchParams): Promise<SearchPage> {
  const key = JSON.stringify(p);
  const hit = searchCache.get(key);
  if (hit) return hit;

  const r = restaurantById(p.restaurantId);
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

  // Relevance: name overlap first, then data quality.
  const qWords = norm(p.q).split(' ').filter(Boolean);
  const rel = (i: FoodItem) => {
    const name = norm(`${i.brand ?? ''} ${i.name}`);
    return qWords.filter((w) => name.includes(w)).length / Math.max(qWords.length, 1);
  };
  items.sort((a, b) => rel(b) - rel(a) || qualityRank(b.source.quality) - qualityRank(a.source.quality) || a.name.length - b.name.length);

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

/** Try every configured database and every barcode form (UPC-A / EAN-13 / GTIN-14 / UPC-E). */
export async function lookupBarcode(raw: string): Promise<BarcodeResult> {
  const variants = barcodeVariants(raw);
  const code = variants[0] ?? raw;
  const cached = barcodeCache.get(code);
  if (cached) return cached;

  const tried: BarcodeResult['tried'] = [];
  let item: FoodItem | null = null;
  let signals: ProductSignals | undefined;
  for (const pr of configuredProviders().filter((p) => p.barcode)) {
    try {
      for (const v of variants) {
        const hit = await withTimeout(pr.barcode!(v), 5000, pr.id);
        if (hit) {
          item = hit.item;
          signals = hit.signals;
          break;
        }
      }
      tried.push({ id: pr.id, ok: true });
      if (item) break;
    } catch (e) {
      tried.push({ id: pr.id, ok: false, error: (e as Error).message });
    }
  }

  // Score signals come from Open Food Facts even when nutrition came from elsewhere.
  if (item && item.source.provider !== 'off') {
    for (const v of variants) {
      const p = await offProduct(v).catch(() => null);
      if (p) {
        const s = offSignals(p);
        signals = { ...s, per100g: s.per100g.energyKcal != null ? s.per100g : signals?.per100g };
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
