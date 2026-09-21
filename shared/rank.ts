import type { FoodItem } from './food';
import { qualityRank } from './food';
import type { Intent } from './intent';
import { fits, type Budget } from './nutrients';
import { categoryOf, NEAR, tagsFor } from './tags';
import { norm } from './restaurants';

export type Prefs = { restrictions: string[]; allergies: string[] };

const MEAT =
  /\b(beef|burger|butterburger|cheeseburger|whopper|chicken|pork|bacon|sausage|pepperoni|ham|turkey|steak|meatball|lasagna|brisket|carnitas|barbacoa|chorizo|salami|jerky|nuggets|tenders|wings)\b/;
const SEAFOOD = /\b(fish|shrimp|tuna|salmon|crab|lobster|scallop|sushi)\b/;
const DAIRY = /\b(cheese|cheesy|milk|cream|yogurt|custard|butter|butterburger|alfredo|shake|ice cream|frosty|blizzard|queso|latte|mozzarella|parmesan)\b/;
const GLUTEN =
  /\b(bun|bread|breadstick|burger|butterburger|cheeseburger|pasta|pizza|tortilla|burrito|lasagna|wheat|cracker|pretzel|bagel|sandwich|sub|wrap|pancake|waffle|cookie|cake|donut|breaded|nuggets|tenders)\b/;
const EGG = /\b(egg|eggs|omelet|mayo|mayonnaise|custard)\b/;
const NUTS = /\b(almond|cashew|walnut|pecan|pistachio|hazelnut|macadamia)s?\b/;
const PEANUT = /\bpeanut/;
const SHELLFISH = /\b(shrimp|crab|lobster|scallop|clam|mussel|oyster)s?\b/;
const PORK = /\b(pork|bacon|ham|pepperoni|sausage|salami|chorizo|carnitas)\b/;

/**
 * Name-based screening only. It removes obvious conflicts; it can't prove a food is safe,
 * so the app always says to confirm ingredients for allergies.
 */
export function conflict(item: Pick<FoodItem, 'name'>, prefs: Prefs): string | null {
  const t = norm(item.name);
  const veggie = /\b(veggie|vegetarian|plant based|impossible|beyond|black bean)\b/.test(t);
  for (const r of prefs.restrictions.map((x) => x.toLowerCase())) {
    if ((r === 'vegetarian' || r === 'vegan') && !veggie && (MEAT.test(t) || SEAFOOD.test(t))) return `Not ${r}`;
    if (r === 'vegan' && (DAIRY.test(t) || EGG.test(t) || /\bhoney\b/.test(t))) return 'Not vegan';
    if (r === 'pescatarian' && !veggie && MEAT.test(t)) return 'Not pescatarian';
    if (r === 'gluten-free' && GLUTEN.test(t) && !/gluten free/.test(t)) return 'Likely contains gluten';
    if (r === 'dairy-free' && DAIRY.test(t) && !/dairy free/.test(t)) return 'Likely contains dairy';
    if ((r === 'halal' || r === 'kosher') && PORK.test(t)) return `Not ${r}`;
  }
  for (const a of prefs.allergies.map((x) => x.toLowerCase().trim()).filter(Boolean)) {
    const map: Record<string, RegExp> = {
      dairy: DAIRY,
      milk: DAIRY,
      gluten: GLUTEN,
      wheat: GLUTEN,
      egg: EGG,
      eggs: EGG,
      'tree nuts': NUTS,
      nuts: NUTS,
      peanut: PEANUT,
      peanuts: PEANUT,
      shellfish: SHELLFISH,
      fish: SEAFOOD,
    };
    const re = map[a] ?? new RegExp(`\\b${a.replace(/[^a-z ]/g, '')}`);
    if (re.test(t)) return `May contain ${a}`;
  }
  return null;
}

const splitCompound = (s: string) =>
  norm(s)
    .replace(/cheeseburger/g, 'cheese burger')
    .replace(/butterburger/g, 'butter burger')
    .replace(/hamburger/g, 'burger')
    .replace(/hashbrowns?/g, 'hash brown')
    .replace(/milkshake/g, 'milk shake');

const SEARCH_STOP = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'the', 'to', 'with']);

const stem = (word: string) => {
  const irregular: Record<string, string> = { cookies: 'cookie', fries: 'fry', leaves: 'leaf', knives: 'knife' };
  if (irregular[word]) return irregular[word];
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ches|shes|sses|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
};

export function searchWords(text: string): string[] {
  return splitCompound(text)
    .split(' ')
    .map(stem)
    .filter((word) => word.length > 1 && !SEARCH_STOP.has(word));
}

export function nameOverlap(query: string, name: string): number {
  const qRaw = norm(query);
  const nRaw = norm(name);
  // Exact substring match is the strongest signal: "cheeseburger" inside
  // "ButterBurger Cheese Double" should always beat "cheese" inside "Broccoli Cheese Soup."
  if (nRaw.includes(qRaw) || qRaw.includes(nRaw)) return 1;
  const q = splitCompound(query)
    .split(' ')
    .filter((w) => w.length > 1);
  if (!q.length) return 0;
  const n = new Set(splitCompound(name).split(' '));
  const hit = q.filter((w) => n.has(w) || n.has(w.replace(/s$/, '')) || n.has(`${w}s`)).length;
  // Bonus: if the original unsplit query matches as a substring of the name (e.g.
  // "burger" inside "ButterBurger"), rank much higher than a coincidental word overlap.
  const subBonus = nRaw.includes(qRaw.replace(/\s+/g, '')) ? 0.3 : 0;
  return Math.min(hit / q.length + subBonus, 1);
}

/**
 * Relevance for every text-search surface. A matching food category is more
 * important than one shared word, so "cheeseburger" cannot rank a cheese soup
 * above a burger. The score is intentionally independent of nutrition goals.
 */
