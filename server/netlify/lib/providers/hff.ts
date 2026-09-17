import type { FoodItem } from '../../../../shared/food';
import { nameOverlap } from '../../../../shared/rank';
import { findRestaurant, norm } from '../../../../shared/restaurants';
import { TTLCache } from '../http';
import { withRestaurant } from './normalize';
import type { NutritionProvider, ProviderSearch } from './types';

/**
 * healthyfastfood.org — free, open, no-key JSON API covering 150+ US chains,
 * verified against each chain's own published nutrition documents.
 * https://healthyfastfood.org/developers ("Free to use with attribution and a link").
 * This app displays it as the item's source and links to source_url when present.
 */

/** Our restaurant ids (shared/restaurants.ts) → healthyfastfood.org slugs. */
const SLUG: Record<string, string> = {
  mcdonalds: 'mcdonalds',
  burger_king: 'burger-king',
  wendys: 'wendys',
  chick_fil_a: 'chick-fil-a',
  culvers: 'culvers',
  chipotle: 'chipotle-mexican-grill',
  taco_bell: 'taco-bell',
  subway: 'subway',
  starbucks: 'starbucks',
  dominos: 'dominos-pizza',
  pizza_hut: 'pizza-hut',
  five_guys: 'five-guys',
  in_n_out: 'in-n-out-burger',
  shake_shack: 'shake-shack',
  jersey_mikes: 'jersey-mikes',
  panera: 'panera-bread',
  raising_canes: 'raising-canes',
  panda_express: 'panda-express',
  dairy_queen: 'dairy-queen',
};

type HffItem = {
  name: string;
  slug: string;
  calories: number | null;
  protein: string | null;
  carbs: string | null;
  fat: string | null;
  fiber: string | null;
  sugar: string | null;
  sodium: string | null;
  status: string;
  source_url: string | null;
};
type HffResponse = { items?: HffItem[] };

const UA = 'PlateGauge/1.0 (https://plategauge.app; free API per healthyfastfood.org/developers)';
// This data barely changes day to day; a long cache keeps us well inside "be reasonable."
const menuCache = new TTLCache<HffItem[]>(6 * 60 * 60_000, 60);

async function fetchMenu(slug: string): Promise<HffItem[]> {
  const cached = menuCache.get(slug);
  if (cached) return cached;
  const res = await fetch(`https://healthyfastfood.org/api/v1/menus/${slug}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`healthyfastfood.org ${slug} ${res.status}`);
  const data = (await res.json()) as HffResponse;
  const items = (data.items ?? []).filter((i) => i.calories != null && i.status !== 'discontinued');
  menuCache.set(slug, items);
  return items;
}

const num = (v: string | null) => (v == null ? null : parseFloat(v));

function toFoodItem(it: HffItem, restaurantId: string, restaurantName: string): FoodItem {
  return withRestaurant(
    {
      id: `hff:${restaurantId}:${it.slug}`,
      name: it.name,
      brand: restaurantName,
      kind: 'restaurant',
      serving: { description: '1 serving', quantity: 1, unit: 'serving' },
      nutrients: {
        calories: it.calories ?? 0,
        protein: num(it.protein) ?? 0,
        carbs: num(it.carbs) ?? 0,
        fat: num(it.fat) ?? 0,
        fiber: num(it.fiber),
        sugar: num(it.sugar),
        sodium: num(it.sodium),
      },
      source: { provider: 'hff', id: it.slug, url: it.source_url ?? `https://healthyfastfood.org/${SLUG[restaurantId]}`, quality: 'verified_restaurant' },
    },
    true,
  );
}

export const hff: NutritionProvider = {
  id: 'hff',
  covers: ['restaurant'],
  configured: () => true, // no key needed
  async search(s: ProviderSearch) {
    // providers/index.ts prepends the restaurant's name to the query when one is known,
    // so recovering it from the query text (rather than needing a dedicated field) works
    // for every caller in this app — Crave, Build It, and restaurant-filtered Log search.
    const found = findRestaurant(s.query);
    if (!found) return [];
    const slug = SLUG[found.restaurant.id];
    if (!slug) return [];
    const items = await fetchMenu(slug);
    const brandWords = new Set(norm(found.restaurant.name).split(' '));
    const residual = norm(s.query)
      .split(' ')
      .filter((w) => !brandWords.has(w))
      .join(' ');
    const ranked = items
      .map((it) => ({ it, score: residual ? nameOverlap(residual, it.name) : 1 }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, s.pageSize);
    return ranked.map((x) => toFoodItem(x.it, found.restaurant.id, found.restaurant.name));
  },
};
