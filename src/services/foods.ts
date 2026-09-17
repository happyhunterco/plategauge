import { useCallback, useEffect, useRef, useState } from 'react';
import { config, hasServer, isWeb } from '../config';
import type { Customizable, FoodItem, SearchPage } from '../../shared/food';
import { runCrave, type CraveDeps, type CraveInput, type CraveResult } from '../../shared/crave';
import { buildCustomizable } from '../../shared/resolve';
import { barcodeVariants } from '../../shared/barcode';
import { labelScore, type LabelScore } from '../../shared/productScore';
import { DEV_BARCODES, devLookup, devSearch } from '../../shared/dev/fixtures';
import { offProduct, offSignals, offToItem } from '../../server/netlify/lib/providers/off';
import { OFF_UA } from '../../server/netlify/lib/providers/types';
import { api, ApiError } from './http';
import { aiAvailable } from './aiTransport';
import { moodIdeas } from './ai';

export type Kind = 'all' | 'restaurant' | 'branded' | 'generic';

/** Which data path is live — shown in the UI so nobody mistakes test data for real data. */
export const dataMode: 'server' | 'development' | 'open-food-facts' | 'none' = hasServer
  ? 'server'
  : config.devData
    ? 'development'
    : isWeb
      ? 'none'
      : 'open-food-facts';

/* ---------------- search ---------------- */

const cache = new Map<string, SearchPage>();
const remember = (k: string, v: SearchPage) => {
  if (cache.size > 60) cache.delete(cache.keys().next().value as string);
  cache.set(k, v);
};

