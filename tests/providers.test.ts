import { afterEach, describe, expect, it, vi } from 'vitest';
import { hff } from '../server/netlify/lib/providers/hff';

afterEach(() => vi.unstubAllGlobals());

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
