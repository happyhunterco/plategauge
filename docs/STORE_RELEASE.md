# Vahla iOS and Android release checklist

The repository is prepared for native builds, but publishing requires owner-controlled Apple, Google, Expo, Supabase, Stripe, and domain accounts. Never put secret keys in `EXPO_PUBLIC_*` variables.

## 1. Business and legal ownership

- Decide and publish the legal operator name, business address, country/state, and governing law. The in-app terms intentionally do not invent these facts.
- Have a qualified lawyer review the Terms and Privacy Policy for the countries where Vahla will launch. App code and disclaimers reduce risk; they cannot prevent all claims.
- Create working `support@vahla.co` and `privacy@vahla.co` inboxes or forwards and answer data-rights requests.
- Keep launch limited to adults 18+ unless counsel designs parental consent and child-safety compliance.
- Confirm rights to every logo, font, photo, exercise illustration, restaurant mark, and dataset. Do not imply restaurant endorsement.

## 2. Domain, authentication, and account lifecycle

- Netlify: make `vahla.co` the primary production domain and keep the existing `plategauge` repository/site identifiers unchanged.
- Supabase → Authentication → URL Configuration:
  - Site URL: `https://vahla.co`
  - Redirect URLs: `https://vahla.co/**` and `plategauge://**`
  - Add only the exact preview/local URLs the team actively uses.
- Test email confirmation, Google, Apple, password recovery, sign-out, and in-app account deletion on a physical iPhone and Android device.
- Confirm account deletion removes database rows and cancels any active Vahla web subscription.

## 3. EAS production environment

Create an Expo project, link it with `eas init`, and set these as EAS `production` environment variables:

- `EXPO_PUBLIC_API_URL=https://vahla.co`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_TERMS_URL=https://vahla.co/terms`
- `EXPO_PUBLIC_PRIVACY_URL=https://vahla.co/privacy`
- `EXPO_PUBLIC_SUPPORT_EMAIL=support@vahla.co`
- Google client IDs required by the configured Supabase sign-in flow

Then run `npm run build:native`. EAS will create/store signing credentials only after the owner signs into the Apple and Google accounts.

## 4. Subscriptions

- Web subscriptions may use Stripe. Configure live price IDs, webhook signing secret, Customer Portal, tax settings, statement descriptor, support contact, cancellation/refund policy, and webhook destination `https://vahla.co/api/stripe/webhook`.
- Do not sell digital Pro access from the iOS or Android app through Stripe. Native purchase buttons are intentionally disabled until Apple In-App Purchase and Google Play Billing are implemented.
- Before enabling native Pro, create matching store products, implement purchase/restore/entitlement verification, add “Restore purchases,” and test renewals, cancellations, grace periods, refunds, and account deletion in sandbox/test tracks.
- Confirm the displayed price, renewal period, automatic-renewal disclosure, terms, and privacy links match each store product.

## 5. App Store Connect declarations

- Age rating: answer for a general wellness app; do not claim medical treatment or diagnosis.
- App Privacy: disclose account identifiers, email, user content/photos, health/fitness entries, body measurements, food/workout activity, purchase/subscription information, diagnostics/support data, purposes, linkage, and all third-party processors actually enabled.
- Provide the public Privacy Policy URL and support URL.
- Explain camera/photo use and provide an active review account with representative data.
- Demonstrate in-app account deletion and Sign in with Apple.
- Do not claim Apple Health support until the native integration and permissions are actually shipped and reviewed.

## 6. Google Play declarations

- Complete Data safety consistently with the Privacy Policy, including health/fitness, photos, account information, app activity, purchases, sharing with processors, encryption in transit, and deletion support.
- Complete the Health apps declaration if required by the available features/category.
- Use Google Play Billing before charging for digital Pro access in Android.
- Publish account-deletion instructions and a web deletion path if Google requires one for the selected account model.
- Start with internal testing, then closed testing, and meet any current testing-duration/account requirements before production access.

## 7. Food, AI, and fitness quality

- Keep source labels visible and never convert an unknown barcode into guessed nutrition.
- Open Food Facts: preserve database attribution/ODbL requirements and image attribution where applicable. USDA data is generally public domain. Comply with the current terms, quotas, attribution, caching, and display rules of Nutritionix, FatSecret, HealthyFastFood.org, Anthropic, and any later provider.
- Keep AI opt-in. Never market AI estimates as medical or dietitian advice. Verify that enabled AI/provider contracts match the Privacy Policy and desired retention settings.
- Maintain allergen warnings. Do not make safety claims based on incomplete menus, crowdsourced data, or AI.
- Exercise plans must stay adjustable and educational. Add professional review before marketing plans for injury rehabilitation, pregnancy, minors, or medical conditions.

## 8. Release verification

Before every release run:

```bash
npx tsc --noEmit
npx vitest run
npx eslint .
npm run build:web
npm --prefix server run typecheck
npm --prefix server run bundle-check
npx expo-doctor
npx --yes deno check server/netlify/edge-functions/ai.ts
```

Also test on physical devices: small and large screens, safe areas, keyboard, camera permissions, denied permissions, barcode formats, offline/slow network, password reset from the email app, OAuth return, subscription portal, account deletion, accessibility labels, large text, and screen readers.
