---
name: AfuMail auth architecture
description: How authentication, identity, and password reset work in AfuMail
---

## Identity model
- Supabase auth email = `username@afuchat.com` (the user's AfuMail address)
- `profiles.notification_email` = user's real external email (Gmail, Outlook, etc.) — collected during registration step 3
- `profiles.recovery_email` = another AfuMail user linked as a recovery contact (internal, separate concept)

## Password reset flow
1. User enters only the external recovery email saved in `profiles.notification_email` on the forgot-password screen.
2. App calls the `reset-password` Edge Function with `{ action: "request", recoveryEmail }`.
3. Edge Function looks up the matching AfuMail account, creates a short-lived six-digit code, stores only its hash, and sends the code through Resend using AfuMail branding.
4. User enters the six-digit code and a new password in the app.
5. Edge Function validates the code, updates the Supabase Auth password with the service role, and marks the code as used.
6. The native app does not accept Supabase recovery links or create password-recovery sessions.

## Supabase SMTP
Configured with Resend SMTP: host=smtp.resend.com, port=465, user=resend, sender=noreply@afuchat.com.
`site_url` = Replit dev domain (must match where reset link lands).

**Why:** The code email is sent directly through Resend so recovery stays inside the branded AfuMail experience; afuchat.com is verified in Resend so delivery works from that domain.

## Recovery link handling
The native app intentionally keeps `detectSessionInUrl` disabled. Password reset is code-only and is completed inside the branded AfuMail app.
