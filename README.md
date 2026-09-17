# PlateGauge

**What’re ya hungry for?** A calorie and macro tracker that tells you how to make a craving fit.

Expo SDK 57 · React Native 0.86 · Expo Router · Zustand · Supabase auth · Netlify Functions

## What’s in it

| Area | What it does |
|---|---|
| Today | Week strip with logged-day dots, plate-gauge dial, eaten / budget / left, macros with grams left, meals, one swipeable panel (fiber, sugar, sodium, Daily Balance · steps, activity, water), recently-logged timeline with undo |
| Log | Search across providers with filters (restaurants, brands, basic foods, brand name), pagination, recents, saved foods, your own foods; Describe (AI); Quick add |
| + button | One sheet: scan barcode, scan meal, search, describe, quick add, create food, create recipe, water, weight, activity |
| Scan | Meal photo (AI, items with calorie ranges), barcode (every connected database, every barcode format, flashlight, manual entry), nutrition label (AI reads it into Create food) |
| Product | Serving picker, live totals, **Label Score 0–10** (Nutri-Score 6 + processing 2 + additives 2, with the breakdown) |
| Crave | Exact item first → “Make it fit” versions → similar foods of the same type. One-tap follow-up questions. Dietary screening |
| Build It | Data-driven customizer for any food; restaurant options only when the restaurant offers them; live calories, macros, sodium and what’s left after |
| Progress | Streaks, days on target, weight trend vs goal, calories vs goal, macro averages |
| Profile | Body stats, goals and pace (with safety warnings), activity-budget setting, food preferences, Daily Balance explained, reminders, AI consent, account (password, sign out, delete) |

Every number carries a source label: Verified restaurant, Label data, Database, You, Estimate, Photo estimate, or Development data.

## Run it

```bash
npm install
cp .env.example .env        # defaults to development data, no server needed
npx expo start              # i = iOS simulator, w = web
npm run check               # typecheck, lint, tests, server typecheck + bundle
```

Native features (camera, Sign in with Apple, notifications) need a development build: `npx expo run:ios` or `eas build --profile development`.

## Data modes

| Mode | When | Food data | Accounts |
|---|---|---|---|
| server | `EXPO_PUBLIC_API_URL` set | USDA, Open Food Facts, Nutritionix, FatSecret (whichever keys exist) | Supabase |
| development | `EXPO_PUBLIC_DATA_MODE=development` and not a production build | Labeled fixtures in `shared/dev/fixtures.ts` | Device-only |
| open-food-facts | Native app, no server | Packaged foods + barcodes straight from Open Food Facts | Supabase if configured |

Nothing ever falls back to invented nutrition. If a source is missing, the screen says so.

## Deploy (Netlify, one site)

1. New site from this repo, base directory = repo root (uses `netlify.toml`: builds the web app into `dist`, functions from `server/netlify/functions`).
2. Add the server variables listed at the bottom of `.env.example`, plus the `EXPO_PUBLIC_*` ones for the web build.
3. `EXPO_PUBLIC_API_URL` = the site origin, e.g. `https://plategauge.netlify.app` (no `/api`).
4. Check `https://YOUR-SITE/api/status` — it lists which services are connected.

Endpoints: `/api/food/search`, `/api/food/barcode`, `/api/food/customize`, `/api/crave`, `/api/ai`, `/api/account/delete`, `/api/status`.

## Supabase

1. Create a project. Run `supabase/migrations/20260917000000_plategauge_init.sql` (SQL editor or `supabase db push`).
2. Authentication → Providers: enable Email; Apple (Client IDs: your bundle ID, `com.plategauge.app`); Google (web client ID + secret).
3. Authentication → URL Configuration → Redirect URLs: `plategauge://**` and `https://YOUR-SITE/**`.
4. Put the project URL and anon key in the app env, and the service-role key in Netlify only.

## Layout

```
app/                  screens (Expo Router)
  (tabs)/             Today, Log, Crave, Progress (+ button opens app/add.tsx)
shared/               framework-free logic used by app, server and tests
  crave.ts intent.ts rank.ts questions.ts      Crave engine
  customize.ts templates.ts resolve.ts          Build It
  restaurants.ts reference.ts tags.ts           menu rules, estimate components, food lexicon
  productScore.ts balance.ts targets.ts streak.ts barcode.ts gate.ts prompts.ts
server/netlify/       functions + provider adapters (lib/providers/*)
src/                  store (versioned migrations), services, components
supabase/migrations/  schema + RLS
tests/                vitest (Crave scenarios, Build It math, gate, streaks, targets, barcodes, scores, focus layout)
```

## Known limits

- Restaurant customization is exact only where a menu rule exists (Culver’s burgers, Olive Garden lasagna today); other chains get portion and side options only, labeled as estimates.
- No database has every barcode. Unknown products go to “scan the label / enter it once”.
- Apple Health / Health Connect: adapter in `src/services/health.ts`, native module not installed yet.
- Dark mode isn’t supported yet (the app forces light).
