# AfuMail — Website

This is the **web app** for AfuMail. It runs in the browser at `mail.afuchat.com`.

## Tech stack

- **Framework**: [Expo](https://expo.dev) + [Expo Router](https://expo.github.io/router/) (web-only build)
- **UI**: React Native Web — the same `View`, `Text`, `Pressable` components as the mobile app, rendered as HTML in the browser
- **Auth**: Supabase (browser `localStorage` session storage)
- **API**: REST + Supabase Realtime

## Project structure

```
app/
  _layout.tsx          ← root layout: fonts, auth guard, data providers
  (auth)/
    login.tsx          ← sign in, register, forgot password
  (tabs)/
    index.tsx          ← main inbox view (3-column desktop layout)
components/
  Avatar.tsx           ← shared avatar component
  web/                 ← desktop-web-specific UI components
    WebSidebar.tsx     ← left sidebar (folders, search, account)
    WebEmailList.tsx   ← email list (middle column)
    WebEmailDetail.tsx ← email reading pane (right column)
    WebComposeModal.tsx← compose new email
    WebAccountPanel.tsx← account/profile settings panel
    WebSecurityPanel.tsx← security & sessions panel
    webColors.ts       ← color tokens for the web theme
context/
  AuthContext.tsx      ← authentication state (Supabase session)
  EmailContext.tsx     ← email data & actions (fetch, send, star, etc.)
lib/
  supabase.ts          ← Supabase client (web version, no AsyncStorage)
  supabase-config.ts   ← URL and anon key (from env vars)
  api-base.ts          ← base URL for the AfuMail API server
  preferences.ts       ← user preferences helpers
  pkce.ts              ← OAuth PKCE helpers (Web Crypto API)
server/
  serve.js             ← production static file server (serves dist/)
  templates/
    landing-page.html  ← marketing landing page (shown before login)
```

## Running locally (Replit)

The `dev` workflow serves the landing page on port 3000.

To see the full web app, first build it:

```bash
pnpm --filter @workspace/website run build
```

Then restart the `artifacts/website: web` workflow — it will serve the built app.

## Environment variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `EXPO_PUBLIC_SITE_URL` | Public URL of this web app |
| `EXPO_PUBLIC_DOMAIN` | Replit dev domain (set automatically) |
