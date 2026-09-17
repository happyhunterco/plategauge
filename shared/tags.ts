import type { FoodCategory, FoodItem } from './food';
import { norm } from './restaurants';

/** Word → category. Order matters: more specific phrases first. */
const CATEGORY_WORDS: [RegExp, FoodCategory][] = [
  [/\b(frozen custard|custard|ice cream|concrete mixer|blizzard|frosty|sundae|shake|milkshake|gelato|froyo|popsicle)\b/, 'frozen_dessert'],
  [/\b(butter ?burger|cheese ?burger|hamburger|burger|whopper|big mac|double double|shackburger|slider)s?\b/, 'burger'],
  [/\b(pizza|slice of pizza|pepperoni|calzone)\b/, 'pizza'],
  [/\b(burrito|crunchwrap|chimichanga)s?\b/, 'burrito'],
  [/\b(taco|quesadilla|nachos)s?\b/, 'taco'],
  [/\b(burrito bowl|poke|grain bowl|rice bowl|acai bowl|bowl)s?\b/, 'bowl'],
  [/\b(lasagna|spaghetti|alfredo|fettuccine|pasta|mac and cheese|mac n cheese|ravioli|penne|carbonara|gnocchi)\b/, 'pasta'],
  [/\b(sandwich|sub|hoagie|footlong|wrap|panini|blt|cheesesteak|grilled cheese)s?\b/, 'sandwich'],
  [/\b(salad|caesar)s?\b/, 'salad'],
  [/\b(pancake|waffle|french toast|omelet|omelette|breakfast|bagel|egg bites|scrambled eggs|hash ?browns?|oatmeal)s?\b/, 'breakfast'],
  [/\b(smoothie|protein shake)s?\b/, 'smoothie'],
  [/\b(fries|tots|onion rings|curds|cheese curds)\b/, 'fries'],
  [/\b(nuggets|tenders|chicken fingers|wings|fried chicken|chicken strips|chicken sandwich|chicken)\b/, 'chicken'],
  [/\b(cookie|cake|brownie|donut|doughnut|pie|cupcake|candy|chocolate bar|cinnamon roll)s?\b/, 'dessert'],
  [/\b(chips|pretzels|popcorn|crackers|trail mix|nuts|jerky|protein bar|granola bar)\b/, 'snack'],
  [/\b(soup|chili|zuppa|minestrone|ramen|pho)\b/, 'soup'],
  [/\b(soda|coffee|latte|tea|juice|frappuccino|energy drink|lemonade)s?\b/, 'drink'],
  [/\b(salmon|shrimp|fish|tuna|sushi|crab)\b/, 'seafood'],
  [/\b(yogurt|cottage cheese|milk|cheese stick)\b/, 'dairy'],
  [/\b(apple|banana|berries|grapes|orange|fruit|vegetables|veggies)\b/, 'produce'],
];

export function categoryOf(text: string): FoodCategory | null {
  const t = norm(text);
  for (const [re, c] of CATEGORY_WORDS) if (re.test(t)) return c;
  return null;
}

export const FLAVORS = ['sweet', 'salty', 'savory', 'spicy', 'sour', 'cheesy', 'chocolate', 'fruity', 'smoky'] as const;
export const TEXTURES = ['crunchy', 'creamy', 'chewy', 'crispy', 'soft', 'juicy', 'fluffy'] as const;
export type Flavor = (typeof FLAVORS)[number];
export type Texture = (typeof TEXTURES)[number];
export type Temperature = 'hot' | 'cold';

type Profile = { flavors: Flavor[]; textures: Texture[]; temperature?: Temperature };

