import { describe, expect, it } from 'vitest';
import { runCrave, type CraveDeps } from '../shared/crave';
import { DEV_FOODS, devLookup, devSearch } from '../shared/dev/fixtures';
import { parseCraving } from '../shared/intent';
import { scoreCandidate } from '../shared/rank';

const deps: CraveDeps = {
  search: async (q, o) => devSearch(q, o.restaurantId),
  lookup: async (rid, _name, q) => devLookup(rid, q),
};
const prefs = { restrictions: [], allergies: [] };
const roomy = { calories: 1500, protein: 120, carbs: 150, fat: 60 };
const tight = { calories: 520, protein: 60, carbs: 80, fat: 20 };

describe('intent parser', () => {
  it('reads restaurant, food and patties', () => {
    const i = parseCraving('I want a Culver’s double cheeseburger with no mayo');
    expect(i.restaurantId).toBe('culvers');
    expect(i.category).toBe('burger');
    expect(i.patties).toBe(2);
    expect(i.cheese).toBe(true);
    expect(i.remove).toContain('mayo');
    expect(i.specific).toBe(true);
  });
  it('reads moods', () => {
    const i = parseCraving('I want something salty and crunchy');
    expect(i.flavors).toEqual(['salty']);
    expect(i.textures).toEqual(['crunchy']);
    expect(i.specific).toBe(false);
  });
});

describe('Scenario A: exact food fits', () => {
  it('puts the real Culver’s cheeseburger first and hides substitutes', async () => {
    const r = await runCrave({ text: 'I want a Culver’s cheeseburger', left: roomy, prefs }, deps);
    expect(r.exact?.item.name).toBe('ButterBurger Cheese Single');
    expect(r.exact?.fitsAsIs).toBe(true);
    expect(r.exact?.computed.nutrients.calories).toBe(460);
    expect(r.showSimilar).toBe(false);
    for (const s of r.similar) expect(s.item.name).not.toMatch(/yogurt|quesadilla/i);
  });
  it('never mistakes a shared ingredient word for the requested food', async () => {
    const burger = DEV_FOODS.find((f) => f.name === 'ButterBurger Cheese Single')!;
    const soup = {
      ...DEV_FOODS.find((f) => f.name === 'Zuppa Toscana')!,
      id: 'test:broccoli-cheese-soup',
      name: 'Broccoli Cheese Soup',
      restaurant: 'culvers',
      brand: 'Culver’s',
      category: 'soup' as const,
    };
    const mixed: CraveDeps = {
      search: async () => [soup, burger],
      lookup: async () => null,
    };
    const r = await runCrave({ text: 'Culver’s cheeseburger', left: roomy, prefs }, mixed);
    expect(r.exact?.item.name).toBe('ButterBurger Cheese Single');
  });
});

describe('Scenario B: exact food does not fit', () => {
  it('keeps the double, offers make-it-fit plans before substitutes', async () => {
    const r = await runCrave({ text: 'I want a Culver’s double cheeseburger', left: tight, prefs }, deps);
    expect(r.exact?.item.name).toBe('ButterBurger Cheese Double');
    expect(r.exact?.fitsAsIs).toBe(false);
    expect(r.exact!.plans.length).toBeGreaterThan(0);
    const first = r.exact!.plans[0];
    expect(first.fits).toBe(true);
    expect(first.computed.nutrients.calories).toBeLessThanOrEqual(tight.calories + 50);
    // restaurant-offered change (a smaller burger) comes before "eat half"
    expect(first.changes[0].groupId).toBe('burger');
    for (const s of r.similar) expect(['burger', 'sandwich', 'chicken']).toContain(s.item.category);
  });
  it('never ranks an unrelated low-calorie food above the requested one', () => {
    const intent = parseCraving('Culver’s double cheeseburger');
    const burger = DEV_FOODS.find((f) => f.name === 'ButterBurger Cheese Double')!;
    const yogurt = DEV_FOODS.find((f) => f.name.startsWith('Greek yogurt'))!;
    const a = scoreCandidate(intent, burger, tight, { exact: true });
    const b = scoreCandidate(intent, yogurt, tight);
    expect(a.score).toBeGreaterThan(b.score);
    const c = scoreCandidate(intent, burger, tight);
    expect(c.score).toBeGreaterThan(b.score);
  });
});

describe('Scenario C: Olive Garden lasagna', () => {
  it('finds the entrée and offers only resolvable Olive Garden sides', async () => {
    const r = await runCrave({ text: 'I want Olive Garden lasagna', left: roomy, prefs }, deps);
    expect(r.exact?.item.name).toBe('Lasagna Classico');
    const ids = r.exact!.custom.groups.map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining(['soup_salad', 'dressing', 'breadsticks', 'portion']));
    const breadsticks = r.exact!.custom.groups.find((g) => g.id === 'breadsticks')!;
    expect(breadsticks.options[0].nutrients?.calories).toBe(140);
    expect(r.exact!.custom.groups.find((g) => g.id === 'extras')!.options[0].quality).toBe('estimate');
  });
});

describe('Scenario D: generic craving', () => {
  it('returns salty and crunchy foods', async () => {
    const r = await runCrave({ text: 'I want something salty and crunchy', left: tight, prefs }, deps);
    expect(r.exact).toBeNull();
    expect(r.similar.length).toBeGreaterThan(2);
    for (const s of r.similar.slice(0, 3)) expect(s.reasons.join(' ')).toMatch(/salty and crunchy|salty|crunchy/);
    expect(r.similar[0].item.name).not.toMatch(/yogurt|burrito/i);
  });
  it('asks one short question when the craving is vague', async () => {
    const r = await runCrave({ text: 'I want something', left: tight, prefs }, deps);
    expect(r.question?.id).toBe('mood');
    expect(r.question!.options.length).toBeLessThanOrEqual(3);
  });
});

describe('restrictions', () => {
  it('flags the exact item for a vegetarian profile and shows alternatives', async () => {
    const r = await runCrave({ text: 'Culver’s cheeseburger', left: roomy, prefs: { restrictions: ['vegetarian'], allergies: [] } }, deps);
    expect(r.exact?.conflict).toBe('Not vegetarian');
    expect(r.showSimilar).toBe(true);
  });
});

describe('mood cravings never come back empty (live-site conditions)', () => {
  const bareDeps: CraveDeps = {
    search: async () => [],
    lookup: async () => null,
    // no ideas() — exactly like the deployed site with no AI ideas wired
  };
  it('returns real foods for "salty and crunchy" with no AI and no database', async () => {
    const r = await runCrave({ text: 'something salty and crunchy', left: roomy, prefs }, bareDeps);
    expect(r.exact).toBeNull();
    expect(r.similar.length).toBeGreaterThan(2);
    for (const s of r.similar) expect(s.item.nutrients.calories).toBeGreaterThan(0);
    expect(r.similar.some((s) => /pretzel|popcorn|chips|almond|crisp/i.test(s.item.name))).toBe(true);
  });
  it('returns cold sweet foods for "sweet and cold"', async () => {
    const r = await runCrave({ text: 'sweet and cold', left: roomy, prefs }, bareDeps);
    expect(r.similar.length).toBeGreaterThan(1);
    expect(r.similar.some((s) => /yogurt|smoothie|ice cream|frozen/i.test(s.item.name))).toBe(true);
  });
});