async function offSearch(q: string, page: number, signal?: AbortSignal): Promise<SearchPage> {
  const res = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page=${page}&page_size=20`, {
    signal,
    headers: { 'User-Agent': OFF_UA },
  });
  if (!res.ok) throw new ApiError('Food search is unavailable right now.', 'off');
  const data = (await res.json()) as { hits?: Parameters<typeof offToItem>[0][] };
  const items = (data.hits ?? []).map(offToItem).filter((x): x is FoodItem => !!x);
  return { items, page, hasMore: items.length >= 20, providers: [{ id: 'off', ok: true }] };
}

export async function searchFoods(
  q: string,
  opts: { page?: number; kind?: Kind; brand?: string; restaurantId?: string | null; signal?: AbortSignal } = {},
): Promise<SearchPage> {
  const page = opts.page ?? 1;
  const key = JSON.stringify([q.toLowerCase().trim(), page, opts.kind, opts.brand, opts.restaurantId, dataMode]);
  const hit = cache.get(key);
  if (hit) return hit;
  let out: SearchPage;
  if (dataMode === 'server') {
    const qs = new URLSearchParams({ q, page: String(page), kind: opts.kind ?? 'all' });
    if (opts.brand) qs.set('brand', opts.brand);
    if (opts.restaurantId) qs.set('restaurant', opts.restaurantId);
    out = await api<SearchPage>(`/api/food/search?${qs}`, { signal: opts.signal });
  } else if (dataMode === 'development') {
    let items = devSearch(q, opts.restaurantId);
    if (opts.kind && opts.kind !== 'all') items = items.filter((i) => i.kind === opts.kind);
    if (opts.brand) items = items.filter((i) => (i.brand ?? '').toLowerCase().includes(opts.brand!.toLowerCase()));
    out = { items: page === 1 ? items : [], page, hasMore: false, providers: [{ id: 'dev', ok: true }] };
  } else if (dataMode === 'open-food-facts') {
    out = opts.kind === 'restaurant' || opts.kind === 'generic' ? { items: [], page, hasMore: false, providers: [] } : await offSearch(q, page, opts.signal);
  } else {
    throw new ApiError('Food search needs the PlateGauge server. Add EXPO_PUBLIC_API_URL.', 'no_server');
  }
  remember(key, out);
  return out;
}

/** Debounced, cancelable, paginated search with de-duplication across pages. */
export function useFoodSearch(query: string, filters: { kind: Kind; brand?: string }) {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(
    async (p: number) => {
      const q = query.trim();
      ctrl.current?.abort();
      if (q.length < 2) {
        setItems([]);
        setHasMore(false);
        setError('');
        setLoading(false);
        return;
      }
      const c = new AbortController();
      ctrl.current = c;
      setLoading(true);
      setError('');
      try {
        const res = await searchFoods(q, { page: p, kind: filters.kind, brand: filters.brand, signal: c.signal });
        if (c.signal.aborted) return;
        setItems((prev) => {
          const merged = p === 1 ? res.items : [...prev, ...res.items];
          const seen = new Set<string>();
          return merged.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
        });
        setHasMore(res.hasMore);
        setPage(p);
      } catch (e) {
        if (!c.signal.aborted) setError((e as Error).message);
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    },
    [query, filters.kind, filters.brand],
  );

  useEffect(() => {
    const t = setTimeout(() => run(1), 350);
    return () => {
      clearTimeout(t);
      ctrl.current?.abort();
    };
  }, [run]);

  return { items, loading, error, hasMore, loadMore: () => !loading && hasMore && run(page + 1), retry: () => run(1) };
}

/* ---------------- barcode ---------------- */

export type BarcodeLookup = { status: 'found' | 'not_found'; code: string; item: FoodItem | null; score: LabelScore | null; sources: string[] };

export async function lookupBarcode(raw: string): Promise<BarcodeLookup> {
  const code = barcodeVariants(raw)[0] ?? raw;
  if (dataMode === 'server') {
    const r = await api<{ status: string; code: string; item: FoodItem | null; score: LabelScore | null; tried: { id: string }[] }>(
      `/api/food/barcode?code=${encodeURIComponent(code)}`,
    );
    return { status: r.status === 'found' ? 'found' : 'not_found', code: r.code, item: r.item, score: r.score, sources: r.tried.map((t) => t.id) };
  }
  if (dataMode === 'development') {
    const d = DEV_BARCODES[code] ?? DEV_BARCODES[raw];
    return d
      ? { status: 'found', code, item: d.item, score: labelScore(d.signals), sources: ['dev'] }
      : { status: 'not_found', code, item: null, score: null, sources: ['dev'] };
  }
  if (dataMode === 'open-food-facts') {
    for (const v of barcodeVariants(raw)) {
      const p = await offProduct(v).catch(() => {
        throw new ApiError('Couldn’t reach the product database. Check your connection.', 'off');
      });
      const item = p ? offToItem(p) : null;
      if (p && item) return { status: 'found', code: v, item, score: labelScore(offSignals(p)), sources: ['off'] };
    }
    return { status: 'not_found', code, item: null, score: null, sources: ['off'] };
  }
  throw new ApiError('Barcode lookup needs the PlateGauge app or server.', 'no_server');
}

/* ---------------- crave + build it ---------------- */

const devDeps: CraveDeps = {
  search: async (q, o) => devSearch(q, o.restaurantId),
  lookup: async (rid, _n, q) => devLookup(rid, q),
};

export async function crave(input: CraveInput): Promise<CraveResult> {
  if (dataMode === 'server') return api<CraveResult>('/api/crave', { method: 'POST', body: JSON.stringify(input) });
  const deps: CraveDeps =
    dataMode === 'development'
      ? { ...devDeps }
      : { search: async (q) => (dataMode === 'open-food-facts' ? (await offSearch(q, 1)).items : []), lookup: async () => null };
  if (await aiAvailable()) {
    deps.ideas = (intent, left) =>
      moodIdeas(
        `Craving: ${intent.raw}\nMust be: ${[...intent.flavors, ...intent.textures, intent.temperature].filter(Boolean).join(', ') || 'what they described'}\nRemaining today: ${left.calories} kcal, ${left.protein}g protein.\nAvoid: ${[...input.prefs.restrictions, ...input.prefs.allergies].join(', ') || 'nothing'}`,
      );
  }
  return runCrave(input, deps);
}

export async function customize(item: FoodItem, words = ''): Promise<Customizable> {
  if (dataMode === 'server') return api<Customizable>('/api/food/customize', { method: 'POST', body: JSON.stringify({ item, words }) });
  return buildCustomizable(item, words, dataMode === 'development' ? devDeps.lookup : async () => null);
}