export function foodSearchScore(query: string, item: Pick<FoodItem, 'name' | 'brand' | 'restaurant' | 'category'>): number {
  const q = searchWords(query);
  if (!q.length) return 0;
  const name = searchWords(item.name);
  const brand = searchWords(item.brand ?? '');
  const all = new Set([...name, ...brand]);
  const hits = q.filter((word) => all.has(word)).length;
  const coverage = hits / q.length;
  const precision = hits / Math.max(name.length, 1);
  let score = coverage * 1_000 + precision * 180;

  const queryPhrase = splitCompound(query);
  const namePhrase = splitCompound(item.name);
  if (namePhrase === queryPhrase) score += 1_500;
  else if (namePhrase.includes(queryPhrase) || queryPhrase.includes(namePhrase)) score += 500;

  const wanted = categoryOf(query);
  const actual = item.category ?? categoryOf(item.name);
  if (wanted && actual === wanted) score += 1_200;
  else if (wanted && actual && NEAR[wanted]?.includes(actual)) score += 150;
  else if (wanted && actual) score -= 1_000;

  const queryText = ` ${norm(query)} `;
  const itemText = ` ${norm(item.name)} `;
  if (wanted === 'burger' && !/\b(veggie|vegetarian|plant|impossible|beyond)\b/.test(queryText) && /\b(veggie|vegetarian|plant|impossible|beyond)\b/.test(itemText)) {
    score -= 900;
  }

  return Math.round(score);
}

export type Scored = { item: FoodItem; score: number; reasons: string[]; fitsAsIs: boolean };

/** A gentle wellness signal used only to reorder relevant choices, never to moralize food. */
export function wellnessScore(item: FoodItem): number {
  const n = item.nutrients;
  const calories = Math.max(n.calories, 1);
  const proteinDensity = (n.protein / calories) * 100;
  let score = Math.min(proteinDensity, 12) * 35 + Math.min(n.fiber ?? 0, 10) * 25;
  if (n.sodium != null) score -= Math.max(0, n.sodium - 700) * 0.12;
  if (n.sugar != null) score -= Math.max(0, n.sugar - 18) * 8;
  if (calories <= 700) score += 120;
  if (calories > 1_000) score -= 180;
  return Math.round(Math.max(-300, Math.min(score, 700)));
}

/**
 * Intent comes first. Fit and protein can reorder close matches but can never lift an
 * unrelated food above what the person asked for.
 */
export function scoreCandidate(intent: Intent, item: FoodItem, left: Budget, opts: { exact?: boolean; exactFits?: boolean } = {}): Scored {
  const reasons: string[] = [];
  let s = 0;
  const cat = item.category ?? categoryOf(item.name);
  if (opts.exact) {
    s += 100_000;
    reasons.push('What you asked for');
  }
  if (intent.restaurantId && item.restaurant === intent.restaurantId) {
    s += 20_000;
    reasons.push(`From ${intent.restaurantName}`);
  }
  if (intent.category && cat === intent.category) {
    s += 8_000;
    reasons.push('Same kind of food');
  } else if (intent.category && cat && NEAR[intent.category]?.includes(cat)) {
    s += 3_000;
    reasons.push('Close to what you want');
  }
  if (intent.food) s += Math.round(nameOverlap(intent.food, item.name) * 2_000);

  const tags = tagsFor(item);
  const moods = [...intent.flavors, ...intent.textures];
  const matched = moods.filter((m) => tags.flavors.has(m) || tags.textures.has(m));
  s += matched.length * 1_200;
  if (moods.length && matched.length === moods.length) s += 1_000;
  if (matched.length) reasons.push(matched.join(' and '));
  if (intent.temperature) s += tags.temperature === intent.temperature ? 800 : tags.temperature ? -800 : 0;

  if (intent.size && /\b(small|medium|large|regular)\b/.test(item.name.toLowerCase())) {
    s += item.name.toLowerCase().includes(intent.size) ? 300 : -150;
  }

  const fitsAsIs = fits(left, item.nutrients);
  if (fitsAsIs) {
    s += 500;
    reasons.push('Fits what’s left');
  } else if (item.nutrients.calories > 0) {
    s += Math.round((500 * Math.max(0, left.calories)) / item.nutrients.calories);
  }
  if (left.protein > 5) s += Math.round(Math.min(item.nutrients.protein / left.protein, 1) * 250);
  s += wellnessScore(item);
  s += qualityRank(item.source.quality) * 30;
  return { item, score: s, reasons, fitsAsIs };
}

export function rankCandidates(intent: Intent, items: FoodItem[], left: Budget, prefs: Prefs, exclude: Set<string> = new Set()) {
  const seen = new Set<string>();
  const out: Scored[] = [];
  const blocked: { item: FoodItem; reason: string }[] = [];
  for (const it of items) {
    const key = `${norm(it.brand ?? it.restaurant ?? '')}|${norm(it.name)}`;
    if (exclude.has(it.id) || exclude.has(key) || seen.has(key)) continue;
    seen.add(key);
    const why = conflict(it, prefs);
    if (why) {
      blocked.push({ item: it, reason: why });
      continue;
    }
    out.push(scoreCandidate(intent, it, left));
  }
  out.sort((a, b) => b.score - a.score);
  return { ranked: out, blocked };
}

/** Similar results must stay on-topic when the user asked for a specific food. */
export function relevant(intent: Intent, s: Scored): boolean {
  if (!intent.specific) return true;
  const cat = s.item.category ?? categoryOf(s.item.name);
  if (!intent.category) return intent.restaurantId ? s.item.restaurant === intent.restaurantId : true;
  return cat === intent.category || !!(cat && NEAR[intent.category]?.includes(cat));
}
