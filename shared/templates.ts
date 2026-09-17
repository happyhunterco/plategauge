import type { Customizable, FoodCategory, FoodItem, ModGroup, ModOption } from './food';
import { REFERENCE, type RefKey } from './reference';

/**
 * Generic "Build it" templates for foods without restaurant modifier data.
 * Every option here is an estimate and is labeled that way.
 */

const ref = (id: string, key: RefKey, label?: string): ModOption => ({
  id,
  label: label ?? REFERENCE[key].label,
  nutrients: REFERENCE[key].n,
  quality: 'estimate',
});
const neg = (key: RefKey) => {
  const n = REFERENCE[key].n;
  return {
    calories: -n.calories,
    protein: -n.protein,
    carbs: -n.carbs,
    fat: -n.fat,
    sodium: n.sodium == null ? null : -n.sodium,
    sugar: n.sugar == null ? null : -n.sugar,
    fiber: n.fiber == null ? null : -n.fiber,
  };
};

export const portionGroup = (label = 'How much will you eat?'): ModGroup => ({
  id: 'portion',
  label,
  kind: 'portion',
  scope: 'item',
  options: [
    { id: 'half', label: 'Half', nutrients: null, multiplier: 0.5, quality: 'estimate' },
    { id: 'most', label: 'Most', nutrients: null, multiplier: 0.75, quality: 'estimate' },
    { id: 'all', label: 'All of it', nutrients: null, multiplier: 1, quality: 'estimate' },
  ],
  defaults: ['all'],
});

const sizeGroup: ModGroup = {
  id: 'size',
  label: 'Size',
  kind: 'portion',
  scope: 'item',
  options: [
    { id: 'small', label: 'Small', nutrients: null, multiplier: 0.75, quality: 'estimate' },
    { id: 'regular', label: 'Regular', nutrients: null, multiplier: 1, quality: 'estimate' },
    { id: 'large', label: 'Large', nutrients: null, multiplier: 1.4, quality: 'estimate' },
  ],
  defaults: ['regular'],
};

const doubleGroup: ModGroup = {
  id: 'amount',
  label: 'Portion',
  kind: 'portion',
  scope: 'item',
  options: [
    { id: 'half', label: 'Half', nutrients: null, multiplier: 0.5, quality: 'estimate' },
    { id: 'standard', label: 'Standard', nutrients: null, multiplier: 1, quality: 'estimate' },
    { id: 'double', label: 'Double', nutrients: null, multiplier: 2, quality: 'estimate' },
  ],
  defaults: ['standard'],
};

export const sideGroup: ModGroup = {
  id: 'side',
  label: 'Also having (estimate)',
  kind: 'single',
  scope: 'meal',
  options: [
    { id: 'none', label: 'Nothing else', nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 }, quality: 'estimate' },
    ref('fries_s', 'fries_small', 'Small fries'),
    ref('fries_m', 'fries_medium', 'Medium fries'),
    ref('side_salad', 'side_salad', 'Side salad'),
  ],
  defaults: ['none'],
};

export const drinkGroup: ModGroup = {
  id: 'drink',
  label: 'Drink (estimate)',
  kind: 'single',
  scope: 'meal',
  options: [
    { id: 'none', label: 'Water or diet', nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 }, quality: 'estimate' },
    ref('soda', 'soda_16', 'Regular soda, 16 oz'),
  ],
  defaults: ['none'],
};

const toggles = (id: string, label: string, opts: ModOption[], defaults: string[] = []): ModGroup => ({
  id,
  label,
  kind: 'toggle',
  scope: 'item',
  options: opts,
  defaults,
});

type Template = { title: string; groups: (item: FoodItem) => ModGroup[] };

