# PlateGauge

**What’re ya hungry for?**

Calorie and macro tracker for iOS, built with Expo (SDK 57) and Expo Router.

| Feature | Where | What it does |
|---|---|---|
| Today | Tab 1 | Plate-gauge dial, macros, meals by time of day, day switching |
| Log | Tab 2 | Search common + packaged foods, describe a meal in words, quick add |
| Scan | Center tab | Photograph a plate (AI estimate) or scan a barcode (Open Food Facts) |
| Crave | Tab 4 | Say what you’re hungry for, get ideas that fit what’s left today |
| Menus | From Crave | Best orders at a named restaurant within your budget |
| Kitchen | From Crave | Saved pantry → recipes that fit your budget |
| Progress | Tab 5 | Streak, weekly calories vs goal, weight trend, goal editing, data controls |

Everything is stored on-device (AsyncStorage). No accounts.

## Run it

```bash
npm install
npx expo start          # press i for the iOS simulator
```

With no `EXPO_PUBLIC_API_URL` set, the AI features return sample data (demo mode) so you can click through everything.

## Turn on the AI (Netlify)

The Anthropic key never ships inside the app. `server/` is a one-function Netlify site.

1. Create a new Netlify site with **base directory = `server`**.
2. Add environment variables: `ANTHROPIC_API_KEY` (required), `APP_KEY` (optional), `ANTHROPIC_MODEL` (optional, defaults to `claude-sonnet-5`).
3. Deploy. The endpoint is `https://YOUR-SITE.netlify.app/api/ai`.
4. In the app, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL=https://YOUR-SITE.netlify.app/api`.
5. Put the same URL in `eas.json` under `build.production.env`.

## Ship to the App Store

Needs an Apple Developer account ($99/yr).

```bash
npm i -g eas-cli
eas login
eas init                       # links the project, writes projectId to app.json
eas build -p ios --profile production
eas submit -p ios --profile production
```

`eas build` handles certificates and provisioning. `eas submit` uploads to App Store Connect, where you finish the listing and send it to review.

Before you submit:

- Change `ios.bundleIdentifier` in `app.json` if `com.plategauge.app` is taken.
- **Privacy policy URL** is required. It must say meal photos and descriptions are sent to Anthropic for nutrition estimates, and that the food log stays on the device.
- **App Privacy** questionnaire: declare Photos (App Functionality, not linked to identity) and User Content (App Functionality). No tracking.
- The app asks for permission before anything is sent to AI (Apple guideline 5.1.2). Users can switch it off in Progress.
- Screenshots: iPhone 6.9" set is required. iPad isn’t needed because `supportsTablet` is `false`.
- Keep the in-app “estimates, not medical advice” copy. Apple reviews health claims closely.

## Structure

```
app/                 routes (Expo Router)
  (tabs)/            Today, Log, Scan, Crave, Progress
  review.tsx         confirm sheet every add flows through
  menus.tsx kitchen.tsx setup.tsx goals.tsx
src/
  components/        Gauge, Logo, Ideas, UI kit
  api.ts             Open Food Facts + AI client (demo fallback, consent gate)
  store.ts           Zustand + AsyncStorage persistence
  nutrition.ts       Mifflin–St Jeor targets
  foods.ts           built-in common foods (USDA reference values)
server/              Netlify function that talks to Claude
assets/              icon, splash, adaptive icons
```

## Next up

- Apple Health sync for weight and active energy (`react-native-health`, needs a dev build)
- Subscription paywall for AI features (RevenueCat) — the AI calls are the only real per-user cost
- Rate limiting on the function (Netlify Blobs or Upstash) before launch
