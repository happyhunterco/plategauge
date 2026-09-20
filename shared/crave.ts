import { applyChange, compute, defaultSelection, makeItFit, type Computed, type FitPlan } from './customize';
import type { Customizable, FoodCategory, FoodItem, Selection } from './food';
import { exactQuery, parseCraving, type Intent } from './intent';
import { fits, type Budget } from './nutrients';
import { applyAnswers, nextQuestion, type Question } from './questions';
import { conflict, foodSearchScore, nameOverlap, rankCandidates, relevant, type Prefs, type Scored } from './rank';
import { buildCustomizable, type Lookup } from './resolve';
import { menuRuleFor, norm, restaurantById } from './restaurants';
import { moodFoods } from './moodFoods';
import { categoryOf, NEAR } from './tags';

export type SearchOpts = { restaurantId?: string | null; restaurantName?: string | null; category?: FoodCategory | null; limit?: number };

export type CraveDeps = {
  search: (q: string, o: SearchOpts) => Promise<FoodItem[]>;
  lookup: Lookup;
  /** Server-only directory fallback for chains outside the curated builder list. */
  restaurant?: (text: string) => { id: string; name: string; alias: string } | null;
  /** Optional: AI suggestions for mood cravings. Must return items labeled 'estimate'. */
  ideas?: (intent: Intent, left: Budget) => Promise<FoodItem[]>;
};

export type CraveInput = { text: string; left: Budget; prefs: Prefs; answers?: Record<string, Partial<Intent>> };

export type ExactResult = {
  item: FoodItem;
  custom: Customizable;
  selection: Selection;
  computed: Computed;
  fitsAsIs: boolean;
  plans: FitPlan[];
  conflict: string | null;
};

export type CraveResult = {
  intent: Intent;
  question: Question | null;
  exact: ExactResult | null;
  /** Said when a specific item couldn't be found, so the user knows we tried */
  notFound: string | null;
  similar: Scored[];
  /** Hide substitutes when the exact item (or a tweak of it) already works */
  showSimilar: boolean;
  blocked: { item: FoodItem; reason: string }[];
  /** Full restaurant menu shown when the user names a chain without an item. */
  menu?: FoodItem[];
};

const MOOD_QUERIES: { when: (i: Intent) => boolean; queries: string[] }[] = [
  {
    when: (i) => i.flavors.includes('salty') && i.textures.some((t) => t === 'crunchy' || t === 'crispy'),
    queries: ['pretzels', 'popcorn', 'tortilla chips', 'roasted almonds', 'cheese crisps', 'rice cakes'],
  },
  { when: (i) => i.flavors.includes('salty'), queries: ['popcorn', 'pretzels', 'beef jerky', 'pickles', 'string cheese'] },
  { when: (i) => i.textures.includes('crunchy'), queries: ['apple', 'granola', 'carrots hummus', 'popcorn'] },
  { when: (i) => i.flavors.includes('sweet') && i.temperature === 'cold', queries: ['frozen yogurt', 'ice cream bar', 'fruit smoothie', 'greek yogurt honey'] },
  { when: (i) => i.flavors.includes('chocolate'), queries: ['dark chocolate', 'chocolate protein shake', 'brownie', 'chocolate milk'] },
  { when: (i) => i.flavors.includes('sweet'), queries: ['dark chocolate', 'protein bar', 'frozen yogurt', 'apple peanut butter', 'greek yogurt honey'] },
  { when: (i) => i.flavors.includes('spicy'), queries: ['spicy chips', 'buffalo wings', 'spicy chicken sandwich', 'jalapeno poppers'] },
  { when: (i) => i.textures.includes('creamy'), queries: ['greek yogurt', 'pudding', 'cottage cheese', 'mac and cheese'] },
  { when: (i) => i.temperature === 'cold', queries: ['frozen yogurt', 'smoothie', 'greek yogurt', 'iced coffee'] },
  { when: (i) => i.temperature === 'hot' || i.flavors.includes('savory'), queries: ['chicken burrito bowl', 'chicken sandwich', 'soup', 'grilled cheese'] },
];

