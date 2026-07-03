---
name: AfuMail Edge Functions
description: Deployment quirks and design decisions for AfuMail's Supabase edge functions.
---

## Deployment: PATCH is unreliable — use DELETE + POST

`PATCH /v1/projects/{ref}/functions/{slug}` returns 200 ACTIVE but the old function keeps running.
**Always use DELETE then POST to `/v1/projects/{ref}/functions`** when updating a function.

**Why:** Supabase edge function updates via PATCH appear to be cached aggressively; only a delete + recreate forces the new code to run.

**How to apply:** Any time a function change needs to be live, run DELETE first, wait 2s, then POST to create.

## Critical constraint: no esm.sh imports
Replit's build sandbox has no outbound DNS during the Edge Function bundle step. Any `import ... from "https://esm.sh/..."` causes a fatal DNS resolution error at deploy time. **Always use native Deno `fetch` + raw REST API calls**.

**How to apply:** For Supabase admin operations in Edge Functions, use:
- PostgREST: `GET/POST {PROJECT_URL}/rest/v1/{table}?...` with `apikey` + `Authorization: Bearer {SVC_ROLE_KEY}` headers
- Auth admin: `POST {PROJECT_URL}/auth/v1/admin/generate_link` with same headers
- Resend: `POST https://api.resend.com/emails` with `Authorization: Bearer {RESEND_API_KEY}`

## send-email: internal delivery design

- Splits recipients into `internalAll` (@afuchat.com) and `externalTo` (everything else)
- Internal: direct DB insert → `inbox` for recipients, `sent` for sender (both with full body)
- External: Resend API (plain text body)
- Returns `{"ok":true}` for all-internal sends, Resend response for external
- Uses helper functions `getOwnerId` / `insertEmail` to avoid repetition

## receive-email: empty body fallback

External emails arrive from Resend's inbound webhook with empty `text`/`html` fields.
Updated to also check field aliases: `body_html`, `htmlBody`, `plain`, `body_text`, `textBody`.
If all are empty but `email_id` is present, fetches full content from `GET https://api.resend.com/emails/{email_id}` using `RESEND_API_KEY`.

## reset-password: real error messages (not silent ok)

Returns real HTTP error codes with descriptive messages:
- No account found: 404 `"No account found with that username."`
- No recovery email: 400 `"No recovery email is set for this account. Please sign in and add one under Settings → Account."`
Previously returned silent `{"ok":true}` (anti-enumeration). Changed because this is a closed internal app — enumeration risk doesn't apply.

## Secrets (all set in Supabase dashboard)
- `RESEND_API_KEY` — Resend key for sending emails
- `SVC_ROLE_KEY` — Supabase service role key (cannot start with SUPABASE_)
- `PROJECT_URL` — Supabase project URL (cannot start with SUPABASE_)
