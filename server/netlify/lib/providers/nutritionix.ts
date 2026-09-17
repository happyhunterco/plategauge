import type { FoodItem } from '../../../../shared/food';
import { env } from '../http';
import { nutrients, num, withRestaurant } from './normalize';
import type { BarcodeHit, NutritionProvider, ProviderSearch } from './types';

/**
 * Nutritionix — large US restaurant + grocery database (licensed API; terms require attribution).
 * brand_type 1 = restaurant, 2 = grocery.
 */
type NixFull = { attr_id: number; value: number };
type NixItem = {
  food_name: string;
  brand_name?: string;
  brand_type?: number;
  nix_item_id?: string;
  nf_calories?: number;
  nf_protein?: number;
  nf_total_carbohydrate?: number;
  nf_total_fat?: number;
  nf_dietary_fiber?: number;
  nf_sugars?: number;
  nf_sodium?: number;
  serving_qty?: number;
  serving_unit?: string;
  serving_weight_grams?: number;
  full_nutrients?: NixFull[];
  photo?: { thumb?: string };
  updated_at?: string;
  nf_ingredient_statement?: string;
};

const headers = () => ({ 'x-app-id': env('NUTRITIONIX_APP_ID'), 'x-app-key': env('NUTRITIONIX_APP_KEY'), 'content-type': 'application/json' });
const attr = (f: NixFull[] | undefined, id: number) => f?.find((x) => x.attr_id === id)?.value ?? null;

function nixToItem(x: NixItem): FoodItem | null {
  const kcal = x.nf_calories ?? attr(x.full_nutrients, 208);
  if (kcal == null || !x.nix_item_id) return null;
  const restaurant = x.brand_type === 1;
  const qty = x.serving_qty ?? 1;
  const unit = x.serving_unit ?? 'serving';
  const item: FoodItem = {
    id: `nix:${x.nix_item_id}`,
    name: x.food_name,
    brand: x.brand_name ?? null,
    kind: restaurant ? 'restaurant' : 'branded',
    serving: {
      description: `${qty} ${unit}${x.serving_weight_grams ? ` (${Math.round(x.serving_weight_grams)} g)` : ''}`,
      quantity: qty,
      unit,
      grams: x.serving_weight_grams ?? null,
    },
    nutrients: nutrients(
      kcal,
      x.nf_protein ?? attr(x.full_nutrients, 203),
      x.nf_total_carbohydrate ?? attr(x.full_nutrients, 205),
      x.nf_total_fat ?? attr(x.full_nutrients, 204),
      {
        fiber: x.nf_dietary_fiber ?? attr(x.full_nutrients, 291),
        sugar: x.nf_sugars ?? attr(x.full_nutrients, 269),
        sodium: x.nf_sodium ?? attr(x.full_nutrients, 307),
      },
    ),
    image: x.photo?.thumb ?? null,
    source: {
      provider: 'nutritionix',
      id: x.nix_item_id,
      url: 'https://www.nutritionix.com',
      updatedAt: x.updated_at,
      quality: restaurant ? 'verified_restaurant' : 'verified_packaged',
    },
  };
  return withRestaurant(item, restaurant);
}

export const nutritionix: NutritionProvider = {
  id: 'nutritionix',
  covers: ['restaurant', 'branded'],
  configured: () => !!(env('NUTRITIONIX_APP_ID') && env('NUTRITIONIX_APP_KEY')),
  async search(s: ProviderSearch) {
    if (s.page > 1) return []; // instant search has no paging
    const res = await fetch('https://trackapi.nutritionix.com/v2/search/instant', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ query: s.query, branded: true, common: false, detailed: true, branded_type: s.restaurantOnly ? 1 : undefined }),
    });
    if (!res.ok) throw new Error(`Nutritionix ${res.status}`);
    const data = (await res.json()) as { branded?: NixItem[] };
    return (data.branded ?? [])
      .slice(0, s.pageSize)
      .map(nixToItem)
      .filter((x): x is FoodItem => !!x);
  },
  async barcode(code: string): Promise<BarcodeHit | null> {
    const res = await fetch(`https://trackapi.nutritionix.com/v2/search/item?upc=${encodeURIComponent(code)}`, { headers: headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Nutritionix ${res.status}`);
    const data = (await res.json()) as { foods?: NixItem[] };
    const f = data.foods?.[0];
    const item = f ? nixToItem(f) : null;
    if (!item || !f) return null;
    const g = f.serving_weight_grams;
    const per = (v: number | null | undefined) => (v == null || !g ? null : (v / g) * 100);
    return {
      item: { ...item, barcode: code },
      signals: {
        per100g: {
          energyKcal: per(f.nf_calories),
          sugars: per(f.nf_sugars),
          saturatedFat: per(attr(f.full_nutrients, 606)),
          sodiumMg: per(f.nf_sodium),
          fiber: per(f.nf_dietary_fiber),
          protein: per(f.nf_protein),
        },
      },
    };
  },
};

export { num };
