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
  const user = await authenticatedUser(event.headers.authorization);
  if (!user) return reply(401, { error: 'Sign in again to manage billing.' });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return reply(503, { error: 'Payments are not configured yet.' });

  try {
    const stripe = new Stripe(secret, { apiVersion: '2024-12-18.acacia' as any });
    const subscriptions = await stripe.subscriptions.search({ query: `metadata['supabase_user_id']:'${user.id}'`, limit: 10 });
    const subscription = subscriptions.data.find((item) => item.status !== 'canceled' && item.status !== 'incomplete_expired');
    if (!subscription) return reply(404, { error: 'No web subscription was found.' });
    const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const configured = process.env.PUBLIC_SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://vahla.co';
    const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${configured.replace(/\/$/, '')}/profile` });
    return reply(200, { url: session.url });
  } catch (error) {
    console.error('billing portal creation failed', error);
    return reply(500, { error: 'Billing could not be opened. Please try again.' });
  }
};
