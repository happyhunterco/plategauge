/**
 * Shared food model. Used by the app, the Netlify functions and the tests.
 * Everything a provider returns is normalized into FoodItem.
 */

export type Nutrients = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null; // mg
};

/** How much a number can be trusted. Shown on every result. */
export type Quality =
  | 'verified_restaurant' // restaurant-published data via a provider
  | 'verified_packaged' // label data (barcode / branded database)
  | 'database' // generic reference database (USDA)
  | 'user' // entered or confirmed by the user
  | 'estimate' // calculated by PlateGauge (templates, modifiers, AI text)
  | 'photo_estimate' // AI from a photo
  | 'development'; // local test fixture, never shipped as real data

export type ProviderId = 'usda' | 'off' | 'nutritionix' | 'fatsecret' | 'user' | 'ai' | 'template' | 'dev';

export type SourceInfo = {
  provider: ProviderId;
  id?: string;
  url?: string;
  updatedAt?: string;
  quality: Quality;
  confidence?: 'high' | 'medium' | 'low';
  /** calorie range for estimates (photo / AI) */
  range?: { low: number; high: number };
};

export type FoodCategory =
  | 'burger'
  | 'pizza'
  | 'burrito'
  | 'taco'
  | 'bowl'
  | 'sandwich'
  | 'pasta'
  | 'salad'
  | 'breakfast'
  | 'smoothie'
  | 'chicken'
  | 'fries'
  | 'dessert'
  | 'frozen_dessert'
  | 'snack'
  | 'drink'
  | 'soup'
  | 'seafood'
  | 'entree'
  | 'side'
  | 'produce'
  | 'dairy'
  | 'other';

export type FoodKind = 'restaurant' | 'branded' | 'generic' | 'user' | 'recipe';

export type Serving = {
  description: string; // "1 burger", "2 tbsp (32 g)"
  quantity: number;
  unit: string;
  grams?: number | null;
};

export type FoodItem = {
  id: string; // provider-prefixed, stable: "usda:12345", "off:0123", "user:abc"
  name: string;
  brand?: string | null;
  restaurant?: string | null; // canonical restaurant id when kind === 'restaurant'
  category?: FoodCategory | null;
  kind: FoodKind;
  serving: Serving;
  nutrients: Nutrients;
  barcode?: string | null;
  image?: string | null;
  source: SourceInfo;
  tags?: string[];
};

export type SearchFilters = {
  kind?: FoodKind | 'all';
  brand?: string;
};

export type SearchPage = {
  items: FoodItem[];
  page: number;
  hasMore: boolean;
  providers: { id: ProviderId; ok: boolean; error?: string }[];
};

/* ---------------- customization ---------------- */

export type ModOption = {
  id: string;
  label: string;
  /**
   * single: delta vs the group's default option (default option = zero delta)
   * toggle: the component's own nutrients (added when turned on, removed when turned off)
   * count:  nutrients for ONE unit
   * portion: unused (see multiplier)
   * null = nutrition unknown → option is shown but can't be selected. Never guessed.
   */
  nutrients: Nutrients | null;
  quality: Quality;
  multiplier?: number; // portion groups
  note?: string;
  /** Other items this option swaps in (variant resolution) */
  variantOf?: string;
};

export type ModGroup = {
  id: string;
  label: string;
  kind: 'single' | 'toggle' | 'count' | 'portion';
  /** item: scaled by the portion multiplier. meal: sides/drinks, never scaled. */
  scope: 'item' | 'meal';
  options: ModOption[];
  /** single/portion: [id]; toggle: ids on by default; count: number */
  defaults: string[] | number;
  min?: number;
  max?: number;
  unitLabel?: string; // count groups: "breadstick"
  /** Only shown when another group has one of these option ids selected */
  requires?: { group: string; anyOf: string[] };
  help?: string;
};

export type Customizable = {
  item: FoodItem; // nutrients = default configuration
  title: string; // "Build your burger"
  groups: ModGroup[];
  /** e.g. "Options Culver's offers. Topping values are estimates." */
  note?: string;
};

export type Selection = Record<string, string[] | number>;

export const QUALITY_LABEL: Record<Quality, string> = {
  verified_restaurant: 'Restaurant data',
  verified_packaged: 'Label data',
  database: 'Database',
  user: 'Your entry',
  estimate: 'Estimate',
  photo_estimate: 'Photo estimate',
  development: 'Development data',
};

const QUALITY_RANK: Record<Quality, number> = {
  verified_restaurant: 6,
  verified_packaged: 6,
  database: 5,
  user: 4,
  estimate: 2,
  photo_estimate: 1,
  development: 0,
};

export const qualityRank = (q: Quality) => QUALITY_RANK[q];
export const worstQuality = (qs: Quality[]): Quality => qs.reduce((w, q) => (QUALITY_RANK[q] < QUALITY_RANK[w] ? q : w), qs[0] ?? 'estimate');
export const isEstimate = (q: Quality) => q === 'estimate' || q === 'photo_estimate';
