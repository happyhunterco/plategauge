import type { Config } from '@netlify/functions';
import Stripe from 'stripe';
import { env, guard, json } from '../lib/http';
import { authenticatedUser } from '../lib/auth';

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
  const user = await authenticatedUser(req.headers.get('authorization'));
  if (!user) return json({ error: 'unauthorized' }, 401);

  // Do not orphan a paid subscription when its owner deletes the account.
  const stripeSecret = env('STRIPE_SECRET_KEY');
  if (stripeSecret) {
    try {
      const stripe = new Stripe(stripeSecret, { apiVersion: '2024-12-18.acacia' as any });
      const found = await stripe.subscriptions.search({
        query: `metadata['supabase_user_id']:'${user.id}'`,
        limit: 100,
      });
      const billable = found.data.filter((sub) => sub.status !== 'canceled' && sub.status !== 'incomplete_expired');
      await Promise.all(billable.map((sub) => stripe.subscriptions.cancel(sub.id)));
    } catch (error) {
      console.error('subscription cancellation before account deletion failed', error);
      return json({ error: 'subscription_cancel_failed' }, 502);
    }
  }

  const del = await fetch(`${url}/auth/v1/admin/users/${user.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${service}`, apikey: service } });
  if (!del.ok) {
    console.error('delete failed', del.status, await del.text());
    return json({ error: 'delete_failed' }, 502);
  }
  return json({ deleted: true });
};

export const config: Config = { path: '/api/account/delete' };