const CATEGORY_PROFILE: Partial<Record<FoodCategory, Profile>> = {
  burger: { flavors: ['savory', 'salty'], textures: ['juicy', 'soft'], temperature: 'hot' },
  pizza: { flavors: ['savory', 'cheesy', 'salty'], textures: ['chewy', 'crispy'], temperature: 'hot' },
  burrito: { flavors: ['savory'], textures: ['soft'], temperature: 'hot' },
  taco: { flavors: ['savory', 'spicy'], textures: ['crunchy'], temperature: 'hot' },
  bowl: { flavors: ['savory'], textures: ['soft'], temperature: 'hot' },
  sandwich: { flavors: ['savory'], textures: ['soft'] },
  pasta: { flavors: ['savory', 'cheesy'], textures: ['soft', 'creamy'], temperature: 'hot' },
  salad: { flavors: ['savory'], textures: ['crunchy'], temperature: 'cold' },
  breakfast: { flavors: ['savory'], textures: ['soft', 'fluffy'], temperature: 'hot' },
  smoothie: { flavors: ['sweet', 'fruity'], textures: ['creamy'], temperature: 'cold' },
  chicken: { flavors: ['savory', 'salty'], textures: ['crispy', 'juicy'], temperature: 'hot' },
  fries: { flavors: ['salty'], textures: ['crispy', 'crunchy'], temperature: 'hot' },
  dessert: { flavors: ['sweet'], textures: ['soft', 'chewy'] },
  frozen_dessert: { flavors: ['sweet'], textures: ['creamy'], temperature: 'cold' },
  snack: { flavors: ['salty'], textures: ['crunchy'] },
  soup: { flavors: ['savory'], textures: ['soft'], temperature: 'hot' },
  seafood: { flavors: ['savory'], textures: ['soft'], temperature: 'hot' },
  dairy: { flavors: ['sweet'], textures: ['creamy'], temperature: 'cold' },
  produce: { flavors: ['sweet', 'fruity'], textures: ['juicy', 'crunchy'], temperature: 'cold' },
};

const WORD_TAGS: [RegExp, (Flavor | Texture | Temperature)[]][] = [
  [/\b(chips|pretzel|popcorn|cracker|crisps|tortilla chips|nuts|almonds|rice cake)s?\b/, ['salty', 'crunchy']],
  [/\b(pickle|olive)s?\b/, ['salty', 'sour']],
  [/\b(jerky)\b/, ['salty', 'savory', 'chewy', 'smoky']],
  [/\b(chocolate|cocoa|brownie|oreo|fudge)\b/, ['sweet', 'chocolate']],
  [/\b(cheese|cheesy|queso|mac)\b/, ['cheesy']],
  [/\b(spicy|hot sauce|jalapeno|sriracha|buffalo|nashville|chili)\b/, ['spicy']],
  [/\b(crispy|fried|tempura|breaded)\b/, ['crispy', 'crunchy']],
  [/\b(yogurt|pudding|custard|ice cream|shake|smoothie)\b/, ['creamy', 'sweet', 'cold']],
  [/\b(frozen|iced|cold)\b/, ['cold']],
  [/\b(berry|berries|strawberr|mango|apple|grape|fruit)/, ['fruity', 'sweet']],
  [/\b(bbq|smoked|bacon)\b/, ['smoky', 'savory']],
  [/\b(gummy|gummies|licorice|taffy)\b/, ['sweet', 'chewy']],
  [/\b(sour)\b/, ['sour']],
];

export type TagSet = { flavors: Set<string>; textures: Set<string>; temperature?: Temperature };

export function tagsFor(item: Pick<FoodItem, 'name' | 'category' | 'tags'>): TagSet {
  const cat = item.category ?? categoryOf(item.name);
  const p = (cat && CATEGORY_PROFILE[cat]) || { flavors: [], textures: [] };
  const flavors = new Set<string>(p.flavors);
  const textures = new Set<string>(p.textures);
  let temperature = p.temperature;
  const t = norm(item.name);
  for (const [re, tags] of WORD_TAGS) {
    if (!re.test(t)) continue;
    for (const tag of tags) {
      if (tag === 'hot' || tag === 'cold') temperature = tag;
      else if ((FLAVORS as readonly string[]).includes(tag)) flavors.add(tag);
      else textures.add(tag);
    }
  }
  for (const tag of item.tags ?? []) {
    if ((FLAVORS as readonly string[]).includes(tag)) flavors.add(tag);
    if ((TEXTURES as readonly string[]).includes(tag)) textures.add(tag);
  }
  return { flavors, textures, temperature };
}

/** Category neighbors for "similar" suggestions (a burger craving never becomes yogurt). */
export const NEAR: Partial<Record<FoodCategory, FoodCategory[]>> = {
  burger: ['sandwich', 'chicken'],
  sandwich: ['burger', 'chicken'],
  chicken: ['sandwich', 'burger'],
  pizza: ['pasta', 'sandwich'],
  pasta: ['pizza', 'entree'],
  burrito: ['taco', 'bowl'],
  taco: ['burrito', 'bowl'],
  bowl: ['burrito', 'salad'],
  frozen_dessert: ['dessert', 'smoothie'],
  dessert: ['frozen_dessert'],
  fries: ['snack'],
  snack: ['fries'],
  smoothie: ['frozen_dessert', 'dairy'],
  soup: ['pasta', 'entree'],
  breakfast: ['sandwich'],
  salad: ['bowl'],
};