const TEMPLATES: Partial<Record<FoodCategory, Template>> = {
  burger: {
    title: 'Build your burger',
    groups: (item) => {
      const name = item.name.toLowerCase();
      const patties = /triple/.test(name) ? 3 : /double/.test(name) ? 2 : 1;
      const cheese = /cheese/.test(name);
      return [
        {
          id: 'patties',
          label: 'Patties',
          kind: 'count',
          scope: 'item',
          options: [ref('patty', 'beef_patty', 'Patty')],
          defaults: patties,
          min: 1,
          max: 4,
          unitLabel: 'patty',
        },
        toggles('cheese', 'Cheese', [ref('cheese', 'cheese_slice', 'Cheese')], cheese ? ['cheese'] : []),
        toggles('extras', 'Add', [ref('bacon', 'bacon_2', 'Bacon'), ref('mayo', 'mayo_tbsp', 'Mayo')]),
        {
          id: 'bun',
          label: 'Bun',
          kind: 'single',
          scope: 'item',
          options: [
            { id: 'bun', label: 'Regular bun', nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 }, quality: 'estimate' },
            { id: 'wrap', label: 'Lettuce wrap', nutrients: neg('burger_bun'), quality: 'estimate' },
          ],
          defaults: ['bun'],
        },
        portionGroup(),
        sideGroup,
        drinkGroup,
      ];
    },
  },
  pizza: {
    title: 'Build your pizza',
    groups: () => [
      { id: 'slices', label: 'Slices', kind: 'count', scope: 'item', options: [], defaults: 1, min: 1, max: 8, unitLabel: 'slice' },
      toggles('toppings', 'Extra toppings', [ref('cheese', 'mozzarella_extra', 'Extra cheese'), ref('pepperoni', 'pepperoni', 'Pepperoni')]),
      drinkGroup,
    ],
  },
  burrito: {
    title: 'Build your burrito',
    groups: () => [
      {
        id: 'wrap',
        label: 'Style',
        kind: 'single',
        scope: 'item',
        options: [
          { id: 'burrito', label: 'Burrito', nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 }, quality: 'estimate' },
          { id: 'bowl', label: 'Bowl, no tortilla', nutrients: neg('flour_tortilla_lg'), quality: 'estimate' },
        ],
        defaults: ['burrito'],
      },
      toggles('adds', 'Add', [
        ref('cheese', 'shredded_cheese', 'Cheese'),
        ref('sour_cream', 'sour_cream_2tbsp', 'Sour cream'),
        ref('guac', 'guac_2oz', 'Guacamole'),
        ref('meat', 'chicken_3oz', 'Extra chicken'),
      ]),
      portionGroup(),
      drinkGroup,
    ],
  },
  bowl: {
    title: 'Build your bowl',
    groups: () => [
      {
        id: 'rice',
        label: 'Rice',
        kind: 'single',
        scope: 'item',
        options: [
          { id: 'as_served', label: 'As served', nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 }, quality: 'estimate' },
          { id: 'light', label: 'Light rice', nutrients: neg('rice_half_cup'), quality: 'estimate' },
          ref('extra', 'rice_half_cup', 'Extra rice'),
        ],
        defaults: ['as_served'],
      },
      toggles('adds', 'Add', [
        ref('meat', 'chicken_3oz', 'Extra protein'),
        ref('cheese', 'shredded_cheese', 'Cheese'),
        ref('guac', 'guac_2oz', 'Guacamole'),
        ref('sour_cream', 'sour_cream_2tbsp', 'Sour cream'),
      ]),
      portionGroup(),
    ],
  },
  taco: {
    title: 'Build your tacos',
    groups: () => [
      { id: 'count', label: 'How many', kind: 'count', scope: 'item', options: [], defaults: 1, min: 1, max: 6, unitLabel: 'taco' },
      toggles('adds', 'Add', [
        ref('cheese', 'shredded_cheese', 'Cheese'),
        ref('sour_cream', 'sour_cream_2tbsp', 'Sour cream'),
        ref('guac', 'guac_2oz', 'Guacamole'),
      ]),
      drinkGroup,
    ],
  },
  sandwich: {
    title: 'Build your sandwich',
    groups: () => [
      toggles('adds', 'Add', [ref('cheese', 'cheese_slice', 'Cheese'), ref('bacon', 'bacon_2', 'Bacon'), ref('mayo', 'mayo_tbsp', 'Mayo')]),
      portionGroup(),
      sideGroup,
      drinkGroup,
    ],
  },
  chicken: { title: 'Customize your meal', groups: () => [portionGroup(), sideGroup, drinkGroup] },
  pasta: {
    title: 'Customize your pasta',
    groups: () => [
      doubleGroup,
      toggles('extras', 'Extras', [ref('parmesan', 'parmesan_tbsp', 'Parmesan')]),
      {
        id: 'bread',
        label: 'Garlic bread',
        kind: 'count',
        scope: 'meal',
        options: [ref('bread', 'garlic_bread', 'Garlic bread')],
        defaults: 0,
        min: 0,
        max: 4,
        unitLabel: 'piece',
      },
      {
        id: 'salad',
        label: 'Side salad',
        kind: 'single',
        scope: 'meal',
        options: [
          { id: 'none', label: 'No salad', nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 }, quality: 'estimate' },
          ref('salad', 'side_salad', 'Side salad'),
        ],
        defaults: ['none'],
      },
      {
        id: 'dressing',
        label: 'Dressing',
        kind: 'single',
        scope: 'meal',
        requires: { group: 'salad', anyOf: ['salad'] },
        options: [
          { id: 'none', label: 'No dressing', nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 }, quality: 'estimate' },
          ref('vin', 'vinaigrette_2tbsp', 'Vinaigrette'),
          ref('ranch', 'ranch_2tbsp', 'Ranch'),
        ],
        defaults: ['none'],
      },
    ],
  },
  salad: {
    title: 'Customize your salad',
    groups: () => [
      {
        id: 'dressing',
        label: 'Dressing (2 tbsp)',
        kind: 'single',
        scope: 'item',
        options: [
          { id: 'as_served', label: 'As served', nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 }, quality: 'estimate' },
          ref('vin', 'vinaigrette_2tbsp', 'Add vinaigrette'),
          ref('ranch', 'ranch_2tbsp', 'Add ranch'),
        ],
        defaults: ['as_served'],
      },
      toggles('adds', 'Add', [ref('chicken', 'chicken_3oz', 'Grilled chicken'), ref('cheese', 'shredded_cheese', 'Cheese'), ref('bacon', 'bacon_2', 'Bacon')]),
      portionGroup(),
    ],
  },
  breakfast: {
    title: 'Build your breakfast',
    groups: () => [
      toggles('adds', 'Add', [
        ref('butter', 'butter_tbsp', 'Butter'),
        ref('syrup', 'syrup_2tbsp', 'Syrup'),
        ref('bacon', 'bacon_2', 'Bacon'),
        ref('sausage', 'sausage_patty', 'Sausage'),
      ]),
      { id: 'eggs', label: 'Extra eggs', kind: 'count', scope: 'meal', options: [ref('egg', 'egg', 'Egg')], defaults: 0, min: 0, max: 4, unitLabel: 'egg' },
      portionGroup(),
    ],
  },
  smoothie: {
    title: 'Build your smoothie',
    groups: () => [sizeGroup, toggles('boosts', 'Add', [ref('protein', 'whey_scoop', 'Protein scoop'), ref('pb', 'peanut_butter_tbsp', 'Peanut butter')])],
  },
  frozen_dessert: { title: 'Customize it', groups: () => [sizeGroup, portionGroup()] },
  fries: { title: 'Customize it', groups: () => [sizeGroup, portionGroup()] },
  drink: { title: 'Customize it', groups: () => [sizeGroup] },
};

