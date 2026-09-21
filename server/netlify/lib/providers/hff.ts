import type { FoodItem } from '../../../../shared/food';
import { foodSearchScore, nameOverlap } from '../../../../shared/rank';
import { findRestaurant, norm } from '../../../../shared/restaurants';
import { categoryOf } from '../../../../shared/tags';
import { TTLCache } from '../http';
import { withRestaurant } from './normalize';
import { findHffRestaurant } from './hffRestaurants';
import type { NutritionProvider, ProviderSearch } from './types';

/**
 * healthyfastfood.org — free, open, no-key JSON API covering 150+ US chains,
 * verified against each chain's own published nutrition documents.
 * https://healthyfastfood.org/developers ("Free to use with attribution and a link").
 * This app displays it as the item's source and links to source_url when present.
 */

type HffItem = {
  name: string;
  slug: string;
  calories: number | null;
  protein: string | number | null;
  carbs: string | number | null;
  fat: string | number | null;
  fiber: string | number | null;
  sugar: string | number | null;
  sodium: string | number | null;
  status: string;
  source_url: string | null;
  category?: string | null;
  parent_category?: string | null;
};
type HffResponse = { items?: HffItem[] };

const UA = 'Vahla/1.0 (https://vahla.co; free API per healthyfastfood.org/developers)';
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

const num = (v: string | number | null) => {
  if (v == null) return null;
  const value = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(value) ? value : null;
};

const hffCategory = (it: HffItem) => categoryOf(it.name) ?? categoryOf(it.category ?? '') ?? categoryOf(it.parent_category ?? '');

function toFoodItem(it: HffItem, restaurantId: string, restaurantName: string, restaurantSlug: string): FoodItem {
  return withRestaurant(
    {
      id: `hff:${restaurantId}:${it.slug}`,
      name: it.name,
      brand: restaurantName,
      kind: 'restaurant',
      restaurant: restaurantId,
      category: hffCategory(it),
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
      source: { provider: 'hff', id: it.slug, url: it.source_url ?? `https://healthyfastfood.org/${restaurantSlug}`, quality: 'verified_restaurant' },
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
    const found = findHffRestaurant(s.query);
    if (!found) return [];
    const shared = findRestaurant(found.name) ?? findRestaurant(s.query);
    const restaurantId = shared?.restaurant.id ?? `hff:${found.slug}`;
    const items = await fetchMenu(found.slug);
    const residual = norm(s.query).replace(found.alias, ' ').replace(/\s+/g, ' ').trim();
    const ranked = items
      .map((it) => ({
        it,
        overlap: residual ? nameOverlap(residual, it.name) : 1,
        score: residual
          ? foodSearchScore(residual, {
              name: it.name,
              brand: found.name,
              restaurant: restaurantId,
              category: hffCategory(it),
            })
          : 1,
      }))
      // A menu section can be broad or mislabeled (for example, a bun under
      // "Burgers"). Require at least one name match when food words exist.
      .filter((x) => x.score > 0 && x.overlap > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, s.pageSize);
    return ranked.map((x) => toFoodItem(x.it, restaurantId, found.name, found.slug));
  },
};
