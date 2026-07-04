---
name: AfuMail OAuth production hardening
description: Conventions for the OAuth 2.1/OIDC endpoints in artifacts/api-server and canonical-domain enforcement, so future changes stay consistent.
---

## Error contract
All `/api/oauth/*` responses use a single `oauthError(res, status, error, description?)` helper in `oauth.ts` returning `{ error, error_description }` per RFC 6749 §5.2. Any new OAuth error path must go through this helper, not ad hoc `res.status().json()`.

**Why:** third-party integrators rely on one documented, consistent error shape rather than guessing endpoint-by-endpoint conventions.

## `state` is mandatory
`state` on `POST /oauth/authorize` is required, not optional — missing/non-string values are rejected with `invalid_request`. The website's `oauth/authorize.tsx` also validates client-side before ever hitting the backend.

**Why:** an optional `state` leaves a CSRF gap (RFC 6749 §10.12). The mobile app's `authorize.tsx` doesn't validate `state` client-side, but the backend enforces it, so there is no actual security gap — only a UX nicety left undone on mobile.

## Consent screens exist on both platforms
Both `artifacts/afumail/app/oauth/authorize.tsx` (mobile) and `artifacts/website/app/oauth/authorize.tsx` (web) must exist and stay in sync for the third-party OAuth flow to work — the web one was previously missing entirely despite docs describing it. If OAuth docs/flows change, check both.

## Canonical domain enforcement
- Website (`server/serve.js`): in production, any request host other than `CANONICAL_WEB_HOST` (default `mail.afuchat.com`) gets a 301 redirect, except requests carrying an `expo-platform` header (native app manifest/update checks, which may legitimately hit a different host).
- API server (`app.ts`): in production, only GET requests on a non-canonical host (`CANONICAL_API_HOST`, default `api.mail.afuchat.com`) get redirected. POST/PUT/DELETE are never redirected — some HTTP clients don't safely replay bodies across a 301, and OAuth token/authorize calls must not be silently rerouted.

**How to apply:** don't add new domain-dependent logic without checking these two enforcement points; they only trigger when `NODE_ENV === "production"`.

## Local testing caveat
The website's `dev` workflow (`pnpm --filter @workspace/website run dev`) runs `server/serve.js`, which serves a **pre-built static export** (`dist/`), not a live Metro/Expo dev server. After editing any route under `artifacts/website/app/`, you must run `npx expo export --platform web` (or `pnpm --filter @workspace/website run build`) inside `artifacts/website` and restart the workflow before the change is visible in preview.

Also, `lib/api-base.ts` intentionally falls back to the production API domain (`https://mail.afuchat.com/api-server`) whenever `EXPO_PUBLIC_DOMAIN` isn't set at build time — this is deliberate (never leak dev domains), but it means OAuth flows can't be fully exercised end-to-end from the Replit preview alone; CORS will reject the production API when called from a `localhost`/dev-preview origin.
