import type { Config } from '@netlify/functions';
import { aiConfigured } from '../lib/anthropic';
import { env, json } from '../lib/http';
import { PROVIDERS } from '../lib/providers';

/** GET /api/status — which services are connected (never returns secrets). */
export default async () =>
  json({
    ai: aiConfigured(),
    providers: PROVIDERS.map((p) => ({ id: p.id, configured: p.configured() })),
    accountDeletion: !!(env('SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY')),
    webBilling: !!(env('STRIPE_SECRET_KEY') && env('STRIPE_PRICE_MONTHLY') && env('STRIPE_PRICE_ANNUAL') && env('STRIPE_WEBHOOK_SECRET')),
  });

export const config: Config = { path: '/api/status' };
