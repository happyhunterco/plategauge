import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' as any });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function updateSubscription(userId: string, status: string, plan: string | null, currentPeriodEnd: number | null) {
  await supabase.from('profiles').upsert(
    {
      id: userId,
      subscription: { status, plan, current_period_end: currentPeriodEnd },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };

  const sig = event.headers['stripe-signature'];
  if (!sig || !webhookSecret) return { statusCode: 400, body: 'missing signature or secret' };

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body || '', sig, webhookSecret);
  } catch (e) {
    console.error('webhook signature verification failed', e);
    return { statusCode: 400, body: 'invalid signature' };
  }

  const sub = stripeEvent.data.object as Stripe.Subscription & { client_reference_id?: string };

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.supabase_user_id;
      if (userId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const plan = subscription.items.data[0]?.price?.lookup_key || 'pro';
        await updateSubscription(userId, 'active', plan, (subscription as any).current_period_end);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        const plan = sub.items?.data?.[0]?.price?.lookup_key || 'pro';
        await updateSubscription(userId, sub.status || 'canceled', sub.status === 'canceled' ? null : plan, (sub as any).current_period_end || null);
      }
      break;
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
