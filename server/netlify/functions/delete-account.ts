import type { Config } from '@netlify/functions';
import { env, guard, json } from '../lib/http';

/**
 * POST /api/account/delete  (Authorization: Bearer <user access token>)
 * Verifies the caller with Supabase, then deletes the auth user. Table rows cascade (see migration).
 * Required by App Store guideline 5.1.1(v).
 */
export default async (req: Request) => {
  const blocked = guard(req, { method: 'POST', perMinute: 5 });
  if (blocked) return blocked;
  const url = env('SUPABASE_URL');
  const service = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service) return json({ error: 'not_configured' }, 503);
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const who = await fetch(`${url}/auth/v1/user`, { headers: { authorization: `Bearer ${token}`, apikey: service } });
  if (!who.ok) return json({ error: 'unauthorized' }, 401);
  const user = (await who.json()) as { id?: string };
  if (!user.id) return json({ error: 'unauthorized' }, 401);

  const del = await fetch(`${url}/auth/v1/admin/users/${user.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${service}`, apikey: service } });
  if (!del.ok) {
    console.error('delete failed', del.status, await del.text());
    return json({ error: 'delete_failed' }, 502);
  }
  return json({ deleted: true });
};

export const config: Config = { path: '/api/account/delete' };
