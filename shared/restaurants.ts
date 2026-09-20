import type { FoodCategory } from './food';
import type { RefKey } from './reference';

/**
 * Restaurant registry: names people type, plus the customizations each restaurant
 * actually offers. Nutrition is never stored here — `query` names are looked up in the
 * nutrition providers at runtime, `ref` components are labeled estimates.
 * If a query can't be resolved, the option is shown as unavailable rather than guessed.
 */

export type ComponentSource = { query: string } | { ref: RefKey } | { zero: true };

export type RuleOption = { id: string; label: string; source: ComponentSource };

export type RuleGroup = {
  id: string;
  label: string;
  kind: 'variant' | 'toggle' | 'count' | 'side';
  scope: 'item' | 'meal';
  options: RuleOption[];
  defaultOn?: string[]; // toggle
  max?: number; // count
  unitLabel?: string; // count
  requires?: { group: string; anyOf: string[] };
  help?: string;
};

export type MenuRule = {
  match: RegExp;
  category: FoodCategory;
  title: string;
  /** Provider query for the exact item when the user didn't name a variant */
  baseQuery: string;
  /** Pick the variant option that best matches the user's words */
  pickVariant?: (words: string) => string | undefined;
  groups: RuleGroup[];
  note: string;
};

export type Restaurant = {
  id: string;
  name: string;
  aliases: string[];
  categories: FoodCategory[];
  popular: { label: string; words: string }[];
  menu?: MenuRule[];
};

const drinks: RuleGroup = {
  id: 'drink',
  label: 'Drink',
  kind: 'side',
  scope: 'meal',
  options: [
    { id: 'none', label: 'No drink', source: { zero: true } },
    { id: 'zero', label: 'Water or diet soda', source: { zero: true } },
    { id: 'soda', label: 'Regular soda (16 oz, est.)', source: { ref: 'soda_16' } },
  ],
};

const culversBurger: MenuRule = {
  match: /butter ?burger|cheese ?burger|burger/,
  category: 'burger',
  title: 'Build your ButterBurger',
  baseQuery: 'ButterBurger Cheese Single',
  pickVariant: (w) => {
    const cheese = !/\bno cheese\b|\bwithout cheese\b/.test(w) && /cheese/.test(w);
    const size = /triple|three patt/.test(w) ? 'triple' : /double|two patt|2 patt/.test(w) ? 'double' : 'single';
    return `${size}${cheese ? '_cheese' : ''}`;
  },
  groups: [
    {
      id: 'burger',
      label: 'Patties and cheese',
      kind: 'variant',
      scope: 'item',
      options: [
        { id: 'single', label: 'Single, no cheese', source: { query: 'ButterBurger Single' } },
        { id: 'single_cheese', label: 'Single with cheese', source: { query: 'ButterBurger Cheese Single' } },
        { id: 'double', label: 'Double, no cheese', source: { query: 'ButterBurger Double' } },
        { id: 'double_cheese', label: 'Double with cheese', source: { query: 'ButterBurger Cheese Double' } },
        { id: 'triple', label: 'Triple, no cheese', source: { query: 'ButterBurger Triple' } },
        { id: 'triple_cheese', label: 'Triple with cheese', source: { query: 'ButterBurger Cheese Triple' } },
      ],
    },
    {
      id: 'standard',
      label: 'Comes with (tap to remove)',
      kind: 'toggle',
      scope: 'item',
      options: [
        { id: 'pickles', label: 'Pickles', source: { ref: 'pickles' } },
        { id: 'onion', label: 'Onion', source: { ref: 'onion' } },
        { id: 'ketchup', label: 'Ketchup', source: { ref: 'ketchup_tbsp' } },
        { id: 'mustard', label: 'Mustard', source: { ref: 'mustard_tsp' } },
      ],
      defaultOn: ['pickles', 'onion', 'ketchup', 'mustard'],
      help: 'A regular ButterBurger comes with these. Values are estimates — remove any you don’t want for fewer calories.',
    },
    {
      id: 'toppings',
      label: 'Add (extra)',
      kind: 'toggle',
      scope: 'item',
      options: [
        { id: 'mayo', label: 'Mayo', source: { ref: 'mayo_tbsp' } },
        { id: 'lettuce', label: 'Lettuce', source: { ref: 'lettuce' } },
        { id: 'tomato', label: 'Tomato', source: { ref: 'tomato' } },
      ],
      defaultOn: [],
      help: 'Extras are estimates.',
    },
    {
      id: 'side',
      label: 'Side',
      kind: 'side',
      scope: 'meal',
      options: [
        { id: 'none', label: 'No side', source: { zero: true } },
        { id: 'fries_s', label: 'Crinkle Cut Fries, small', source: { query: 'Crinkle Cut Fries Small' } },
        { id: 'fries_r', label: 'Crinkle Cut Fries, regular', source: { query: 'Crinkle Cut Fries Regular' } },
        { id: 'fries_l', label: 'Crinkle Cut Fries, large', source: { query: 'Crinkle Cut Fries Large' } },
      ],
    },
    drinks,
  ],
  note: 'Burger sizes and fries use Culver’s nutrition. Toppings are estimates.',
};

