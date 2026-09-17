import { templateFor, portionGroup } from './templates';
import type { Customizable, FoodItem, ModGroup, ModOption, Nutrients, Quality } from './food';
import { REFERENCE } from './reference';
import { menuRuleFor, restaurantByBrand, restaurantById, type ComponentSource, type MenuRule } from './restaurants';
import { sub } from './nutrients';

export type Lookup = (restaurantId: string, restaurantName: string, query: string) => Promise<FoodItem | null>;

const ZERO_N: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

type Resolved = { nutrients: Nutrients | null; quality: Quality; item?: FoodItem };

async function resolveSource(
  src: ComponentSource,
  lookup: Lookup,
  rid: string,
  rname: string,
  cache: Map<string, Promise<FoodItem | null>>,
): Promise<Resolved> {
  if ('zero' in src) return { nutrients: ZERO_N, quality: 'database' };
  if ('ref' in src) return { nutrients: REFERENCE[src.ref].n, quality: 'estimate' };
  if (!cache.has(src.query))
    cache.set(
      src.query,
      lookup(rid, rname, src.query).catch(() => null),
    );
  const item = await cache.get(src.query)!;
  return item ? { nutrients: item.nutrients, quality: item.source.quality, item } : { nutrients: null, quality: 'estimate' };
}

const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  );
const sameItem = (a: FoodItem, b: FoodItem) => {
  if (a.id === b.id) return true;
  const ta = tokens(a.name);
  const tb = tokens(b.name);
  return ta.size === tb.size && [...ta].every((t) => tb.has(t));
};

/**
 * Turns any food into a Build It definition.
 * Restaurants with a menu rule get their real options; nutrition for each option comes from the
 * provider lookup. Options that can't be resolved stay visible but disabled.
 */
export async function buildCustomizable(item: FoodItem, words: string, lookup: Lookup): Promise<Customizable> {
  const r = restaurantById(item.restaurant) ?? restaurantByBrand(item.brand);
  const rule: MenuRule | null = r ? menuRuleFor(r.id, `${item.name} ${words}`) : null;
  if (!r || !rule) return templateFor(item, { restaurant: !!r || item.kind === 'restaurant' });

  const cache = new Map<string, Promise<FoodItem | null>>();
  let base = item;
  const groups: ModGroup[] = [];

  for (const g of rule.groups) {
    const resolved = await Promise.all(g.options.map((o) => resolveSource(o.source, lookup, r.id, r.name, cache)));

    if (g.kind === 'variant') {
      // Which variant is the base? Prefer the user's words, then the item we were given.
      const wanted = rule.pickVariant?.(`${words} ${item.name}`.toLowerCase());
      let idx = g.options.findIndex((o) => o.id === wanted);
      if (idx < 0 || !resolved[idx].item) idx = resolved.findIndex((x) => x.item && sameItem(x.item, item));
      if (idx >= 0 && resolved[idx].item) base = resolved[idx].item!;
      const defaultId = idx >= 0 ? g.options[idx].id : '__base';
      const options: ModOption[] = g.options.map((o, i) => ({
        id: o.id,
        label: o.label,
        nutrients: resolved[i].nutrients ? sub(resolved[i].nutrients!, base.nutrients) : null,
        quality: resolved[i].quality,
        note: resolved[i].nutrients ? undefined : 'Nutrition not available',
      }));
      if (idx < 0) options.unshift({ id: '__base', label: 'As ordered', nutrients: { ...ZERO_N }, quality: base.source.quality });
      groups.push({ id: g.id, label: g.label, kind: 'single', scope: g.scope, options, defaults: [defaultId], help: g.help });
      continue;
    }

    const options: ModOption[] = g.options.map((o, i) => ({
      id: o.id,
      label: o.label,
      nutrients: resolved[i].nutrients,
      quality: resolved[i].quality,
      note: resolved[i].nutrients ? undefined : 'Nutrition not available',
    }));
    if (g.kind === 'toggle') {
      groups.push({ id: g.id, label: g.label, kind: 'toggle', scope: g.scope, options, defaults: g.defaultOn ?? [], help: g.help, requires: g.requires });
    } else if (g.kind === 'count') {
      groups.push({
        id: g.id,
        label: g.label,
        kind: 'count',
        scope: g.scope,
        options,
        defaults: 0,
        min: 0,
        max: g.max ?? 6,
        unitLabel: g.unitLabel,
        help: g.help,
        requires: g.requires,
      });
    } else {
      groups.push({ id: g.id, label: g.label, kind: 'single', scope: g.scope, options, defaults: [g.options[0].id], help: g.help, requires: g.requires });
    }
  }
  groups.push(portionGroup());
  return { item: { ...base, restaurant: r.id, category: rule.category }, title: rule.title, groups, note: rule.note };
}

export { restaurantByBrand };
