import type { Customizable, ModGroup, ModOption, Nutrients, Quality, Selection } from './food';
import { isEstimate, worstQuality } from './food';
import { add, clampNonNegative, describeDelta, fits, roundN, sub, ZERO, type Budget } from './nutrients';

export function defaultSelection(c: Customizable): Selection {
  const sel: Selection = {};
  for (const g of c.groups) sel[g.id] = Array.isArray(g.defaults) ? [...g.defaults] : g.defaults;
  return sel;
}

export function groupVisible(g: ModGroup, sel: Selection): boolean {
  if (!g.requires) return true;
  const v = sel[g.requires.group];
  return Array.isArray(v) && v.some((id) => g.requires!.anyOf.includes(id));
}

const ids = (v: string[] | number | undefined) => (Array.isArray(v) ? v : []);
const num = (v: string[] | number | undefined, fallback: number) => (typeof v === 'number' ? v : fallback);

export function optionAvailable(o: ModOption) {
  return o.nutrients !== null || o.multiplier != null;
}

/** Nutrition delta a group contributes relative to the default configuration. */
function groupDelta(g: ModGroup, sel: Selection): { delta: Nutrients; qualities: Quality[] } {
  let delta: Nutrients = { ...ZERO };
  const qualities: Quality[] = [];
  const cur = sel[g.id];
  if (g.kind === 'single') {
    const def = ids(g.defaults)[0];
    const pick = ids(cur)[0] ?? def;
    if (pick !== def) {
      const o = g.options.find((x) => x.id === pick);
      if (o?.nutrients) {
        delta = add(delta, o.nutrients);
        qualities.push(o.quality);
      }
    }
  } else if (g.kind === 'toggle') {
    const on = new Set(ids(cur));
    const defOn = new Set(ids(g.defaults));
    for (const o of g.options) {
      if (!o.nutrients) continue;
      if (on.has(o.id) && !defOn.has(o.id)) {
        delta = add(delta, o.nutrients);
        qualities.push(o.quality);
      } else if (!on.has(o.id) && defOn.has(o.id)) {
        delta = sub(delta, o.nutrients);
        qualities.push(o.quality);
      }
    }
  } else if (g.kind === 'count') {
    const o = g.options[0];
    const n = num(cur, num(g.defaults, 0)) - num(g.defaults, 0);
    if (o?.nutrients && n !== 0) {
      delta = add(delta, o.nutrients, n);
      qualities.push(o.quality);
    }
  }
  return { delta, qualities };
}

export function portionMultiplier(c: Customizable, sel: Selection): number {
  let m = 1;
  for (const g of c.groups) {
    if (g.kind !== 'portion') continue;
    const pick = ids(sel[g.id])[0] ?? ids(g.defaults)[0];
    m *= g.options.find((o) => o.id === pick)?.multiplier ?? 1;
  }
  return m;
}

export type Computed = {
  nutrients: Nutrients;
  quality: Quality;
  estimated: boolean;
  summary: string[]; // human list of changes from default
};

/**
 * total = (base + item-scope deltas) × portion + meal-scope deltas.
 * The base already includes default components, so defaults contribute zero — nothing is counted twice.
 */
export function compute(c: Customizable, sel: Selection): Computed {
  let item: Nutrients = { ...c.item.nutrients };
  let meal: Nutrients = { ...ZERO };
  const qualities: Quality[] = [c.item.source.quality];
  let portionChanged = false;
  for (const g of c.groups) {
    if (g.kind === 'portion') {
      const pick = ids(sel[g.id])[0];
      if (pick && pick !== ids(g.defaults)[0]) portionChanged = true;
      continue;
    }
    if (!groupVisible(g, sel)) continue;
    const { delta, qualities: q } = groupDelta(g, sel);
    qualities.push(...q);
    if (g.scope === 'item') item = add(item, delta);
    else meal = add(meal, delta);
  }
  const m = portionMultiplier(c, sel);
  if (portionChanged && m !== 1) qualities.push('estimate');
  const nutrients = roundN(clampNonNegative(add(scaleItem(item, m), meal)));
  const quality = worstQuality(qualities);
  return { nutrients, quality, estimated: qualities.some(isEstimate), summary: describeSelection(c, sel) };
}