const olivePasta: MenuRule = {
  match: /lasagna/,
  category: 'pasta',
  title: 'Customize your lasagna',
  baseQuery: 'Lasagna Classico',
  groups: [
    {
      id: 'soup_salad',
      label: 'Soup or salad',
      kind: 'side',
      scope: 'meal',
      options: [
        { id: 'none', label: 'Skip it', source: { zero: true } },
        { id: 'house_salad', label: 'Famous House Salad, no dressing', source: { query: 'Famous House Salad without Dressing' } },
        { id: 'zuppa', label: 'Zuppa Toscana', source: { query: 'Zuppa Toscana' } },
        { id: 'minestrone', label: 'Minestrone', source: { query: 'Minestrone' } },
        { id: 'fagioli', label: 'Pasta e Fagioli', source: { query: 'Pasta e Fagioli' } },
        { id: 'gnocchi', label: 'Chicken & Gnocchi', source: { query: 'Chicken Gnocchi Soup' } },
      ],
    },
    {
      id: 'dressing',
      label: 'Signature Italian dressing',
      kind: 'count',
      scope: 'meal',
      unitLabel: 'serving',
      max: 3,
      options: [{ id: 'italian', label: 'Signature Italian Dressing', source: { query: 'Signature Italian Dressing' } }],
      requires: { group: 'soup_salad', anyOf: ['house_salad'] },
      help: 'Salad comes dressed. One serving is typical.',
    },
    {
      id: 'breadsticks',
      label: 'Breadsticks',
      kind: 'count',
      scope: 'meal',
      unitLabel: 'breadstick',
      max: 6,
      options: [{ id: 'breadstick', label: 'Breadstick with garlic topping', source: { query: 'Breadstick with Garlic Topping' } }],
    },
    {
      id: 'extras',
      label: 'Extras',
      kind: 'toggle',
      scope: 'item',
      options: [{ id: 'parmesan', label: 'Grated parmesan', source: { ref: 'parmesan_tbsp' } }],
      defaultOn: [],
      help: 'Parmesan is an estimate.',
    },
    drinks,
  ],
  note: 'Entrée, soups, salad, dressing and breadsticks use Olive Garden nutrition when available.',
};

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'culvers',
    name: 'Culver’s',
    aliases: ['culvers', 'culver s', 'culver'],
    categories: ['burger', 'chicken', 'frozen_dessert', 'fries', 'sandwich'],
    popular: [
      { label: 'ButterBurger', words: 'butterburger cheese' },
      { label: 'Chicken tenders', words: 'chicken tenders' },
      { label: 'Custard', words: 'vanilla custard' },
    ],
    menu: [culversBurger],
  },
  {
    id: 'olive_garden',
    name: 'Olive Garden',
    aliases: ['olive garden', 'olivegarden'],
    categories: ['pasta', 'soup', 'salad', 'entree'],
    popular: [
      { label: 'Lasagna', words: 'lasagna' },
      { label: 'Fettuccine Alfredo', words: 'fettuccine alfredo' },
      { label: 'Soup & salad', words: 'zuppa toscana' },
    ],
    menu: [olivePasta],
  },
  {
    id: 'mcdonalds',
    name: 'McDonald’s',
    aliases: ['mcdonalds', 'mcdonald s', 'mcdonald', 'mcds', 'maccas'],
    categories: ['burger', 'chicken', 'fries', 'breakfast'],
    popular: [
      { label: 'Big Mac', words: 'big mac' },
      { label: 'McNuggets', words: 'chicken mcnuggets' },
      { label: 'Fries', words: 'fries' },
    ],
  },
  {
    id: 'chick_fil_a',
    name: 'Chick-fil-A',
    aliases: ['chick fil a', 'chickfila', 'chik fil a', 'cfa'],
    categories: ['chicken', 'sandwich', 'fries', 'salad'],
    popular: [
      { label: 'Chicken sandwich', words: 'chicken sandwich' },
      { label: 'Nuggets', words: 'nuggets' },
      { label: 'Waffle fries', words: 'waffle fries' },
    ],
  },
  {
    id: 'chipotle',
    name: 'Chipotle',
    aliases: ['chipotle'],
    categories: ['burrito', 'bowl', 'taco', 'salad'],
    popular: [
      { label: 'Burrito', words: 'chicken burrito' },
      { label: 'Bowl', words: 'chicken burrito bowl' },
      { label: 'Tacos', words: 'tacos' },
    ],
  },
  {
    id: 'taco_bell',
    name: 'Taco Bell',
    aliases: ['taco bell', 'tacobell'],
    categories: ['taco', 'burrito'],
    popular: [
      { label: 'Crunchwrap', words: 'crunchwrap supreme' },
      { label: 'Tacos', words: 'crunchy taco' },
      { label: 'Burrito', words: 'bean burrito' },
    ],
  },
  {
    id: 'wendys',
    name: 'Wendy’s',
    aliases: ['wendys', 'wendy s'],
    categories: ['burger', 'chicken', 'fries', 'frozen_dessert'],
    popular: [
      { label: 'Dave’s Single', words: 'daves single' },
      { label: 'Frosty', words: 'frosty' },
      { label: 'Nuggets', words: 'nuggets' },
    ],
  },
  {
    id: 'burger_king',
    name: 'Burger King',
    aliases: ['burger king', 'bk'],
    categories: ['burger', 'fries', 'chicken'],
    popular: [
      { label: 'Whopper', words: 'whopper' },
      { label: 'Fries', words: 'fries' },
      { label: 'Chicken fries', words: 'chicken fries' },
    ],
  },
  {
    id: 'in_n_out',
    name: 'In-N-Out',
    aliases: ['in n out', 'innout', 'in and out'],
    categories: ['burger', 'fries', 'frozen_dessert'],
    popular: [
      { label: 'Double-Double', words: 'double double' },
      { label: 'Cheeseburger', words: 'cheeseburger' },
      { label: 'Fries', words: 'fries' },
    ],
  },
  {
    id: 'five_guys',
    name: 'Five Guys',
    aliases: ['five guys', '5 guys'],
    categories: ['burger', 'fries'],
    popular: [
      { label: 'Cheeseburger', words: 'cheeseburger' },
      { label: 'Little burger', words: 'little hamburger' },
      { label: 'Fries', words: 'fries' },
    ],
  },
  {
    id: 'shake_shack',
    name: 'Shake Shack',
    aliases: ['shake shack'],
    categories: ['burger', 'fries', 'frozen_dessert'],
    popular: [
      { label: 'ShackBurger', words: 'shackburger' },
      { label: 'Fries', words: 'crinkle cut fries' },
      { label: 'Shake', words: 'shake' },
    ],
  },
  {
    id: 'subway',
    name: 'Subway',
    aliases: ['subway'],
    categories: ['sandwich', 'salad'],
    popular: [
      { label: '6" turkey', words: 'turkey 6 inch' },
      { label: 'Footlong', words: 'footlong' },
      { label: 'Salad', words: 'salad' },
    ],
  },
  {
    id: 'jersey_mikes',
    name: 'Jersey Mike’s',
    aliases: ['jersey mikes', 'jersey mike s'],
    categories: ['sandwich'],
    popular: [
      { label: 'Italian', words: 'original italian' },
      { label: 'Turkey', words: 'turkey provolone' },
      { label: 'Cheesesteak', words: 'cheesesteak' },
    ],
  },
  {
    id: 'panera',
    name: 'Panera Bread',
    aliases: ['panera', 'panera bread'],
    categories: ['sandwich', 'soup', 'salad', 'bowl'],
    popular: [
      { label: 'Mac & cheese', words: 'mac and cheese' },
      { label: 'Soup', words: 'broccoli cheddar soup' },
      { label: 'Salad', words: 'caesar salad' },
    ],
  },
  {
    id: 'starbucks',
    name: 'Starbucks',
    aliases: ['starbucks', 'sbux'],
    categories: ['drink', 'breakfast', 'dessert'],
    popular: [
      { label: 'Latte', words: 'caffe latte' },
      { label: 'Egg bites', words: 'egg bites' },
      { label: 'Frappuccino', words: 'frappuccino' },
    ],
  },
  {
    id: 'dominos',
    name: 'Domino’s',
    aliases: ['dominos', 'domino s'],
    categories: ['pizza'],
    popular: [
      { label: 'Pepperoni', words: 'pepperoni pizza' },
      { label: 'Cheese', words: 'cheese pizza' },
      { label: 'Wings', words: 'wings' },
    ],
  },
  {
    id: 'pizza_hut',
    name: 'Pizza Hut',
    aliases: ['pizza hut'],
    categories: ['pizza'],
    popular: [
      { label: 'Pepperoni', words: 'pepperoni pizza' },
      { label: 'Cheese', words: 'cheese pizza' },
      { label: 'Breadsticks', words: 'breadsticks' },
    ],
  },
  {
    id: 'raising_canes',
    name: 'Raising Cane’s',
    aliases: ['raising canes', 'canes', 'cane s'],
    categories: ['chicken', 'fries'],
    popular: [
      { label: 'Box Combo', words: 'box combo' },
      { label: '3 Finger', words: '3 finger combo' },
      { label: 'Tenders', words: 'chicken finger' },
    ],
  },
  {
    id: 'panda_express',
    name: 'Panda Express',
    aliases: ['panda express', 'panda'],
    categories: ['entree', 'bowl'],
    popular: [
      { label: 'Orange chicken', words: 'orange chicken' },
      { label: 'Bowl', words: 'bowl' },
      { label: 'Chow mein', words: 'chow mein' },
    ],
  },
  {
    id: 'cava',
    name: 'Cava',
    aliases: ['cava'],
    categories: ['bowl', 'salad'],
    popular: [
      { label: 'Greens + grains', words: 'greens and grains bowl' },
      { label: 'Chicken bowl', words: 'chicken bowl' },
      { label: 'Pita', words: 'pita' },
    ],
  },
  {
    id: 'sweetgreen',
    name: 'Sweetgreen',
    aliases: ['sweetgreen', 'sweet green'],
    categories: ['salad', 'bowl'],
    popular: [
      { label: 'Harvest bowl', words: 'harvest bowl' },
      { label: 'Kale caesar', words: 'kale caesar' },
      { label: 'Protein bowl', words: 'protein bowl' },
    ],
  },
  {
    id: 'dairy_queen',
    name: 'Dairy Queen',
    aliases: ['dairy queen', 'dq'],
    categories: ['frozen_dessert', 'burger'],
    popular: [
      { label: 'Blizzard', words: 'blizzard' },
      { label: 'Cone', words: 'vanilla cone' },
      { label: 'Burger', words: 'cheeseburger' },
    ],
  },
  { id: 'kfc', name: 'KFC', aliases: ['kfc'], categories: ['chicken', 'sandwich'] as FoodCategory[], popular: [] },
  { id: 'popeyes', name: 'Popeyes', aliases: ['popeyes'], categories: ['chicken', 'sandwich'] as FoodCategory[], popular: [] },
  { id: 'arbys', name: 'Arbys', aliases: ['arbys', 'arby'], categories: ['sandwich'] as FoodCategory[], popular: [] },
  { id: 'sonic', name: 'Sonic', aliases: ['sonic drive-in', 'sonic'], categories: ['burger', 'entree', 'drink'] as FoodCategory[], popular: [] },
  { id: 'jack_in_the_box', name: 'Jack in the Box', aliases: ['jack in the box', 'jack box'], categories: ['burger', 'taco'] as FoodCategory[], popular: [] },
  { id: 'whataburger', name: 'Whataburger', aliases: ['whataburger'], categories: ['burger'] as FoodCategory[], popular: [] },
  { id: 'wingstop', name: 'Wingstop', aliases: ['wingstop'], categories: ['chicken'] as FoodCategory[], popular: [] },
  { id: 'jimmy_johns', name: 'Jimmy Johns', aliases: ['jimmy johns', 'jimmy john'], categories: ['sandwich'] as FoodCategory[], popular: [] },
  { id: 'firehouse_subs', name: 'Firehouse Subs', aliases: ['firehouse'], categories: ['sandwich'] as FoodCategory[], popular: [] },
  { id: 'portillos', name: 'Portillos', aliases: ['portillos', 'portillo'], categories: ['burger', 'entree', 'sandwich'] as FoodCategory[], popular: [] },
  { id: 'del_taco', name: 'Del Taco', aliases: ['del taco'], categories: ['taco', 'burrito'] as FoodCategory[], popular: [] },
  { id: 'el_pollo_loco', name: 'El Pollo Loco', aliases: ['el pollo loco', 'pollo loco'], categories: ['chicken', 'burrito'] as FoodCategory[], popular: [] },
  { id: 'zaxbys', name: 'Zaxbys', aliases: ['zaxbys', 'zaxby'], categories: ['chicken', 'sandwich'] as FoodCategory[], popular: [] },
  { id: 'bojangles', name: 'Bojangles', aliases: ['bojangles'], categories: ['chicken'] as FoodCategory[], popular: [] },
  { id: 'hardees', name: 'Hardees', aliases: ['hardees', 'hardee'], categories: ['burger', 'breakfast'] as FoodCategory[], popular: [] },
  { id: 'carls_jr', name: 'Carls Jr', aliases: ['carls jr', 'carl jr', 'carls'], categories: ['burger'] as FoodCategory[], popular: [] },
  { id: 'checkers', name: 'Checkers', aliases: ['checkers', 'rallys', 'rally'], categories: ['burger', 'chicken'] as FoodCategory[], popular: [] },
  {
    id: 'tropical_smoothie',
    name: 'Tropical Smoothie Cafe',
    aliases: ['tropical smoothie'],
    categories: ['smoothie', 'sandwich'] as FoodCategory[],
    popular: [],
  },
  { id: 'smoothie_king', name: 'Smoothie King', aliases: ['smoothie king'], categories: ['smoothie'] as FoodCategory[], popular: [] },
  { id: 'jamba', name: 'Jamba', aliases: ['jamba', 'jamba juice'], categories: ['smoothie'] as FoodCategory[], popular: [] },
  { id: 'dunkin', name: 'Dunkin', aliases: ['dunkin', 'dunkin donuts'], categories: ['breakfast', 'drink'] as FoodCategory[], popular: [] },
  { id: 'krispy_kreme', name: 'Krispy Kreme', aliases: ['krispy kreme'], categories: ['dessert', 'drink'] as FoodCategory[], popular: [] },
  { id: 'tim_hortons', name: 'Tim Hortons', aliases: ['tim hortons'], categories: ['drink', 'breakfast'] as FoodCategory[], popular: [] },
  { id: 'mcalisters', name: 'McAlisters Deli', aliases: ['mcalisters', 'mcalister'], categories: ['sandwich', 'soup'] as FoodCategory[], popular: [] },
  { id: 'jason_deli', name: 'Jasons Deli', aliases: ['jasons deli', 'jason deli'], categories: ['sandwich', 'salad'] as FoodCategory[], popular: [] },
  { id: 'potbelly', name: 'Potbelly', aliases: ['potbelly'], categories: ['sandwich'] as FoodCategory[], popular: [] },
  { id: 'qdoba', name: 'Qdoba', aliases: ['qdoba'], categories: ['burrito', 'bowl'] as FoodCategory[], popular: [] },
  { id: 'moes', name: 'Moes Southwest Grill', aliases: ['moes', 'moes southwest'], categories: ['burrito', 'bowl'] as FoodCategory[], popular: [] },
  { id: 'wawa', name: 'Wawa', aliases: ['wawa'], categories: ['sandwich', 'breakfast'] as FoodCategory[], popular: [] },
  { id: 'sheetz', name: 'Sheetz', aliases: ['sheetz'], categories: ['sandwich', 'burger'] as FoodCategory[], popular: [] },
  { id: 'chilis', name: 'Chilis', aliases: ['chilis', 'chili'], categories: ['burger', 'chicken'] as FoodCategory[], popular: [] },
  { id: 'applebees', name: 'Applebees', aliases: ['applebees', 'applebee'], categories: ['burger', 'chicken', 'entree'] as FoodCategory[], popular: [] },
  {
    id: 'buffalo_wild_wings',
    name: 'Buffalo Wild Wings',
    aliases: ['buffalo wild wings', 'bdubs', 'bww'],
    categories: ['chicken'] as FoodCategory[],
    popular: [],
  },
  { id: 'dennys', name: 'Dennys', aliases: ['dennys', 'denny'], categories: ['breakfast', 'burger'] as FoodCategory[], popular: [] },
  { id: 'ihop', name: 'IHOP', aliases: ['ihop'], categories: ['breakfast', 'breakfast'] as FoodCategory[], popular: [] },
  { id: 'waffle_house', name: 'Waffle House', aliases: ['waffle house'], categories: ['breakfast'] as FoodCategory[], popular: [] },
  { id: 'cracker_barrel', name: 'Cracker Barrel', aliases: ['cracker barrel'], categories: ['breakfast', 'chicken'] as FoodCategory[], popular: [] },
  { id: 'red_lobster', name: 'Red Lobster', aliases: ['red lobster'], categories: ['seafood'] as FoodCategory[], popular: [] },
  { id: 'outback', name: 'Outback Steakhouse', aliases: ['outback'], categories: ['entree', 'burger'] as FoodCategory[], popular: [] },
  { id: 'texas_roadhouse', name: 'Texas Roadhouse', aliases: ['texas roadhouse'], categories: ['entree', 'burger'] as FoodCategory[], popular: [] },
  {
    id: 'noodles_co',
    name: 'Noodles and Company',
    aliases: ['noodles and company', 'noodles co'],
    categories: ['pasta', 'bowl'] as FoodCategory[],
    popular: [],
  },
  { id: 'papa_johns', name: 'Papa Johns', aliases: ['papa johns', 'papa john'], categories: ['pizza'] as FoodCategory[], popular: [] },
  { id: 'little_caesars', name: 'Little Caesars', aliases: ['little caesars'], categories: ['pizza'] as FoodCategory[], popular: [] },
  { id: 'white_castle', name: 'White Castle', aliases: ['white castle'], categories: ['burger'] as FoodCategory[], popular: [] },
  { id: 'cookout', name: 'Cook Out', aliases: ['cookout', 'cook out'], categories: ['burger', 'drink'] as FoodCategory[], popular: [] },
  { id: 'freddy', name: 'Freddys', aliases: ['freddys', 'freddy'], categories: ['burger'] as FoodCategory[], popular: [] },
  { id: 'smashburger', name: 'Smashburger', aliases: ['smashburger'], categories: ['burger'] as FoodCategory[], popular: [] },
  { id: 'steak_n_shake', name: 'Steak n Shake', aliases: ['steak n shake', 'steak shake'], categories: ['burger', 'drink'] as FoodCategory[], popular: [] },
  { id: 'church', name: 'Churchs Chicken', aliases: ['churchs', 'church chicken'], categories: ['chicken'] as FoodCategory[], popular: [] },
  { id: 'golden_corral', name: 'Golden Corral', aliases: ['golden corral'], categories: ['entree'] as FoodCategory[], popular: [] },
  { id: 'boston_market', name: 'Boston Market', aliases: ['boston market'], categories: ['chicken'] as FoodCategory[], popular: [] },
  { id: 'mod_pizza', name: 'MOD Pizza', aliases: ['mod pizza'], categories: ['pizza'] as FoodCategory[], popular: [] },
  { id: 'blaze_pizza', name: 'Blaze Pizza', aliases: ['blaze pizza', 'blaze'], categories: ['pizza'] as FoodCategory[], popular: [] },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function findRestaurant(text: string): { restaurant: Restaurant; alias: string } | null {
  const t = ` ${norm(text)} `;
  let best: { restaurant: Restaurant; alias: string } | null = null;
  for (const r of RESTAURANTS) {
    for (const a of r.aliases) {
      if (t.includes(` ${a} `) && (!best || a.length > best.alias.length)) best = { restaurant: r, alias: a };
    }
  }
  return best;
}

export const restaurantById = (id?: string | null) => RESTAURANTS.find((r) => r.id === id) ?? null;

export function restaurantByBrand(brand?: string | null) {
  if (!brand) return null;
  return findRestaurant(brand)?.restaurant ?? null;
}

export function menuRuleFor(restaurantId: string | null | undefined, words: string): MenuRule | null {
  const r = restaurantById(restaurantId);
  return r?.menu?.find((m) => m.match.test(norm(words))) ?? null;
}

export { norm };
