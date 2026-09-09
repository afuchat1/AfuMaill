---
name: AfuMail OAuth production hardening
description: Conventions for the OAuth 2.1/OIDC endpoints and canonical-domain enforcement, so future mobile changes stay consistent.
---

## Error contract
All `/api/oauth/*` responses use a single `oauthError(res, status, error, description?)` helper in `oauth.ts` returning `{ error, error_description }` per RFC 6749 §5.2. Any new OAuth error path must go through this helper, not ad hoc `res.status().json()`.

**Why:** third-party integrators rely on one documented, consistent error shape rather than guessing endpoint-by-endpoint conventions.

## `state` is mandatory
`state` on `POST /oauth/authorize` is required, not optional — missing/non-string values are rejected with `invalid_request`.

**Why:** an optional `state` leaves a CSRF gap (RFC 6749 §10.12). The mobile app's `authorize.tsx` doesn't validate `state` client-side, but the backend enforces it, so there is no actual security gap — only a UX nicety left undone on mobile.

## Mobile consent screen
The mobile OAuth consent screen must preserve the backend's required `state` contract. If OAuth request parameters change, update the native consent flow and the Supabase Edge Function together.

## Canonical domain enforcement
The mobile OAuth flow uses the canonical AfuMail domain for hosted authorization and callback URLs. Keep non-idempotent OAuth requests on their original endpoint; never silently redirect POST/PUT/DELETE requests.

**How to apply:** don't add new domain-dependent logic without checking these two enforcement points; they only trigger when `NODE_ENV === "production"`.

## Developer self-service app registration
OAuth clients are registered through the mobile developer flow and persisted by the Supabase `developer-apps` Edge Function. Every `oauth_clients` row has ownership, client type, secret hash, and status fields.

**Why:** letting anyone mint a trusted OAuth client with no ownership or secret model was the actual gap; self-service still needs strict ownership checks (`requireOwnedApp`) so one developer can never read/edit/delete another's app, and `status` lets AfuMail suspend an abusive app without deleting history.

**How to apply:** `client_secret` is generated once and only its SHA-256 hash is stored — there is no "view secret" endpoint, only rotate. Any endpoint that authenticates a client (`/oauth/authorize`, `/oauth/token`, `GET /oauth/clients/:id`) must check `client.status === 'active'`, and `/oauth/token` must call `verifyClientSecret()` for confidential clients on both grant types. `client_type` is immutable after creation — changing it would silently change an already-integrated app's trust model, so PATCH doesn't allow it.