function scaleItem(n: Nutrients, m: number): Nutrients {
  const s = (v: number | null | undefined) => (v == null ? v : v * m);
  return { calories: n.calories * m, protein: n.protein * m, carbs: n.carbs * m, fat: n.fat * m, fiber: s(n.fiber), sugar: s(n.sugar), sodium: s(n.sodium) };
}

export function describeSelection(c: Customizable, sel: Selection): string[] {
  const out: string[] = [];
  for (const g of c.groups) {
    if (!groupVisible(g, sel)) continue;
    const cur = sel[g.id];
    if (g.kind === 'single' || g.kind === 'portion') {
      const pick = ids(cur)[0];
      if (pick && pick !== ids(g.defaults)[0]) out.push(g.options.find((o) => o.id === pick)?.label ?? pick);
    } else if (g.kind === 'toggle') {
      const on = new Set(ids(cur));
      const defOn = new Set(ids(g.defaults));
      for (const o of g.options) {
        if (on.has(o.id) && !defOn.has(o.id)) out.push(`Add ${o.label.toLowerCase()}`);
        if (!on.has(o.id) && defOn.has(o.id)) out.push(`No ${o.label.toLowerCase()}`);
      }
    } else if (g.kind === 'count') {
      const n = num(cur, num(g.defaults, 0));
      if (n !== num(g.defaults, 0)) out.push(`${n} ${g.unitLabel ?? g.options[0]?.label ?? ''}${n === 1 ? '' : 's'}`.trim());
    }
  }
  return out;
}

/** Selection after applying one change (select an option, flip a toggle, set a count). */
export function applyChange(c: Customizable, sel: Selection, groupId: string, value: string | number): Selection {
  const g = c.groups.find((x) => x.id === groupId);
  if (!g) return sel;
  const next: Selection = { ...sel };
  if (g.kind === 'count') {
    const v = typeof value === 'number' ? value : Number(value);
    next[g.id] = Math.min(g.max ?? 20, Math.max(g.min ?? 0, v));
  } else if (g.kind === 'toggle') {
    const cur = new Set(ids(sel[g.id]));
    const id = String(value);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    next[g.id] = [...cur];
  } else {
    next[g.id] = [String(value)];
  }
  return next;
}

/** What choosing this option would change right now — powers the "+80 cal" hints. */
export function effectOf(c: Customizable, sel: Selection, groupId: string, value: string | number): Nutrients {
  const before = compute(c, sel).nutrients;
  const after = compute(c, applyChange(c, sel, groupId, value)).nutrients;
  return sub(after, before);
}

export type Adjustment = { groupId: string; value: string | number; label: string; delta: Nutrients; why: string };
export type FitPlan = {
  id: string;
  title: string;
  changes: Adjustment[];
  selection: Selection;
  computed: Computed;
  fits: boolean;
};

/** Every single change that lowers calories, with a plain reason. */
export function reducingChanges(c: Customizable, sel: Selection): Adjustment[] {
  const base = compute(c, sel).nutrients;
  const out: Adjustment[] = [];
  for (const g of c.groups) {
    if (!groupVisible(g, sel)) continue;
    const candidates: (string | number)[] = [];
    if (g.kind === 'count') {
      const cur = num(sel[g.id], num(g.defaults, 0));
      for (let n = cur - 1; n >= (g.min ?? 0); n--) candidates.push(n);
    } else if (g.kind === 'toggle') {
      for (const o of g.options) if (ids(sel[g.id]).includes(o.id) && o.nutrients) candidates.push(o.id);
    } else {
      const cur = ids(sel[g.id])[0];
      for (const o of g.options) if (o.id !== cur && optionAvailable(o)) candidates.push(o.id);
    }
    for (const v of candidates) {
      const next = applyChange(c, sel, g.id, v);
      const after = compute(c, next).nutrients;
      const delta = sub(after, base);
      if (delta.calories >= -5) continue;
      out.push({ groupId: g.id, value: v, label: changeLabel(g, v), delta, why: whyText(g, delta) });
    }
  }
  return out.sort((a, b) => a.delta.calories - b.delta.calories);
}