/** Count groups with no option use the item itself as the unit (pizza slices, tacos). */
function fillSelfUnits(item: FoodItem, groups: ModGroup[]): ModGroup[] {
  return groups.map((g) =>
    g.kind === 'count' && g.options.length === 0
      ? { ...g, options: [{ id: 'unit', label: g.unitLabel ?? 'serving', nutrients: item.nutrients, quality: item.source.quality }] }
      : g,
  );
}

export function templateFor(item: FoodItem, opts: { restaurant?: boolean } = {}): Customizable {
  const cat = item.category ?? 'other';
  // For restaurants with no published modifier data we only offer changes the diner controls:
  // how much they eat, and what else they order. We never invent kitchen modifications.
  if (opts.restaurant) {
    const groups: ModGroup[] = [portionGroup()];
    if (['burger', 'sandwich', 'chicken', 'burrito', 'taco'].includes(cat)) groups.push(sideGroup, drinkGroup);
    return { item, title: 'Customize your order', groups, note: 'This restaurant doesn’t publish modifier nutrition. Portion and add-ons are estimates.' };
  }
  const t = TEMPLATES[cat];
  if (!t) return { item, title: 'Adjust portion', groups: [doubleGroup] };
  return { item, title: t.title, groups: fillSelfUnits(item, t.groups(item)), note: 'Changes are estimates based on typical portions.' };
}