function pickExact(intent: Intent, items: FoodItem[]): FoodItem | null {
  let best: { item: FoodItem; s: number } | null = null;
  for (const it of items) {
    if (intent.restaurantId && it.restaurant !== intent.restaurantId) continue;
    const actualCategory = it.category ?? categoryOf(it.name);
    // Exact means the same kind of food. Similar categories are handled later
    // and must never replace the thing the user explicitly requested.
    if (intent.category && actualCategory !== intent.category) continue;
    const overlap = nameOverlap(intent.food, it.name);
    const minimum = intent.category ? 0.5 : 0.75;
    if (overlap < minimum) continue;
    const s = foodSearchScore(intent.food, it);
    if (!best || s > best.s || (s === best.s && it.name.length < best.item.name.length)) best = { item: it, s };
  }
  return best?.item ?? null;
}

/** Carry the user's words into the builder: "no mayo", "half", "2 slices", "large". */
export function selectionFromIntent(c: Customizable, intent: Intent): Selection {
  let sel = defaultSelection(c);
  for (const g of c.groups) {
    if (g.kind === 'toggle') {
      for (const o of g.options) {
        const w = o.label.toLowerCase();
        const on = (sel[g.id] as string[]).includes(o.id);
        if (!on && intent.add.some((a) => w.includes(a)) && o.nutrients) sel = applyChange(c, sel, g.id, o.id);
        if (on && intent.remove.some((a) => w.includes(a))) sel = applyChange(c, sel, g.id, o.id);
      }
    }
    if (g.kind === 'count' && g.scope === 'item' && intent.quantity && g.options[0]?.nutrients) {
      if (g.id === 'patties' && intent.patties) sel = applyChange(c, sel, g.id, intent.patties);
      else if (g.id !== 'patties') sel = applyChange(c, sel, g.id, intent.quantity);
    }
    if (g.kind === 'count' && g.id === 'patties' && intent.patties) sel = applyChange(c, sel, g.id, intent.patties);
    if (g.kind === 'portion' && g.id === 'portion' && intent.portion) {
      const o = g.options.find((x) => x.multiplier === intent.portion);
      if (o) sel = applyChange(c, sel, g.id, o.id);
    }
    if (g.kind === 'portion' && g.id === 'size' && intent.size) {
      const id = intent.size === 'medium' ? 'regular' : intent.size;
      if (g.options.some((o) => o.id === id)) sel = applyChange(c, sel, g.id, id);
    }
  }
  return sel;
}

