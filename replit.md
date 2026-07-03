# AfuMail

AfuMail is the identity and email platform for the Afu ecosystem. Every user creates one AfuMail account used across all Afu products.

- **Web app:** https://mail.afuchat.com
- **Email identity:** `username@afuchat.com`
- **Supabase project:** `lqowocmjmhbkoxlwyxku` (eu-central-1)

## Run & Operate

### Install dependencies (first time / after pulling)
```
pnpm install
```

### API server (port 8080)
```
pnpm --filter @workspace/api-server run dev
```
Use the **artifacts/api-server: API Server** workflow in Replit.

### Mobile app (Expo, port 5000 preview)
```
pnpm --filter @workspace/afumail run dev
```
Use the **artifacts/afumail: expo** workflow in Replit (mobile phone frame preview).
Scan the QR code with Expo Go for native mobile.

### Website (desktop web, port 3000 → external port 80)
Use the **AfuMail Website** workflow in Replit.
Proxies port 3000 → Expo Web at port 8099. Shows in desktop layout.
`artifacts/afumail/server/web-proxy.js` handles the forwarding with EADDRINUSE retry.

### Other commands
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push Drizzle schema changes to Supabase Postgres

## Environment variables (all stored in Replit shared env)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key (safe to expose in client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key — API server only, never expose to client |
| `SUPABASE_DB_URL` | Direct Postgres pooler connection string (Drizzle ORM) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase URL for Expo client |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key for Expo client |
| `EXPO_PUBLIC_SITE_URL` | `https://mail.afuchat.com` |
| `SESSION_SECRET` | Session signing key |

> **DATABASE_URL** is runtime-managed by Replit. The db lib uses `SUPABASE_DB_URL` instead.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **API:** Express 5, port 8080
- **Mobile/Web:** Expo (React Native + expo-router), port 8099
- **DB:** Supabase Postgres + Drizzle ORM
- **Auth:** Supabase Auth (email = `username@afuchat.com`)
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API codegen:** Orval (from OpenAPI spec)
- **Build:** esbuild (CJS bundle)

## Where things live

| Path | What it is |
|---|---|
| `artifacts/api-server/` | Express API server |
| `artifacts/afumail/` | Expo mobile + web app |
| `artifacts/mockup-sandbox/` | Vite component preview (canvas) |
| `lib/db/` | Drizzle schema + DB client (`SUPABASE_DB_URL`) |
| `lib/api-spec/` | OpenAPI spec (source of truth for API shape) |
| `lib/api-client-react/` | Generated React Query hooks |
| `lib/api-zod/` | Generated Zod validators |
| `artifacts/afumail/lib/supabase.ts` | Supabase client + auth helpers |
| `artifacts/afumail/lib/supabase-config.ts` | Supabase URL + anon key (from env vars) |
| `supabase/functions/` | Supabase Edge Functions |
| `supabase-setup.sql` | One-time SQL to run in Supabase SQL editor |

## Architecture decisions

- **One backend, one auth system.** Supabase is the single identity provider. No separate auth for mobile vs web.
- **Auth email = AfuMail address.** Supabase auth email is `username@afuchat.com`. Real contact email stored as `profiles.notification_email`.
- **Subdomain for web.** The web app lives at `mail.afuchat.com`; email addresses remain `@afuchat.com`.
- **Drizzle ORM uses `SUPABASE_DB_URL`** (not `DATABASE_URL`, which Replit reserves for its own Postgres).
- **CORS** on the API server allows `mail.afuchat.com` and `*.replit.dev` (dev preview).

## Product

AfuMail is a full email platform and identity provider for the Afu ecosystem. Users sign up with a `username@afuchat.com` address and use that identity across all Afu apps (AfuChat, AfuCloud, Engagera, MMRadio, etc.).

## User preferences

- Do not migrate or restructure the project — keep existing stack and layout.
- Domain: `mail.afuchat.com` for web, `@afuchat.com` for email addresses.
- Use the Supabase PAT `sbp_e634aa9f820a48a8e2ecbec32e569a05f79f5186` to configure Supabase automatically.

## Gotchas

- Always run `pnpm install` from the workspace root.
- `DATABASE_URL` is reserved by Replit — use `SUPABASE_DB_URL` for Supabase Postgres.
- `detectSessionInUrl: true` must stay in the Supabase client — required for web password reset flow.
- Auth emails use `username@afuchat.com`; notification/reset emails go to `profiles.notification_email` (user's real external email).
- Supabase SMTP is configured via Resend (smtp.resend.com:465, sender `noreply@afuchat.com`).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- See `supabase-setup.sql` for the full DB schema — run once in the Supabase SQL editor.
- See `artifacts/afumail/lib/supabase.ts` for all auth helpers and Supabase calls.
