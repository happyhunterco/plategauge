import { afterEach, describe, expect, it, vi } from 'vitest';
import { hff } from '../server/netlify/lib/providers/hff';
import { off, offToItem } from '../server/netlify/lib/providers/off';
import { searchFoods } from '../server/netlify/lib/providers';
import type { FoodItem } from '../shared/food';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HealthyFastFood provider', () => {
  it('uses category-aware ranking for every supported restaurant', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                name: 'Broccoli Cheese Soup',
                slug: 'broccoli-cheese-soup',
                category: 'Soup',
                parent_category: 'Soups',
                calories: 220,
                protein: 7,
                carbs: 21,
                fat: 12,
                fiber: 2,
                sugar: 4,
                sodium: 900,
                status: 'active',
                source_url: null,
              },
              {
                name: 'Double Cheeseburger',
                slug: 'double-cheeseburger',
                category: 'Burgers',
                parent_category: 'Burgers & Sandwiches',
                calories: 720,
                protein: 42,
                carbs: 45,
                fat: 41,
                fiber: 2,
                sugar: 8,
                sodium: 1_300,
                status: 'active',
                source_url: null,
              },
              {
                name: 'Sesame Bun',
                slug: 'sesame-bun',
                category: 'Burgers',
                parent_category: 'Burgers & Sandwiches',
                calories: 210,
                protein: 7,
                carbs: 39,
                fat: 3,
                fiber: 2,
                sugar: 5,
                sodium: 360,
                status: 'active',
                source_url: null,
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const items = await hff.search!({ query: 'Whataburger cheeseburger', page: 1, pageSize: 10 });
    expect(items[0]?.name).toBe('Double Cheeseburger');
    expect(items[0]?.restaurant).toBe('hff:whataburger');
    expect(items[0]?.source.provider).toBe('hff');
    expect(items.map((item) => item.name)).not.toContain('Sesame Bun');
  });
});

describe('Open Food Facts provider', () => {
  it('accepts the array-shaped brands field returned by search', () => {
    const item = offToItem({
      code: '123',
      product_name: 'Pretzel Crisps',
      brands: ['Snack Factory', 'Second Brand'],
      nutriments: { 'energy-kcal_100g': 380, proteins_100g: 10, carbohydrates_100g: 70, fat_100g: 7 },
    });
    expect(item?.brand).toBe('Snack Factory');
  });
});

describe('merged provider routing', () => {
  it('treats a chain typed in the query as a restaurant filter', async () => {
    const culvers: FoodItem = {
      id: 'hff:culvers:butterburger',
      name: 'ButterBurger Single',
      brand: 'Culver’s',
      kind: 'restaurant',
      restaurant: 'culvers',
      category: 'burger',
      serving: { description: '1 serving', quantity: 1, unit: 'serving' },
      nutrients: { calories: 390, protein: 20, carbs: 38, fat: 17 },
      source: { provider: 'hff', quality: 'verified_restaurant' },
    };
    const offSearch = vi.spyOn(off, 'search').mockResolvedValue([]);
    vi.spyOn(hff, 'search').mockResolvedValue([culvers]);

    const page = await searchFoods({ q: "Culver's cheeseburger routing regression", page: 1, pageSize: 10 });

    expect(page.items).toEqual([culvers]);
    expect(offSearch).not.toHaveBeenCalled();
  });
});
