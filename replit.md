# AfuMail

A mobile email app built with Expo (React Native) backed by an Express 5 API server.

## Run & Operate

### Install dependencies (first time / after pulling)
```
pnpm install
```

### API server (port 8080)
```
pnpm --filter @workspace/api-server run dev
```
Or use the **artifacts/api-server: API Server** workflow in Replit.

### Mobile app (Expo, port 8099)
```
pnpm --filter @workspace/afumail run dev
```
Or use the **artifacts/afumail: expo** workflow in Replit.
Scan the QR code printed in the terminal with Expo Go on your phone, or press `w` to open the web version.

### Other commands
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to the database (dev only)

## Required environment variables

| Variable | Where set | Purpose |
|---|---|---|
| `DATABASE_URL` | Replit secret | Postgres connection string for the API server |
| `SESSION_SECRET` | Replit secret | Session signing key for the API server |

> **Note:** The API server starts without `DATABASE_URL` (only the health route is active), but any data-backed routes will fail until a database is provisioned and the env var is set.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **API:** Express 5, port 8080
- **Mobile:** Expo (React Native) with expo-router, port 8099
- **DB:** PostgreSQL + Drizzle ORM
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API codegen:** Orval (from OpenAPI spec)
- **Build:** esbuild (CJS bundle)

## Where things live

| Path | What it is |
|---|---|
| `artifacts/api-server/` | Express API server |
| `artifacts/afumail/` | Expo mobile app |
| `artifacts/mockup-sandbox/` | Vite component preview (canvas) |
| `lib/db/` | Drizzle schema + DB client |
| `lib/api-spec/` | OpenAPI spec (source of truth for API) |
| `lib/api-client-react/` | Generated React Query hooks |
| `lib/api-zod/` | Generated Zod validators |

## Architecture decisions

- API spec-first: edit `lib/api-spec/`, run codegen, then implement routes.
- DB schema lives in `lib/db/src/schema.ts`; push changes with `pnpm --filter @workspace/db run push`.
- Mobile app uses expo-router for file-based routing.

## Product

AfuMail is a mobile email application. See `attached_assets/` for the product identity and platform specification.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm install` from the workspace root (not inside a package directory) — the lockfile is at the root.
- The Expo dev server prints a QR code; use Expo Go on a physical device or press `w` for web preview.
- `DATABASE_URL` must be set before any DB-backed API routes will work.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
