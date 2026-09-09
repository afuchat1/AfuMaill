# AfuMail

A private email platform for the Afu community. Every user gets a `username@afuchat.com` address that works across AfuChat, AfuCloud, and other Afu products.

## How to run

The `artifacts/afumail: expo` workflow starts the Expo mobile app on port **8099**.
Click **Run** to start it. No secrets are required — the app connects to the live
Supabase project by default.

## Stack

- **Frontend:** React Native / Expo (shared bundle for mobile + web)
- **Backend:** Supabase exclusively (no custom API server)
  - Auth, Postgres DB, and Edge Functions (Deno/TypeScript in `supabase/functions/`)
- **Package manager:** pnpm with workspaces
- **Schema:** Drizzle ORM (`lib/db/`)

## Structure

```
artifacts/afumail/   ← Expo mobile app (Android and iOS)
lib/                 ← Shared DB schema, OpenAPI spec, Zod models
supabase/functions/  ← Edge Functions: oauth, send-email, receive-email, reset-password, ai-assist, developer-apps
```

## Key rules (from DEVELOPMENT.md)

- **No custom API server.** All server-side logic must be a Supabase Edge Function.
- **Port 8099** is hardwired to the mobile artifact. Never reassign it.
- Use `pnpm` only — `npm`/`yarn` are rejected by a `preinstall` guard.
- Do not import from `esm.sh` in Edge Functions (DNS blocked in Replit build env).
- Store inbound email bodies as raw HTML — never flatten to plain text.

## Optional secrets

To point to a different Supabase project set these in Replit Secrets:

| Secret | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Override Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Override Supabase anon key |

## User preferences

<!-- Add remembered preferences here -->
