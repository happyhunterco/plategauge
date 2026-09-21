import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { authenticatedUser } from '../lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (statusCode: number, body: object) => ({ statusCode, headers, body: JSON.stringify(body) });

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(204, {});
  if (event.httpMethod !== 'POST') return reply(405, { error: 'POST only' });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return reply(503, { error: 'Payments are not configured yet.' });

  const user = await authenticatedUser(event.headers.authorization);
  if (!user) return reply(401, { error: 'Sign in again before upgrading.' });

  let input: { plan?: string };
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return reply(400, { error: 'Invalid request.' });
  }
  if (input.plan !== 'monthly' && input.plan !== 'annual') return reply(400, { error: 'Choose a monthly or annual plan.' });

  const price = input.plan === 'annual' ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;
  if (!price) return reply(503, { error: 'That subscription plan is not configured yet.' });

  const configured = process.env.PUBLIC_SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://vahla.co';
  const baseUrl = configured.replace(/\/$/, '');
  const stripe = new Stripe(secret, { apiVersion: '2024-12-18.acacia' as any });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      metadata: { supabase_user_id: user.id, plan: input.plan },
      subscription_data: { metadata: { supabase_user_id: user.id, plan: input.plan } },
      allow_promotion_codes: true,
      success_url: `${baseUrl}/account?checkout=success`,
      cancel_url: `${baseUrl}/upgrade?checkout=cancel`,
    });
    if (!session.url) return reply(502, { error: 'Stripe did not return a checkout link.' });
    return reply(200, { url: session.url });
  } catch (error) {
    console.error('checkout session creation failed', error);
    return reply(500, { error: 'Checkout could not be opened. Please try again.' });
  }
};
