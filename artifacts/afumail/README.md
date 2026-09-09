# AfuMail — Mobile App (Android & iOS)

This is the **native mobile app** for AfuMail. It is a React Native app built with Expo, targeting Android and iOS.

## Tech stack

- **Framework**: [Expo](https://expo.dev) + [Expo Router](https://expo.github.io/router/) (native)
- **UI**: React Native (native components — `View`, `Text`, `Pressable`, etc.)
- **Auth**: Supabase (AsyncStorage session storage for native)
- **Database**: Supabase
- **API**: Supabase Edge Functions + Supabase Realtime

## Project structure

```
app/
  _layout.tsx              ← root layout: fonts, gesture handler, auth guard
  (auth)/
    login.tsx              ← sign in screen (native dark UI)
     login.tsx              ← sign in and linked AfuChat recovery-code reset flow
  (tabs)/
    index.tsx              ← inbox screen (native tab)
    calendar.tsx           ← calendar tab
    compose.tsx            ← compose tab
    search.tsx             ← search tab
    settings.tsx           ← settings tab
  email/
    [id].tsx               ← email detail screen
    compose.tsx            ← compose email screen
  settings/                ← settings sub-screens
  oauth/                   ← OAuth authorization flow screens
  developer.tsx            ← developer tools screen
components/
  Avatar.tsx               ← avatar with initials
  EmailRow.tsx             ← email list row
  EmailDetailPanel.tsx     ← email reading panel
  SwipeBackView.tsx        ← swipeable back gesture wrapper
  ui/                      ← shared UI primitives (BottomSheet, Dialog)
  pages/                   ← full-page components (InboxPage, SidebarPage)
context/
  AuthContext.tsx           ← authentication state (Supabase session)
  EmailContext.tsx          ← email data & actions
lib/
  supabase.ts               ← Supabase client (AsyncStorage for native)
  supabase-config.ts        ← URL and anon key (from env vars)
  api-base.ts               ← Supabase Edge Function URL mapping
  preferences.ts            ← user preferences helpers
  pkce.ts                   ← OAuth PKCE helpers (expo-crypto)
server/
  expo-proxy.js             ← dev server proxy (Replit-specific, port 5000 → Metro)
```

## Running on Replit

The `artifacts/afumail: expo` workflow starts the Expo development server.

To preview the app on your phone, install the **Expo Go** app and scan the QR code shown in the workflow logs.

## Environment variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `EXPO_PUBLIC_DOMAIN` | Replit development domain (set automatically in the workflow) |
