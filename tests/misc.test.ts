import { describe, expect, it } from 'vitest';
import { gateRedirect } from '../shared/gate';
import { streakInfo } from '../shared/streak';
import { computeTargets } from '../shared/targets';
import { barcodeVariants, checkDigitValid, upcEtoA } from '../shared/barcode';
import { labelScore } from '../shared/productScore';
import { dailyBalance } from '../shared/balance';
import { fieldLayout } from '../src/components/fieldLayout';
import type { FoodItem } from '../shared/food';
import { foodSearchScore } from '../shared/rank';
import { HFF_RESTAURANTS, findHffRestaurant } from '../server/netlify/lib/providers/hffRestaurants';
import { pickBestBarcodeHit } from '../server/netlify/lib/providers';

describe('auth gate', () => {
  const h = { hydrated: true };
  it('sends new users to onboarding', () => expect(gateRedirect({ ...h, onboarded: false, signedIn: false }, ['(tabs)'])).toBe('/setup'));
  it('requires an account after onboarding', () => {
    expect(gateRedirect({ ...h, onboarded: true, signedIn: false }, ['(tabs)'])).toBe('/account');
    expect(gateRedirect({ ...h, onboarded: true, signedIn: false }, ['profile'])).toBe('/account');
    expect(gateRedirect({ ...h, onboarded: true, signedIn: false }, ['scan'])).toBe('/account');
  });
  it('lets signed-in users in and keeps them off the account screen', () => {
    expect(gateRedirect({ ...h, onboarded: true, signedIn: true }, ['(tabs)'])).toBeNull();
    expect(gateRedirect({ ...h, onboarded: true, signedIn: true }, ['account'])).toBe('/');
  });
  it('waits for storage before deciding', () => expect(gateRedirect({ hydrated: false, onboarded: false, signedIn: false }, [])).toBeNull());
});

describe('streaks', () => {
  it('counts through yesterday when today is still open', () => {
    const s = streakInfo(['2026-09-14', '2026-09-15'], '2026-09-16');
    expect(s).toEqual({ current: 2, best: 2, todayLogged: false });
  });
  it('breaks on a gap and remembers the best run', () => {
    const s = streakInfo(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-15', '2026-09-16'], '2026-09-16');
    expect(s.current).toBe(2);
    expect(s.best).toBe(3);
  });
  it('handles month boundaries', () => expect(streakInfo(['2026-08-31', '2026-09-01'], '2026-09-01').current).toBe(2));
});

describe('targets', () => {
  const base = { sex: 'male' as const, age: 21, heightIn: 75, weightLb: 195, targetLb: 185, activity: 1.55, goal: 'lose' as const, ratePerWeek: 1 };
  it('uses Mifflin–St Jeor', () => expect(computeTargets(base).targets.calories).toBe(2560));
  it('warns and suggests a safer rate for extreme loss', () => {
    const r = computeTargets({ ...base, ratePerWeek: 3 });
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.saferRate).toBe(1.75);
  });
  it('never goes under the floor', () => {
    const r = computeTargets({ ...base, sex: 'female', weightLb: 120, heightIn: 60, targetLb: 110, activity: 1.2, ratePerWeek: 1 });
    expect(r.targets.calories).toBe(1200);
    expect(r.warnings.join(' ')).toMatch(/1,200/);
  });
});

describe('barcodes', () => {
  it('validates check digits', () => {
    expect(checkDigitValid('012345678905')).toBe(true);
    expect(checkDigitValid('012345678904')).toBe(false);
  });
  it('expands UPC-E and adds EAN/GTIN forms', () => {
    expect(upcEtoA('01234565')).toBe('012345000065');
    expect(barcodeVariants('012345678905')).toEqual(['012345678905', '0012345678905', '00012345678905']);
    expect(barcodeVariants('0012345678905')).toContain('012345678905');
  });
  it('chooses the most complete verified result when databases both find a barcode', () => {
    const item = (id: string, complete: boolean): FoodItem => ({
      id,
      name: 'Test food',
      kind: 'branded',
      serving: { description: '1 serving', quantity: 1, unit: 'serving' },
      nutrients: { calories: 100, protein: 2, carbs: 10, fat: 5, fiber: complete ? 3 : null, sugar: complete ? 2 : null, sodium: complete ? 100 : null },
      source: { provider: id === 'usda' ? 'usda' : 'off', quality: 'verified_packaged' },
    });
    const best = pickBestBarcodeHit([
      { hit: { item: item('off', false) }, order: 0 },
      { hit: { item: item('usda', true) }, order: 1 },
    ]);
    expect(best?.item.id).toBe('usda');
  });
});

