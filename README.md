# CashFlow Mobile

The CashFlow app for iPhone and Android: React Native with Expo (SDK 57, the version the App Store's Expo Go runs; move to 58 once Expo Go does), TypeScript and Expo Router.
Employees and approvers use it; administration stays in the web app.

## Run it

```bash
npm install
npm start
```

Open the app on a phone with **Expo Go**: scan the QR code the dev server prints, with the phone on the same
network as the computer. Press `w` (or open http://localhost:8081) for a browser preview.

## Modes

Copy `.env.example` to `.env.local`.

- `EXPO_PUBLIC_AUTH_MODE=demo`: sample data, no server (the default).
- `EXPO_PUBLIC_AUTH_MODE=api`: the CashFlow API at `EXPO_PUBLIC_API_URL`.

## Where things are

| Folder | What |
|---|---|
| `src/app` | Screens. `(tabs)` holds the five tabs; `settings.tsx` opens from Home. |
| `src/components` | Shared pieces: `AppText`, `Screen`, the tab bar buttons. |
| `src/theme/tokens.ts` | Colours (light and dark), Inter, type scale, spacing, radius. |
| `src/i18n` | i18next and the 29 languages. |
| `src/locales` | One file of app strings per language. |

## Right-to-left

Arabic, Urdu, Persian and Hebrew lay out right to left through the `direction` style on each screen and the
tab bar (Expo Go cannot switch React Native's global RTL at runtime). Use `start`/`end` rather than
`left`/`right` in styles, and let `AppText` align text.

## Checks

```bash
npm run typecheck
npm run lint
```
