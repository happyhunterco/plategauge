import type { Config } from '@netlify/functions';
import { guard, json } from '../lib/http';
import { lookupBarcode } from '../lib/providers';

/** GET /api/food/barcode?code=  → { status, item, score (0–10 Label Score), tried } */
export default async (req: Request) => {
  const blocked = guard(req, { method: 'GET', perMinute: 60 });
  if (blocked) return blocked;
  const code = (new URL(req.url).searchParams.get('code') ?? '').replace(/\D/g, '');
  if (code.length < 8 || code.length > 14) return json({ error: 'invalid_code' }, 400);
  const result = await lookupBarcode(code);
  return json(result, result.status === 'unavailable' ? 502 : 200, result.status === 'found' ? 86400 : 0);
};

export const config: Config = { path: '/api/food/barcode' };