export async function runCrave(input: CraveInput, deps: CraveDeps): Promise<CraveResult> {
  const answers = input.answers ?? {};
  let parsed = parseCraving(input.text);
  if (!parsed.restaurantId && deps.restaurant) {
    const found = deps.restaurant(input.text);
    if (found) {
      const withoutChain = norm(input.text).replace(found.alias, ' ').replace(/\s+/g, ' ').trim();
      parsed = { ...parseCraving(withoutChain), raw: input.text.trim(), restaurantId: found.id, restaurantName: found.name };
    }
  }
  const intent = applyAnswers(parsed, answers);
  const answered = Object.keys(answers);
  const r = restaurantById(intent.restaurantId);
  const rule = r ? menuRuleFor(r.id, intent.food) : null;
  const ctx = { answered, exactFound: false, hasCheeseVariant: !!rule?.pickVariant, hasSizes: false };

  // A chain by itself opens its real menu instead of forcing three canned choices.
  if (intent.restaurantId && intent.restaurantName && !intent.food) {
    const found = await deps
      .search(intent.restaurantName, {
        restaurantId: intent.restaurantId,
        restaurantName: intent.restaurantName,
        limit: 300,
      })
      .catch(() => []);
    const seen = new Set<string>();
    const menu = found
      .filter((item) => item.kind === 'restaurant' && !seen.has(item.id) && seen.add(item.id))
      .sort((a, b) => (a.category ?? 'other').localeCompare(b.category ?? 'other') || a.name.localeCompare(b.name));
    return { intent, question: null, exact: null, notFound: menu.length ? null : `We couldn’t load ${intent.restaurantName}’s menu right now.`, similar: [], showSimilar: false, blocked: [], menu };
  }

  const early = nextQuestion(intent, ctx);
  if (early?.blocking) return { intent, question: early, exact: null, notFound: null, similar: [], showSimilar: false, blocked: [] };

  let exact: ExactResult | null = null;
  let notFound: string | null = null;
  const blocked: CraveResult['blocked'] = [];

  if (intent.specific) {
    const q = exactQuery(intent);
    const results = await deps
      .search(q, { restaurantId: intent.restaurantId, restaurantName: intent.restaurantName, category: intent.category, limit: 20 })
      .catch(() => []);
    const genericRuleRequest = !!rule && norm(intent.food).split(' ').length === 1;
    let item = genericRuleRequest && r ? await deps.lookup(r.id, r.name, rule!.baseQuery).catch(() => null) : null;
    if (!item) item = pickExact(intent, results);
    if (!item && r && rule) item = await deps.lookup(r.id, r.name, rule.baseQuery).catch(() => null);
    if (item) {
      const custom = await buildCustomizable(item, `${intent.raw} ${intent.food}`, deps.lookup);
      const selection = selectionFromIntent(custom, intent);
      const computed = compute(custom, selection);
      const fitsAsIs = fits(input.left, computed.nutrients);
      exact = {
        item: custom.item,
        custom,
        selection,
        computed,
        fitsAsIs,
        plans: fitsAsIs ? [] : makeItFit(custom, selection, input.left),
        conflict: conflict(custom.item, input.prefs),
      };
    } else {
      notFound = `We couldn’t find “${intent.food}”${r ? ` at ${r.name}` : ''} in the nutrition databases.`;
    }
  }

  // Similar options: same restaurant first, then the same kind of food elsewhere, then mood matches.
  const queries = new Set<string>();
  const cat = intent.category ?? (intent.food ? categoryOf(intent.food) : null);
  if (intent.specific) {
    if (r && cat) queries.add(`${r.name}|${cat === 'burger' ? 'burger' : intent.food}`);
    if (cat) {
      queries.add(`|${intent.food}`);
      for (const near of NEAR[cat] ?? []) queries.add(`${r ? r.name : ''}|${near.replace('_', ' ')}`);
    }
  } else {
    for (const m of MOOD_QUERIES) if (m.when(intent)) m.queries.forEach((x) => queries.add(`|${x}`));
  }
  const pool: FoodItem[] = [];
  await Promise.all(
    [...queries].slice(0, 8).map(async (key) => {
      const [rest, q] = key.split('|');
      const rr = rest ? r : null;
      const items = await deps.search(q, { restaurantId: rr?.id ?? null, restaurantName: rr?.name ?? null, limit: 8 }).catch(() => []);
      pool.push(...items);
    }),
  );
  if (!intent.specific && deps.ideas) pool.push(...(await deps.ideas(intent, input.left).catch(() => [])));
  // Guaranteed fallback: built-in real foods matching the mood, so Crave is never empty
  // for an abstract craving even with no AI and no restaurant-database hit.
  if (!intent.specific) pool.push(...moodFoods(intent));

  const exclude = new Set<string>();
  if (exact) {
    exclude.add(exact.item.id);
    exclude.add(`${norm(exact.item.brand ?? exact.item.restaurant ?? '')}|${norm(exact.item.name)}`);
  }
  const { ranked, blocked: b2 } = rankCandidates(intent, pool, input.left, input.prefs, exclude);
  blocked.push(...b2);
  const similar = ranked.filter((s) => relevant(intent, s)).slice(0, 6);

  const tweakFits = !!exact && (exact.fitsAsIs || exact.plans.length > 0);
  const showSimilar = !exact || !tweakFits || intent.wantsAlternatives || !!exact.conflict;

  const question = nextQuestion(intent, {
    ...ctx,
    exactFound: !!exact,
    hasSizes: !!exact?.custom.groups.some((g) => g.id === 'size'),
  });

  return { intent, question, exact, notFound, similar, showSimilar, blocked };
}