function changeLabel(g: ModGroup, v: string | number) {
  if (g.kind === 'count') return `${v} ${g.unitLabel ?? 'item'}${v === 1 ? '' : 's'}`;
  const o = g.options.find((x) => x.id === v);
  if (g.kind === 'toggle') return `No ${o?.label.toLowerCase() ?? v}`;
  return o?.label ?? String(v);
}

function whyText(g: ModGroup, d: Nutrients) {
  const saved = `Saves ${Math.abs(Math.round(d.calories))} cal`;
  const fat = d.fat <= -3 ? ` and ${Math.abs(Math.round(d.fat))}g fat` : '';
  const carbs = !fat && d.carbs <= -8 ? ` and ${Math.abs(Math.round(d.carbs))}g carbs` : '';
  const protein = d.protein <= -5 ? `. You’d lose ${Math.abs(Math.round(d.protein))}g protein` : '';
  const scope = g.kind === 'portion' ? ' by eating less of it' : '';
  return `${saved}${fat}${carbs}${scope}${protein}.`;
}

/**
 * Smallest set of changes that makes the meal fit.
 * Prefers: fewest changes → keeps the most protein → closest to the original.
 * Restaurant-offered changes are tried before eating a smaller portion.
 */
export function makeItFit(c: Customizable, sel: Selection, left: Budget, max = 3): FitPlan[] {
  const start = compute(c, sel);
  if (fits(left, start.nutrients)) return [];
  const plans: FitPlan[] = [];
  const seen = new Set<string>();
  const key = (s: Selection) =>
    JSON.stringify(
      Object.keys(s)
        .sort()
        .map((k) => [k, s[k]]),
    );

  type Node = { sel: Selection; changes: Adjustment[] };
  let frontier: Node[] = [{ sel, changes: [] }];
  for (let depth = 1; depth <= 3 && plans.length < max; depth++) {
    const next: Node[] = [];
    for (const node of frontier) {
      const used = new Set(node.changes.map((ch) => ch.groupId));
      for (const ch of reducingChanges(c, node.sel)) {
        const g = c.groups.find((x) => x.id === ch.groupId)!;
        if (used.has(ch.groupId) && g.kind !== 'toggle') continue;
        const s2 = applyChange(c, node.sel, ch.groupId, ch.value);
        const k = key(s2);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ sel: s2, changes: [...node.changes, ch] });
      }
    }
    const scored = next
      .map((n) => ({ n, comp: compute(c, n.sel) }))
      .filter((x) => fits(left, x.comp.nutrients))
      .sort((a, b) => {
        const portion = (n: Node) => n.changes.filter((ch) => c.groups.find((g) => g.id === ch.groupId)?.kind === 'portion').length;
        return portion(a.n) - portion(b.n) || b.comp.nutrients.protein - a.comp.nutrients.protein || b.comp.nutrients.calories - a.comp.nutrients.calories;
      });
    for (const { n, comp } of scored) {
      if (plans.length >= max) break;
      const sig = n.changes
        .map((x) => `${x.groupId}`)
        .sort()
        .join('|');
      if (
        plans.some(
          (p) =>
            p.changes
              .map((x) => x.groupId)
              .sort()
              .join('|') === sig,
        )
      )
        continue;
      plans.push({ id: key(n.sel), title: n.changes.map((x) => x.label).join(' + '), changes: n.changes, selection: n.sel, computed: comp, fits: true });
    }
    frontier = next.sort((a, b) => compute(c, a.sel).nutrients.calories - compute(c, b.sel).nutrients.calories).slice(0, 25);
  }
  return plans;
}

export { describeDelta };
