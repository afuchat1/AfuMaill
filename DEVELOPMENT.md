# AfuMail — Development Guide

> **Rule #1:** This project uses **Supabase exclusively** as its backend. There is no custom API server, no Express, no Node.js backend of any kind. Every server-side operation runs as a Supabase Edge Function. This rule must never be broken.

---

## Table of Contents

1. [What is AfuMail?](#what-is-afumail)
2. [Monorepo Structure](#monorepo-structure)
3. [Running on Replit](#running-on-replit)
4. [Port Assignments (Strict)](#port-assignments-strict)
5. [Architecture](#architecture)
6. [Supabase Edge Functions](#supabase-edge-functions)
7. [Adding a New Edge Function](#adding-a-new-edge-function)
8. [Auth Flow](#auth-flow)
9. [Supabase Configuration](#supabase-configuration)
10. [Key Patterns](#key-patterns)
11. [Shared Libraries](#shared-libraries)
12. [Package Manager](#package-manager)
13. [Scripts](#scripts)
14. [What Not To Do](#what-not-to-do)

---

## What is AfuMail?

AfuMail is a private email platform for the Afu community. Every user gets a `username@afuchat.com` address that works across AfuChat, AfuCloud, and other Afu products. It ships as:

- A **mobile app** (Android & iOS via Expo) — `artifacts/afumail`
- A **web app** (browser, served at `mail.afuchat.com`) — `artifacts/website`

Both apps share the same Supabase project, the same Edge Functions, and the same auth system.

---

## Monorepo Structure

```
/
├── artifacts/
│   ├── afumail/          ← React Native / Expo mobile app (Android, iOS, web)
│   └── website/          ← Web app (static Expo web export + dev proxy)
│
├── lib/
│   ├── db/               ← Drizzle ORM schema & Supabase Postgres client
│   ├── api-spec/         ← OpenAPI spec (source of truth for contracts)
│   └── api-zod/          ← Zod schemas auto-generated from the OpenAPI spec
│
├── supabase/
│   ├── functions/        ← All Deno-based Edge Functions (deployed to Supabase)
│   │   ├── ai-assist/
│   │   ├── developer-apps/
│   │   ├── oauth/
│   │   ├── receive-email/
│   │   ├── reset-password/
│   │   └── send-email/
│   ├── migrations/       ← SQL migrations applied to Supabase Postgres
│   └── config.toml       ← Local Supabase CLI config
│
├── scripts/              ← Monorepo utility scripts
├── pnpm-workspace.yaml   ← Workspace + package security settings
├── PORT_ASSIGNMENT.md    ← Strict port rules (read this before touching workflows)
└── DEVELOPMENT.md        ← This file
```

---

## Running on Replit

Two workflows start the full development environment:

| Workflow | Port | What it does |
|---|---|---|
| `artifacts/afumail: expo` | **8099** | Expo Metro bundler — serves the mobile app |
| `artifacts/website: web` | **3000** | Dev proxy — forwards to port 8099 for the website frame |

Start both by clicking **Run** (the Project workflow starts them in parallel).

You do not need a running backend — both apps talk directly to the live Supabase project in the cloud.

---

## Port Assignments (Strict)

> These rules are permanent. Do not change port numbers, workflow commands, or proxy targets. See `PORT_ASSIGNMENT.md` for the full explanation.

| Port | Owner | Rule |
|---|---|---|
| **8099** | Expo Metro (mobile artifact) | Hardwired by Replit's mobile artifact infrastructure. `PORT=8099` is injected by the platform. |
| **3000** | `web-proxy.js` (website artifact) | Proxies every request to port 8099 so the website frame gets the same live bundle. |
| **5001** | Internal Expo Metro spawn | `expo-proxy.js` spawns Metro here internally; the proxy listens on 8099. Never reference 5001 externally. |

**Never:**
- Assign another service to ports 8099 or 3000.
- Use `serve.js` (the static server) as the website dev command — always use `web-proxy.js`.
- Change `TARGET_PORT` in `web-proxy.js` away from `8099`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Replit Preview                        │
│                                                         │
│  Mobile frame (port 8099)   Website frame (port 3000)   │
│         │                          │                    │
│         │                   web-proxy.js                │
│         │                          │                    │
│         └──────────── expo-proxy.js ──────────────────  │
│                            │                            │
│                     Expo Metro :5001                    │
└────────────────────────────┼────────────────────────────┘
                             │
                     React Native / Expo Router app
                             │
              ┌──────────────┴──────────────┐
              │                             │
      supabase-js client            supabase-js client
     (AsyncStorage session)       (localStorage session)
              │                             │
              └──────────────┬──────────────┘
                             │
                    Supabase Cloud
              ┌──────────────┼──────────────┐
              │              │              │
           Auth DB      Postgres      Edge Functions
                                  (oauth, send-email,
                                   receive-email, etc.)
```

**Key rule:** The apps never call a custom backend. All server logic lives in `supabase/functions/` and is deployed to Supabase. The apps call Edge Functions directly via the Supabase URL.

---

## Supabase Edge Functions

All functions live in `supabase/functions/`. They are written in **Deno (TypeScript)** and deployed via the Supabase CLI.

### `oauth`
Full OAuth 2.1 / OIDC Identity Provider. Handles:
- `GET  /oauth/.well-known/openid-configuration` — Discovery document
- `GET  /oauth/authorize` — Authorization endpoint (PKCE)
- `POST /oauth/token` — Token exchange
- `GET  /oauth/userinfo` — User info
- `POST /oauth/revoke` — Token revocation
- `POST /oauth/introspect` — Token introspection

JWT verification disabled (`verify_jwt = false`) — the function handles its own auth.

### `developer-apps`
CRUD for OAuth client registrations. Lets users register their own apps to use AfuMail as an identity provider.
- Requires a valid Supabase session (authenticated user).
- Stores clients in Postgres.

JWT verification disabled — function validates the caller's Supabase session manually.

### `send-email`
Routes outgoing email:
- **Internal** (`@afuchat.com` → `@afuchat.com`): writes directly to the recipient's Postgres inbox.
- **External**: sends via the Resend API.

JWT verification disabled — called by other functions and webhooks, not just the client.

### `receive-email`
Inbound email webhook, called by Resend (or similar). Parses the incoming message and delivers it to the correct `@afuchat.com` inbox in Postgres. Stores raw HTML body — do not flatten to text or image-heavy emails will appear blank.

### `reset-password`
Generates a Supabase recovery link and sends it to the user's `notification_email` (stored in the `profiles` table, not the Supabase auth email). Does not use the auth email because auth emails are `username@afuchat.com` which users cannot receive externally.

### `ai-assist`
Proxies to the Engagera API for AI-assisted email features: composition, smart replies, and summarization.

---

## Adding a New Edge Function

1. Create the function directory:
   ```bash
   mkdir supabase/functions/my-function
   touch supabase/functions/my-function/index.ts
   ```

2. Write the handler in `index.ts` using Deno and the native `fetch` API:
   ```typescript
   Deno.serve(async (req: Request) => {
     // your logic here
     return new Response(JSON.stringify({ ok: true }), {
       headers: { "Content-Type": "application/json" },
     });
   });
   ```

3. **Do not use `esm.sh` imports.** DNS for `esm.sh` is blocked in Replit's build environment. Use Deno's native APIs (`fetch`, `crypto`, etc.) or import from `jsr:` / `npm:` specifiers directly.

4. If the function needs the Supabase service role key, read it from `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` — Supabase injects this automatically for deployed functions.

5. Register JWT verification preference in `supabase/config.toml`:
   ```toml
   [functions.my-function]
   verify_jwt = false   # set true if you want Supabase to require a valid JWT
   ```

6. Deploy:
   ```bash
   supabase functions deploy my-function
   ```

7. To call it from the app, add a case to `lib/api-base.ts`:
   ```typescript
   export function apiUrl(path: string): string {
     let p = path.replace(/^\/api/, "");
     p = p.replace(/^\/my-route/, "/my-function");
     // ...
     return `${FUNCTIONS_BASE}${p}`;
   }
   ```

---

## Auth Flow

### Email / Password (primary)
- Auth email = `username@afuchat.com` (internal identity, not a real inbox)
- Real contact email = `notification_email` in the `profiles` table
- Password reset goes to `notification_email` via the `reset-password` edge function — never to the auth email

### OAuth 2.1 / PKCE
- The app implements PKCE locally (`lib/pkce.ts`)
- The `oauth` edge function is AfuMail acting **as an identity provider** for third-party apps
- `detectSessionInUrl: true` must remain set in the Supabase client — required for the web-based password-reset redirect flow

### Session Storage
| App | Storage |
|---|---|
| `artifacts/afumail` (mobile) | `AsyncStorage` |
| `artifacts/website` (web) | Browser `localStorage` |

---

## Supabase Configuration

Both apps share the same Supabase project. Config is in each app's `lib/supabase-config.ts`:

```typescript
// artifacts/afumail/lib/supabase-config.ts
// artifacts/website/lib/supabase-config.ts  (identical)

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? "https://lqowocmjmhbkoxlwyxku.supabase.co";

export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? "<hardcoded-anon-key>";
```

The hardcoded fallback values point to the live AfuMail Supabase project (`lqowocmjmhbkoxlwyxku`). No environment secrets are required to run in development — the apps work against the real project out of the box.

To point to a different Supabase project (e.g. a staging environment), set:

| Secret | Where |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Replit Secrets |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Replit Secrets |

---

## Key Patterns

### `lib/api-base.ts`

Both apps have an identical `lib/api-base.ts` that translates legacy path-style API calls into Supabase Edge Function URLs:

```typescript
import { SUPABASE_URL } from "@/lib/supabase-config";

const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

export function apiUrl(path: string): string {
  let p = path.replace(/^\/api/, "");
  p = p.replace(/^\/developer\/apps/, "/developer-apps");
  if (!p.startsWith("/")) p = `/${p}`;
  return `${FUNCTIONS_BASE}${p}`;
}
```

Use `apiUrl()` whenever calling an Edge Function from app code. Never hardcode the Supabase project URL directly in component or screen files.

### Responsive Layout

The app uses `useWindowDimensions()` to serve both frames from the same bundle:
- **≥ 768 px** (website frame) → full two-column desktop layout
- **< 768 px** (phone chrome) → auth-only mobile layout

### Inbound Email Bodies

The `receive-email` function stores raw HTML. Never convert to plain text — emails that are image-heavy or HTML-only will appear completely blank if the body is flattened.

---

## Shared Libraries

| Library | Purpose |
|---|---|
| `lib/db` | Drizzle ORM schema and Supabase Postgres client. Use for type-safe DB access from Edge Functions or scripts. |
| `lib/api-spec` | OpenAPI spec (`openapi.yaml`). Source of truth for any API contracts. |
| `lib/api-zod` | Zod schemas auto-generated from the OpenAPI spec. Regenerate after spec changes: `pnpm --filter @workspace/api-spec run codegen` |

---

## Package Manager

This project uses **pnpm** with workspaces. The `preinstall` script rejects `npm` and `yarn`.

```bash
# Install all dependencies
pnpm install

# Run a command in a specific package
pnpm --filter @workspace/afumail <command>
pnpm --filter @workspace/website <command>

# Build the website (required before the static server will serve the SPA)
pnpm --filter @workspace/website run build
```

### Supply-chain security

`pnpm-workspace.yaml` enforces a **1-day minimum release age** for all npm packages before they can be installed. Do not disable this setting. If you urgently need a package younger than 1 day, add it to the `minimumReleaseAgeExclude` list temporarily and remove it once the window has passed.

---

## Scripts

| Script | Location | What it does |
|---|---|---|
| `post-merge.sh` | `scripts/post-merge.sh` | Runs after every task-agent merge: `pnpm install` + `pnpm --filter db push` |

---

## What Not To Do

| ❌ Don't | ✅ Do instead |
|---|---|
| Add a Node.js / Express / Fastify API server | Write a Supabase Edge Function in `supabase/functions/` |
| Add environment variables like `DATABASE_URL` or `API_SECRET` to app code | Use Supabase service-role key inside Edge Functions only |
| Import from `esm.sh` in Edge Functions | Use Deno-native APIs, `jsr:`, or `npm:` specifiers |
| Hardcode the Supabase project URL in component files | Use `apiUrl()` from `lib/api-base.ts` |
| Change port 8099 or port 3000 assignments | Leave `PORT_ASSIGNMENT.md` rules exactly as they are |
| Use `npm` or `yarn` | Use `pnpm` |
| Flatten HTML email bodies to plain text | Store raw HTML in `receive-email` |
| Share app source code between `artifacts/afumail` and `artifacts/website` | Keep app code separate; put shared infrastructure in `lib/` |
