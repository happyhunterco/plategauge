/**
 * PlateGauge Label Score (0–10) for packaged foods.
 * Built only from open data (Open Food Facts): Nutri-Score, NOVA processing group, additives.
 *   Nutrition  up to 6  (Nutri-Score A=6 … E=1)
 *   Processing up to 2  (NOVA 1=2 … 4=0.5)
 *   Additives  up to 2  (none=2 … 5+=0.5, minus 0.5 if any are ones many shoppers avoid)
 * When a part is missing, the score is scaled to the parts we have and says so.
 */

export type Per100g = {
  energyKcal?: number | null;
  sugars?: number | null;
  saturatedFat?: number | null;
  sodiumMg?: number | null;
  fiber?: number | null;
  protein?: number | null;
};

export type ProductSignals = {
  nutriScore?: string | null; // a–e from the database
  nova?: number | null; // 1–4
  additives?: string[] | null; // e.g. ["en:e330", "en:e250"]
  per100g?: Per100g | null;
  isBeverage?: boolean;
};

export type ScorePart = { id: 'nutrition' | 'processing' | 'additives'; label: string; points: number; max: number; detail: string };
export type LabelScore = {
  score: number | null; // null when there's too little data
  grade: string | null; // nutri-score letter used
  gradeEstimated: boolean;
  parts: ScorePart[];
  notes: string[]; // neutral observations: "Higher sodium"
  missing: string[];
};

/** Additives commonly avoided by shoppers. Informational only, not a health claim. */
const WATCHED: Record<string, string> = {
  'en:e250': 'sodium nitrite',
  'en:e251': 'sodium nitrate',
  'en:e171': 'titanium dioxide',
  'en:e320': 'BHA',
  'en:e321': 'BHT',
  'en:e102': 'tartrazine',
  'en:e110': 'sunset yellow',
  'en:e129': 'allura red',
  'en:e951': 'aspartame',
  'en:e950': 'acesulfame K',
  'en:e955': 'sucralose',
  'en:e621': 'MSG',
};

const gradePoints: Record<string, number> = { a: 6, b: 5, c: 3.5, d: 2, e: 1 };

/** Simplified Nutri-Score (FSA points, no fruit/veg share). Used only when the database has no grade. */
export function estimateNutriScore(p: Per100g, beverage = false): string | null {
  if (p.energyKcal == null || p.sugars == null || p.saturatedFat == null || p.sodiumMg == null) return null;
  const kj = p.energyKcal * 4.184;
  const step = (v: number, thresholds: number[]) => thresholds.filter((t) => v > t).length;
  const neg =
    step(kj, [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]) +
    step(p.sugars, [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]) +
    step(p.saturatedFat, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) +
    step(p.sodiumMg, [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]);
  const fiber = step(p.fiber ?? 0, [0.9, 1.9, 2.8, 3.7, 4.7]);
  const protein = step(p.protein ?? 0, [1.6, 3.2, 4.8, 6.4, 8]);
  const total = neg >= 11 ? neg - fiber : neg - fiber - protein;
  if (beverage) return total <= 1 ? 'b' : total <= 5 ? 'c' : total <= 9 ? 'd' : 'e';
  return total <= -1 ? 'a' : total <= 2 ? 'b' : total <= 10 ? 'c' : total <= 18 ? 'd' : 'e';
}

export function labelScore(s: ProductSignals): LabelScore {
  const parts: ScorePart[] = [];
  const missing: string[] = [];
  const notes: string[] = [];

  let grade = s.nutriScore && gradePoints[s.nutriScore.toLowerCase()] ? s.nutriScore.toLowerCase() : null;
  let gradeEstimated = false;
  if (!grade && s.per100g) {
    grade = estimateNutriScore(s.per100g, s.isBeverage);
    gradeEstimated = !!grade;
  }
  if (grade) {
    parts.push({
      id: 'nutrition',
      label: 'Nutrition',
      points: gradePoints[grade],
      max: 6,
      detail: `Nutri-Score ${grade.toUpperCase()}${gradeEstimated ? ' (estimated from the label)' : ''}`,
    });
  } else missing.push('Nutrition grade');

  if (s.nova && s.nova >= 1 && s.nova <= 4) {
    const pts = { 1: 2, 2: 1.5, 3: 1, 4: 0.5 }[s.nova as 1 | 2 | 3 | 4];
    const words = { 1: 'Unprocessed or minimally processed', 2: 'Cooking ingredient', 3: 'Processed', 4: 'Ultra-processed' }[s.nova as 1 | 2 | 3 | 4];
    parts.push({ id: 'processing', label: 'Processing', points: pts, max: 2, detail: `${words} (NOVA ${s.nova})` });
  } else missing.push('Processing level');

  if (Array.isArray(s.additives)) {
    const n = s.additives.length;
    const watched = s.additives.map((a) => WATCHED[a.toLowerCase()]).filter(Boolean);
    let pts = n === 0 ? 2 : n <= 2 ? 1.5 : n <= 4 ? 1 : 0.5;
    if (watched.length) pts = Math.max(0, pts - 0.5);
    parts.push({
      id: 'additives',
      label: 'Additives',
      points: pts,
      max: 2,
      detail: n === 0 ? 'No additives listed' : `${n} additive${n === 1 ? '' : 's'}${watched.length ? `, including ${watched.join(', ')}` : ''}`,
    });
  } else missing.push('Additives list');

  const p = s.per100g;
  if (p) {
    if ((p.sodiumMg ?? 0) > 600) notes.push('Higher sodium');
    if ((p.sugars ?? 0) > 22.5) notes.push('Higher sugar');
    if ((p.saturatedFat ?? 0) > 5) notes.push('Higher saturated fat');
    if ((p.protein ?? 0) >= 10) notes.push('Good protein');
    if ((p.fiber ?? 0) >= 6) notes.push('Good fiber');
  }

  if (!parts.some((x) => x.id === 'nutrition')) {
    return { score: null, grade: null, gradeEstimated: false, parts, notes, missing };
  }
  const got = parts.reduce((a, x) => a + x.points, 0);
  const max = parts.reduce((a, x) => a + x.max, 0);
  const score = Math.round((got / max) * 10 * 2) / 2;
  return { score, grade, gradeEstimated, parts, notes, missing };
}

export const scoreWord = (s: number) => (s >= 8 ? 'Great' : s >= 6 ? 'Good' : s >= 4 ? 'Fair' : 'Limited');
