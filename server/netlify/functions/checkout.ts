import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' as any });

const PRICES: Record<string, string> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || '',
  annual: process.env.STRIPE_PRICE_ANNUAL || '',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'POST only' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const plan = body.plan as string; // 'monthly' | 'annual'
    const userId = body.userId as string;
    const returnUrl = body.returnUrl as string || 'https://plategauge.netlify.app/account';

    const priceId = PRICES[plan];
    if (!priceId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'invalid_plan' }) };
    if (!userId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing_user' }) };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl}?checkout=success`,
      cancel_url: `${returnUrl}?checkout=cancel`,
      client_reference_id: userId,
      metadata: { supabase_user_id: userId },
    });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ url: session.url }) };
  } catch (e) {
    console.error('checkout error', e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'checkout_failed' }) };
  }
};
