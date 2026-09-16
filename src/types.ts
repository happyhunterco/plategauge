export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Source = 'search' | 'text' | 'photo' | 'barcode' | 'crave' | 'menu' | 'recipe' | 'quick';

export type Macros = { calories: number; protein: number; carbs: number; fat: number };

/** A food waiting to be confirmed on the review sheet. Macros are per 1 serving. */
export type Draft = Macros & {
  key: string;
  name: string;
  brand?: string;
  serving: string;
  qty: number;
  source: Source;
};

export type Entry = Draft & { id: string; date: string; meal: Meal; createdAt: number };

export type Profile = {
  sex: 'male' | 'female';
  age: number;
  heightIn: number;
  weightLb: number;
  targetLb: number;
  activity: 1.2 | 1.375 | 1.55 | 1.725;
  goal: 'lose' | 'maintain' | 'gain';
};

export type Goals = Macros;
export type WeighIn = { date: string; lb: number };

export type Idea = Macros & {
  name: string;
  serving: string;
  note: string;
  where?: string;
};

export type Recipe = Macros & {
  title: string;
  minutes: number;
  servings: number;
  ingredients: string[];
  steps: string[];
  missing?: string[];
};
