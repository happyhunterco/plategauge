import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { authenticatedUser } from '../lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' as any });
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'POST only' }) };

  try {
    const user = await authenticatedUser(event.headers.authorization);
    if (!user) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'unauthorized' }) };
    const userId = user.id;

    // Check Supabase profile for stored subscription
    const { data: profile } = await supabase.from('profiles').select('subscription').eq('id', userId).single();

    const sub = profile?.subscription as { status: string; plan: string | null; current_period_end: number | null } | null;

    // If active and not expired, return it
    if (sub?.status === 'active' || sub?.status === 'trialing') {
      const expired = sub.current_period_end ? sub.current_period_end * 1000 < Date.now() : false;
      if (!expired) return { statusCode: 200, headers: CORS, body: JSON.stringify({ subscription: sub }) };
    }

    // Otherwise recover directly from the metadata placed on the subscription at checkout.
    const subscriptions = await stripe.subscriptions.search({ query: `metadata['supabase_user_id']:'${userId}' AND status:'active'`, limit: 1 });

    if (subscriptions.data.length === 0) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ subscription: null }) };
    }

    const activeSub = subscriptions.data[0];
    const plan = activeSub.items.data[0]?.price?.lookup_key || 'pro';
    const updatedSub = {
      status: activeSub.status,
      plan,
      current_period_end: (activeSub as any).current_period_end,
    };

    // Update Supabase with fresh status
    await supabase.from('profiles').upsert({ id: userId, subscription: updatedSub, updated_at: new Date().toISOString() }, { onConflict: 'id' });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ subscription: updatedSub }) };
  } catch (e) {
    console.error('subscription-status error', e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'server_error' }) };
  }
};
