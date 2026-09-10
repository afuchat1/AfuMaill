---
name: AfuMail auth architecture
description: How authentication, identity, and password reset work in AfuMail
---

## Identity model
- Supabase auth email = `username@afuchat.com` (the user's AfuMail address)
- `profiles.recovery_email_address_id` = another existing AfuMail address linked as the recovery contact
- External-provider addresses must not be used for password recovery.

## Password reset flow
1. User enters the AfuChat email on their AfuMail profile on the forgot-password screen.
2. App calls the `reset-password` Edge Function with `{ action: "request", profileEmail }`.
3. Edge Function looks up the profile's linked address through `profiles.recovery_email_address_id`, returns the full delivery address, creates a short-lived six-digit code, stores only its hash, and sends the code through Resend using AfuMail branding.
4. The app tells the user to check the linked inbox, shows the delivery address, and accepts the six-digit code plus a new password.
5. Edge Function resolves the linked recovery address again, validates the code, updates the Supabase Auth password with the service role, and marks the code as used.
6. The native app does not accept Supabase recovery links or create password-recovery sessions.

Recovery address resolution must use the same normalized linked mailbox in both the profile UI and the reset Edge Function. If `full_email` is empty, fall back to `local_part@domain`; otherwise a valid database link can appear as unset and password reset will incorrectly stop.

The linked recovery mailbox belongs to another user, so normal `email_addresses` row-level security cannot be used to reload it from the profile screen. Profile reads must use the authenticated, security-definer recovery lookup rather than weakening mailbox policies.

**Why:** The save RPC can persist the foreign mailbox link while an owner-scoped address query returns no row, making the setting appear to disappear after reload.

**How to apply:** Keep recovery-address persistence in `set_recovery_email` and readback in `get_recovery_email`; do not grant users general read access to other users' `email_addresses` rows.

The unauthenticated password-reset Edge Function must resolve a linked recovery address by the stored address ID and domain, not by filtering that address to the AfuMail profile owner's user ID.

**Why:** A recovery mailbox is deliberately owned by a different AfuChat user; reusing the profile owner's `user_id` filter makes valid links look absent only after logout.

**How to apply:** Keep the service-role lookup constrained to the profile's stored `recovery_email_address_id` and `afuchat.com`; never broaden it to a general mailbox search.

The service-only `password_reset_codes` table needs explicit `service_role` table privileges in addition to client-role revocation.

**Why:** The reset Edge Function uses PostgREST with the service role, and relying only on RLS bypass left the live reset-attempt query denied in this project.

**How to apply:** When adding service-only tables used by Edge Functions, revoke client roles and explicitly grant the required operations to `service_role`.

## Supabase SMTP
Configured with Resend SMTP: host=smtp.resend.com, port=465, user=resend, sender=noreply@afuchat.com.
`site_url` = Replit dev domain (must match where reset link lands).

**Why:** The code email is sent directly through Resend so recovery stays inside the branded AfuMail experience; afuchat.com is verified in Resend so delivery works from that domain.

## Recovery link handling
The native app intentionally keeps `detectSessionInUrl` disabled. Password reset is code-only and is completed inside the branded AfuMail app.

## Legacy external aliases
Three old non-primary aliases use an external domain and are intentionally retained for now. They must never be exposed as recovery addresses, linked to profiles, or used by password reset; new external aliases are blocked at the database trigger.

**Why:** Removing old aliases could affect historical mail references, but allowing them in recovery would violate the AfuChat-only identity boundary.

**How to apply:** Treat only existing `@afuchat.com` rows as linkable/recoverable, and keep the legacy external rows out of all account and recovery flows.
