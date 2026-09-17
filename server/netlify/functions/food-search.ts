import type { Config } from '@netlify/functions';
import { guard, json } from '../lib/http';
import { configuredProviders, searchFoods } from '../lib/providers';

/** GET /api/food/search?q=&page=&kind=all|restaurant|branded|generic&brand=&restaurant= */
export default async (req: Request) => {
  const blocked = guard(req, { method: 'GET', perMinute: 120 });
  if (blocked) return blocked;
  const u = new URL(req.url);
  const q = (u.searchParams.get('q') ?? '').trim().slice(0, 100);
  if (q.length < 2) return json({ items: [], page: 1, hasMore: false, providers: [] });
  if (!configuredProviders().some((p) => p.id !== 'off')) {
    // Open Food Facts alone still works, but tell the app so it can say coverage is limited.
    console.warn('Only Open Food Facts is configured');
  }
  const page = Math.max(1, Math.min(20, Number(u.searchParams.get('page') ?? 1) || 1));
  const result = await searchFoods({
    q,
    page,
    pageSize: 20,
    kind: u.searchParams.get('kind') ?? 'all',
    brand: u.searchParams.get('brand') ?? undefined,
    restaurantId: u.searchParams.get('restaurant'),
  });
  const allFailed = result.providers.length > 0 && result.providers.every((p) => !p.ok);
  return json(result, allFailed ? 502 : 200, allFailed ? 0 : 3600);
};

export const config: Config = { path: '/api/food/search' };
