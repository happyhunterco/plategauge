import { describe, expect, it } from 'vitest';
import { applyChange, compute, defaultSelection, effectOf } from '../shared/customize';
import type { Customizable } from '../shared/food';
import { templateFor } from '../shared/templates';
import { DEV_FOODS, devLookup } from '../shared/dev/fixtures';
import { buildCustomizable } from '../shared/resolve';

const burger = { ...DEV_FOODS.find((f) => f.name === 'Cheeseburger')!, restaurant: null, brand: null, kind: 'generic' as const };

describe('customization math', () => {
  it('default selection equals the base item (no double counting)', () => {
    const c = templateFor(burger);
    const out = compute(c, defaultSelection(c));
    expect(out.nutrients.calories).toBe(burger.nutrients.calories);
    expect(out.nutrients.protein).toBe(burger.nutrients.protein);
  });
  it('removing default cheese subtracts it once; adding it back restores', () => {
    const c = templateFor(burger);
    const s0 = defaultSelection(c);
    expect(s0.cheese).toEqual(['cheese']);
    const s1 = applyChange(c, s0, 'cheese', 'cheese');
    expect(compute(c, s1).nutrients.calories).toBe(burger.nutrients.calories - 70);
    const s2 = applyChange(c, s1, 'cheese', 'cheese');
    expect(compute(c, s2).nutrients.calories).toBe(burger.nutrients.calories);
  });
  it('adding a patty shows its effect and marks the total as an estimate', () => {
    const c = templateFor(burger);
    const s = defaultSelection(c);
    expect(effectOf(c, s, 'patties', 2).calories).toBe(213);
    const out = compute(c, applyChange(c, s, 'patties', 2));
    expect(out.nutrients.calories).toBe(burger.nutrients.calories + 213);
    expect(out.estimated).toBe(true);
  });
  it('half portion scales the item but not the drink', () => {
    const c = templateFor(burger);
    let s = applyChange(c, defaultSelection(c), 'drink', 'soda');
    s = applyChange(c, s, 'portion', 'half');
    expect(compute(c, s).nutrients.calories).toBe(Math.round(burger.nutrients.calories / 2 + 200));
  });
  it('count groups add per unit relative to the default', async () => {
    const lasagna = DEV_FOODS.find((f) => f.name === 'Lasagna Classico')!;
    const c: Customizable = await buildCustomizable(lasagna, 'olive garden lasagna', async (rid, _n, q) => devLookup(rid, q));
    let s = defaultSelection(c);
    s = applyChange(c, s, 'breadsticks', 2);
    expect(compute(c, s).nutrients.calories).toBe(776 + 280);
    // dressing only counts once salad is chosen
    s = applyChange(c, s, 'dressing', 1);
    expect(compute(c, s).nutrients.calories).toBe(776 + 280);
    s = applyChange(c, s, 'soup_salad', 'house_salad');
    expect(compute(c, s).nutrients.calories).toBe(776 + 280 + 70 + 80);
  });
  it('restaurant variants use exact deltas', async () => {
    const dbl = DEV_FOODS.find((f) => f.name === 'ButterBurger Cheese Double')!;
    const c = await buildCustomizable(dbl, 'culvers double cheeseburger', async (rid, _n, q) => devLookup(rid, q));
    const s = applyChange(c, defaultSelection(c), 'burger', 'single_cheese');
    expect(compute(c, s).nutrients.calories).toBe(460);
    expect(compute(c, s).quality).toBe('development');
  });
  it('restaurants without modifier data get no invented kitchen options', () => {
    const c = templateFor({ ...burger, kind: 'restaurant', restaurant: 'five_guys' }, { restaurant: true });
    expect(c.groups.map((g) => g.id)).toEqual(['portion', 'side', 'drink']);
  });
});
