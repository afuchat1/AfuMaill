---
name: AfuMail Edge Functions
description: Patterns and constraints for deploying Supabase Edge Functions in this project
---

## Deployed functions
- `send-email` — sends outbound email via Resend API
- `reset-password` — generates Supabase admin reset link + emails it via Resend to user's notification_email

## Critical constraint: no esm.sh imports
Replit's build sandbox has no outbound DNS during the Edge Function bundle step. Any `import ... from "https://esm.sh/..."` causes a fatal DNS resolution error at deploy time. **Always use native Deno `fetch` + raw REST API calls** instead of importing supabase-js or any other npm-via-esm.sh package.

**Why:** The Deno bundler runs in the sandbox during `supabase functions deploy` and tries to resolve all remote imports at build time. The sandbox blocks outbound DNS.

**How to apply:** For Supabase admin operations in Edge Functions, use:
- PostgREST: `GET/POST {PROJECT_URL}/rest/v1/{table}?...` with `apikey` + `Authorization: Bearer {SVC_ROLE_KEY}` headers
- Auth admin: `POST {PROJECT_URL}/auth/v1/admin/generate_link` with same headers
- Resend: `POST https://api.resend.com/emails` with `Authorization: Bearer {RESEND_API_KEY}`

## Secrets
- `RESEND_API_KEY` — Resend key for sending emails
- `SVC_ROLE_KEY` — Supabase service role key (cannot start with SUPABASE_)
- `PROJECT_URL` — Supabase project URL (cannot start with SUPABASE_)
