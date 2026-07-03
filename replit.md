# AfuMail

A private email platform built for the Afu community. Users get a `username@afuchat.com` identity used across AfuChat, AfuCloud, and other Afu products.

## Monorepo structure

```
artifacts/
  afumail/        ← React Native mobile app (Android & iOS)
  website/        ← Web app (browser, mail.afuchat.com)
  api-server/     ← Node.js/Express REST + OAuth API server
lib/
  db/             ← Drizzle ORM schema & Supabase database client
  api-spec/       ← OpenAPI specification (source of truth)
  api-client-react/ ← Auto-generated React Query hooks (from spec)
  api-zod/        ← Auto-generated Zod schemas (from spec)
supabase/         ← Edge Functions (send-email, reset-password)
scripts/          ← Monorepo utilities
```

## Running the project

| Workflow | Port | What it does |
|---|---|---|
| `artifacts/afumail: expo` | 5000 | Expo mobile dev server (native Android/iOS) |
| `artifacts/website: web` | 3000 | Website (landing page / web app) |
| `artifacts/api-server: API Server` | 8080 | REST + OAuth API |

## Apps overview

### Mobile app (`artifacts/afumail/`)
React Native with Expo Router. Dark-themed native UI for Android and iOS. Uses `AsyncStorage` for Supabase session persistence. See `artifacts/afumail/README.md` for details.

### Website (`artifacts/website/`)
Expo web-only build. Serves the landing page (from `server/templates/landing-page.html`) until the web app is built (`pnpm --filter @workspace/website run build`). Uses browser `localStorage` for sessions. See `artifacts/website/README.md` for details.

### API server (`artifacts/api-server/`)
Express 5 + TypeScript. Implements the OpenAPI spec in `lib/api-spec/openapi.yaml`. Includes OAuth 2.1 / OIDC identity provider endpoints.

## Key environment variables

| Variable | Used by |
|---|---|
| `SUPABASE_URL` | API server |
| `SUPABASE_SERVICE_ROLE_KEY` | API server (secret) |
| `SUPABASE_DB_URL` | Drizzle ORM (secret) |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile app + website |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile app + website (secret) |
| `EXPO_PUBLIC_SITE_URL` | Mobile app + website |

## Package manager

`pnpm` with workspaces. Always use `pnpm` — the preinstall script rejects `npm` and `yarn`.

## Code generation

After changing `lib/api-spec/openapi.yaml`, regenerate client code:
```bash
pnpm --filter @workspace/api-spec run codegen
```

## User preferences

- Keep the mobile app (`artifacts/afumail/`) and website (`artifacts/website/`) fully separated — no shared app code between them (shared infrastructure lives in `lib/`).
- Do not migrate to a different package manager or restructure the monorepo.