describe('food search relevance', () => {
  const result = (name: string, category: FoodItem['category']): Pick<FoodItem, 'name' | 'brand' | 'restaurant' | 'category'> => ({
    name,
    brand: 'Culver’s',
    restaurant: 'culvers',
    category,
  });
  it('ranks the requested food type above a result sharing only one ingredient word', () => {
    expect(foodSearchScore('cheeseburger', result('ButterBurger Cheese Single', 'burger'))).toBeGreaterThan(
      foodSearchScore('cheeseburger', result('Broccoli Cheese Soup', 'soup')),
    );
  });
});

describe('HealthyFastFood restaurant coverage', () => {
  it('covers the complete 156-chain directory', () => expect(HFF_RESTAURANTS).toHaveLength(156));
  it.each([
    ['Whataburger double burger', 'whataburger'],
    ['Cava chicken bowl', 'cava'],
    ["Freddy's cheeseburger", 'freddys-frozen-custard-steakburgers'],
    ['Costco pizza', 'costco'],
    ['Olive Garden lasagna', 'olive-garden'],
    ['CFA nuggets', 'chick-fil-a'],
    ['DQ blizzard', 'dairy-queen'],
    ['BK whopper', 'burger-king'],
  ])('recognizes %s', (query, slug) => expect(findHffRestaurant(query)?.slug).toBe(slug));
});

describe('label score', () => {
  it('scores out of 10 with reasons', () => {
    const s = labelScore({ nutriScore: 'a', nova: 1, additives: [] });
    expect(s.score).toBe(10);
    const t = labelScore({ nutriScore: 'e', nova: 4, additives: ['en:e250', 'en:e330', 'en:e621'] });
    expect(t.score).toBe(2);
    expect(t.parts.find((p) => p.id === 'additives')!.detail).toMatch(/sodium nitrite/);
  });
  it('estimates the grade from the label when the database has none, and scales missing parts', () => {
    const s = labelScore({ per100g: { energyKcal: 393, sugars: 3.6, saturatedFat: 0, sodiumMg: 893, fiber: 3.6, protein: 10.7 } });
    expect(s.gradeEstimated).toBe(true);
    expect(s.score).not.toBeNull();
    expect(s.missing).toContain('Processing level');
  });
  it('returns no score without nutrition data', () => expect(labelScore({ nova: 4 }).score).toBeNull());
});

describe('daily balance', () => {
  it('waits for enough data', () => expect(dailyBalance([], { calories: 2000, protein: 150, fiber: 28 }, false).ready).toBe(false));
  it('explains every factor', () => {
    const e = [
      { name: 'Eggs', qty: 1, nutrients: { calories: 300, protein: 25, carbs: 2, fat: 20, fiber: 0, sugar: 1, sodium: 400 } },
      { name: 'Oats', qty: 1, nutrients: { calories: 300, protein: 10, carbs: 54, fat: 5, fiber: 8, sugar: 1, sodium: 5 } },
    ];
    const b = dailyBalance(e, { calories: 2000, protein: 150, fiber: 28 }, false);
    expect(b.ready).toBe(true);
    if (b.ready) {
      expect(b.factors.map((f) => f.id)).toEqual(['protein', 'calories', 'fiber', 'sodium', 'sugar', 'variety']);
      expect(b.score).toBeGreaterThan(0);
    }
  });
});

describe('input focus layout (onboarding bug)', () => {
  it('lets row fields shrink instead of overflowing into neighbors', () => {
    const l = fieldLayout(false);
    expect(l.container.minWidth).toBe(0);
    expect(l.input.minWidth).toBe(0);
    expect(l.input.width).toBe('100%');
  });
  it('keeps fields ring-free when focused so only the caret is visible', () => {
    const a = fieldLayout(false);
    const b = fieldLayout(true);
    expect(a.container.borderWidth).toBe(b.container.borderWidth);
    expect(a.container.borderColor).toBe('transparent');
    expect(b.container.borderColor).toBe('transparent');
    expect(b.input.outlineWidth).toBe(0);
    expect(b.input.caretColor).toBe('#0A84FF');
    expect(a.container.margin ?? 0).toBe(0);
  });
});
