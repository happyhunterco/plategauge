import type { FoodItem } from '../../../../shared/food';
import { env } from '../http';
import { nutrients, num, withRestaurant } from './normalize';
import type { BarcodeHit, NutritionProvider, ProviderSearch } from './types';

/**
 * FatSecret Platform API — broad restaurant and brand coverage, OAuth 2.0 client credentials.
 * Barcode lookup requires the Premier scope; set FATSECRET_SCOPE="basic barcode" if your plan has it.
 */
let token: { value: string; exp: number } | null = null;

async function auth(): Promise<string> {
  if (token && Date.now() < token.exp) return token.value;
  const basic = Buffer.from(`${env('FATSECRET_CLIENT_ID')}:${env('FATSECRET_CLIENT_SECRET')}`).toString('base64');
  const res = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(env('FATSECRET_SCOPE') || 'basic')}`,
  });
  if (!res.ok) throw new Error(`FatSecret auth ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return token.value;
}

async function call(params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, format: 'json' }).toString();
  const res = await fetch(`https://platform.fatsecret.com/rest/server.api?${qs}`, { headers: { authorization: `Bearer ${await auth()}` } });
  if (!res.ok) throw new Error(`FatSecret ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

type FsFood = { food_id: string; food_name: string; food_type: string; brand_name?: string; food_description?: string; food_url?: string };

/** "Per 1 burger - Calories: 460kcal | Fat: 23.00g | Carbs: 39.00g | Protein: 24.00g" */
export function parseDescription(d: string) {
  const m = d.match(/^Per\s+(.+?)\s+-\s+Calories:\s*([\d.]+)kcal\s*\|\s*Fat:\s*([\d.]+)g\s*\|\s*Carbs:\s*([\d.]+)g\s*\|\s*Protein:\s*([\d.]+)g/i);
  if (!m) return null;
  return { serving: m[1], calories: Number(m[2]), fat: Number(m[3]), carbs: Number(m[4]), protein: Number(m[5]) };
}

function fsToItem(f: FsFood, restaurantHint: boolean): FoodItem | null {
  const d = f.food_description ? parseDescription(f.food_description) : null;
  if (!d) return null;
  const branded = f.food_type === 'Brand';
  const item: FoodItem = {
    id: `fs:${f.food_id}`,
    name: f.food_name,
    brand: f.brand_name ?? null,
    kind: branded ? 'branded' : 'generic',
    serving: { description: d.serving, quantity: 1, unit: 'serving' },
    nutrients: nutrients(d.calories, d.protein, d.carbs, d.fat),
    source: { provider: 'fatsecret', id: f.food_id, url: f.food_url, quality: branded ? 'verified_packaged' : 'database' },
  };
  return withRestaurant(item, restaurantHint && branded);
}

export const fatsecret: NutritionProvider = {
  id: 'fatsecret',
  covers: ['restaurant', 'branded', 'generic'],
  configured: () => !!(env('FATSECRET_CLIENT_ID') && env('FATSECRET_CLIENT_SECRET')),
  async search(s: ProviderSearch) {
    const data = await call({
      method: 'foods.search',
      search_expression: s.query,
      page_number: String(s.page - 1),
      max_results: String(Math.min(s.pageSize, 50)),
    });
    const foods = (data.foods as { food?: FsFood | FsFood[] } | undefined)?.food;
    const list = Array.isArray(foods) ? foods : foods ? [foods] : [];
    // FatSecret doesn't flag restaurants; known chains are recognized by brand in withRestaurant.
    return list.map((f) => fsToItem(f, false)).filter((x): x is FoodItem => !!x);
  },
  async barcode(code: string): Promise<BarcodeHit | null> {
    if (!/barcode/.test(env('FATSECRET_SCOPE'))) return null;
    const gtin13 = code.padStart(13, '0').slice(-13);
    const found = await call({ method: 'food.find_id_for_barcode', barcode: gtin13 });
    const id = (found.food_id as { value?: string } | undefined)?.value;
    if (!id || id === '0') return null;
    const detail = await call({ method: 'food.get.v4', food_id: id });
    const food = detail.food as {
      food_name: string;
      brand_name?: string;
      food_type: string;
      servings?: { serving?: Record<string, string> | Record<string, string>[] };
    };
    const sv = food?.servings?.serving;
    const s = Array.isArray(sv) ? sv[0] : sv;
    if (!s) return null;
    return {
      item: {
        id: `fs:${id}`,
        name: food.food_name,
        brand: food.brand_name ?? null,
        kind: 'branded',
        barcode: code,
        serving: { description: s.serving_description ?? '1 serving', quantity: 1, unit: 'serving', grams: num(s.metric_serving_amount) },
        nutrients: nutrients(num(s.calories) ?? 0, num(s.protein), num(s.carbohydrate), num(s.fat), {
          fiber: num(s.fiber),
          sugar: num(s.sugar),
          sodium: num(s.sodium),
        }),
        source: { provider: 'fatsecret', id, quality: 'verified_packaged' },
      },
    };
  },
};
