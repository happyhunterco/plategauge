import { afterEach, describe, expect, it, vi } from 'vitest';
import { hff } from '../server/netlify/lib/providers/hff';
import { off, offToItem } from '../server/netlify/lib/providers/off';
import { dedupe, searchFoods } from '../server/netlify/lib/providers';
import { fdcToItem } from '../server/netlify/lib/providers/usda';
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
    expect(items[0]?.restaurant).toBe('whataburger');
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

  it('shows a natural unit for a bar while retaining its gram weight internally', () => {
    const item = offToItem({
      code: '456',
      product_name: 'Chocolate Protein Bar',
      brands: 'Example Co',
      serving_size: '60 g',
      serving_quantity: 60,
      nutriments: { 'energy-kcal_serving': 210, proteins_serving: 20, carbohydrates_serving: 22, fat_serving: 7 },
    });
    expect(item?.serving.description).toBe('1 bar');
    expect(item?.serving.grams).toBe(60);
  });

  it('converts per-100-g values to one package serving when the label has a serving weight', () => {
    const item = offToItem({
      code: '457',
      product_name: 'Salty Peanut Protein Bar',
      brands: 'Barebells',
      serving_size: '55 g',
      serving_quantity: 55,
      nutriments: { 'energy-kcal_100g': 369, proteins_100g: 36.4, carbohydrates_100g: 32.7, fat_100g: 14.9 },
    });
    expect(item?.serving.description).toBe('1 bar');
    expect(item?.nutrients.calories).toBe(203);
    expect(item?.nutrients.protein).toBe(20);
  });

  it('collapses duplicate regional product records but keeps other brands and flavors', () => {
    const make = (id: string, name: string, brand: string): FoodItem => ({
      id,
      name,
      brand,
      kind: 'branded',
      serving: { description: '1 bar', quantity: 1, unit: 'serving', grams: 55 },
      nutrients: { calories: 200, protein: 20, carbs: 18, fat: 8 },
      source: { provider: 'off', quality: 'verified_packaged' },
    });
    const result = dedupe([
      make('1', 'Salty Peanut Protein Bar', 'Barebells'),
      make('2', 'Protein Bar Salty Peanut', 'Barebell'),
      make('3', 'White Salty Peanut Protein Bar', 'Barebells'),
      make('4', 'Salty Peanut Protein Bar', "Nick's"),
    ]);
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.name)).toContain('White Salty Peanut Protein Bar');
    expect(result.map((item) => item.brand)).toContain("Nick's");
  });
});

describe('USDA provider', () => {
  it('does not append gram weights to a household serving', () => {
    const item = fdcToItem({
      fdcId: 1,
      description: 'CHOCOLATE PROTEIN BAR',
      dataType: 'Branded',
      brandOwner: 'Example Co',
      servingSize: 60,
      servingSizeUnit: 'g',
      householdServingFullText: '1 bar',
      foodNutrients: [
        { nutrientId: 1008, value: 350 },
        { nutrientId: 1003, value: 33 },
      ],
    });
    expect(item?.serving.description).toBe('1 bar');
    expect(item?.serving.grams).toBe(60);
  });

  it('uses a whole-food serving for a generic apple instead of 100 grams', () => {
    const item = fdcToItem({
      fdcId: 2,
      description: 'APPLES, RAW, WITH SKIN',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrientId: 1008, value: 52 },
        { nutrientId: 1005, value: 13.8 },
      ],
    });
    expect(item?.serving.description).toBe('1 medium apple');
    expect(item?.nutrients.calories).toBe(95);
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
