# AfuMail Mobile Development Guide

## Product

AfuMail is a private email platform for the Afu community. Every user gets a
`username@afuchat.com` address that works across Afu products.

This repository contains the Expo mobile app only:

```
artifacts/afumail/   React Native / Expo app for Android and iOS
supabase/functions/  Supabase Edge Functions
supabase/migrations/ Supabase database migrations
lib/                 Shared database and schema packages
scripts/             Workspace utility scripts
```

## Running on Replit

Run the `artifacts/afumail: expo` workflow. It starts the Expo preview on port
8099:

```sh
pnpm --filter @workspace/afumail run dev
```

Preview the app with Expo Go by scanning the QR code in the workflow logs.

## Architecture

- **Client:** React Native with Expo Router.
- **Authentication and data:** Supabase.
- **Server-side behavior:** Supabase Edge Functions only.
- **Email updates:** Supabase Realtime.
- **Package manager:** pnpm.

Do not add a custom Node, Express, or Fastify API server. New server-side
operations belong in `supabase/functions/`.

## Important rules

- Keep the mobile workflow on port 8099.
- Use pnpm; npm and yarn are not supported.
- Do not import Edge Function dependencies from `esm.sh`; use native fetch and
  the Supabase REST APIs when a package is unavailable in the Edge runtime.
- Store inbound email bodies as raw HTML so image-heavy messages render
  correctly.
- Keep secrets in Replit Secrets and never commit them.

## Mobile app structure

- `artifacts/afumail/app/` — Expo Router screens and route layouts.
- `artifacts/afumail/components/` — reusable UI and navigation components.
- `artifacts/afumail/context/` — auth and email state.
- `artifacts/afumail/lib/` — Supabase, OAuth, preferences, and API helpers.
- `supabase/functions/` — deployed Edge Functions.

## Checks

Run the mobile typecheck before delivering code changes:

```sh
pnpm --filter @workspace/afumail run typecheck
```