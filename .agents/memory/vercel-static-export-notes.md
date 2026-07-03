---
name: Vercel deploy notes for the Expo static website
description: Node WebSocket crash during `expo export --platform web`, and the vercel.json routing contract used for artifacts/website.
---

## Static export crashes on Node < 22
`expo export --platform web` runs SSR/prerendering in a real Node process. If any module eagerly constructs a Supabase client, `@supabase/realtime-js` throws `"Node.js 20 detected without native WebSocket support"` at client construction time (not lazily), which fails the whole export.

**Fix applied:** in `artifacts/website/lib/supabase.ts`, pass `ws` as the realtime transport when `typeof WebSocket === "undefined"` (Node build context), otherwise leave it undefined (browser has native WebSocket). Required adding `ws`/`@types/ws` as deps of `@workspace/website`.

**Why:** this crash is independent of Vercel — it reproduces on any Node < 22 build machine — so fixing it at the code level (rather than pinning Vercel's Node version) makes the build portable.

## vercel.json contract (artifacts/website/vercel.json)
- `buildCommand: "pnpm run build"`, `outputDirectory: "dist"` — Vercel Root Directory should be set to `artifacts/website`; Vercel auto-detects the pnpm workspace root and installs from there.
- Static export produces flat `.html` files per route (`index.html`, `login.html`, `+not-found.html`, `_sitemap.html`) — `cleanUrls: true` lets `/login` resolve `login.html`.
- Rewrite `/api-server/(.*) → https://api.mail.afuchat.com/$1`: the app's client code (`lib/api-base.ts` in both website and afumail) expects the API to be reachable at a same-origin `/api-server/*` path in production (reverse-proxy contract), but the actual deployed API server domain used elsewhere in the codebase (docs, CORS allowlist) is the subdomain `api.mail.afuchat.com`. The vercel.json rewrite reconciles these two without touching client code.
- Catch-all rewrite for extensionless unmatched paths → `/index.html`, mirroring the SPA-fallback logic already implemented in `artifacts/website/server/serve.js` (used for the Replit dev/prod Node server).
