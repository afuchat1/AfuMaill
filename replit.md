# AfuMail

A private email platform built for the Afu community. Users get a `username@afuchat.com` identity used across AfuChat, AfuCloud, and other Afu products.

## Monorepo structure

```
artifacts/
  afumail/    ← React Native / Expo mobile app (Android, iOS, web)
  website/    ← Web app (static Expo web export + dev proxy)
lib/
  db/         ← Drizzle ORM schema & Supabase Postgres client
  api-spec/   ← OpenAPI specification (source of truth)
  api-zod/    ← Auto-generated Zod schemas (from spec)
supabase/
  functions/  ← All backend logic lives here as Deno Edge Functions
  migrations/ ← SQL migrations
scripts/      ← Monorepo utilities
```

## Running the project

| Workflow | Port | What it does |
|---|---|---|
| `artifacts/afumail: expo` | 8099 | Expo Metro bundler — mobile app |
| `artifacts/website: web` | 3000 | Dev proxy forwarding to port 8099 |

Click **Run** to start both. No backend to start — apps talk directly to Supabase.

## Architecture

**Supabase only — no custom API server.** Every server-side operation runs as a Supabase Edge Function in `supabase/functions/`. The apps never call a custom Node.js/Express/Fastify backend.

See `DEVELOPMENT.md` for the full guide: architecture, edge functions, auth flow, port rules, patterns, and what not to do.

## User preferences

- Keep `artifacts/afumail` and `artifacts/website` app code fully separated — shared infrastructure goes in `lib/` only.
- Never add a custom API server. All backend logic must be a Supabase Edge Function.
- Do not migrate to a different package manager or restructure the monorepo.
- Do not use `esm.sh` imports in Edge Functions (DNS blocked in Replit build environment).
- Always use `pnpm` — the preinstall script rejects `npm` and `yarn`.
