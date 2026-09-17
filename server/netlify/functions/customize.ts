import type { Config } from '@netlify/functions';
import type { FoodItem } from '../../../shared/food';
import { buildCustomizable } from '../../../shared/resolve';
import { guard, json } from '../lib/http';
import { lookupRestaurantItem } from '../lib/providers';

/** POST /api/food/customize { item, words } → Build It definition with provider-resolved options */
export default async (req: Request) => {
  const blocked = guard(req, { method: 'POST', perMinute: 60 });
  if (blocked) return blocked;
  const body = (await req.json().catch(() => null)) as { item?: FoodItem; words?: string } | null;
  if (!body?.item?.name || !body.item.nutrients) return json({ error: 'bad_item' }, 400);
  const custom = await buildCustomizable(body.item, String(body.words ?? '').slice(0, 200), lookupRestaurantItem);
  return json(custom);
};

export const config: Config = { path: '/api/food/customize' };
