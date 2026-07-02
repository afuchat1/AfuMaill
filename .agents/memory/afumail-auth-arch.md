---
name: AfuMail auth architecture
description: How authentication, identity, and password reset work in AfuMail
---

## Identity model
- Supabase auth email = `username@afuchat.com` (the user's AfuMail address)
- `profiles.notification_email` = user's real external email (Gmail, Outlook, etc.) — collected during registration step 3
- `profiles.recovery_email` = another AfuMail user linked as a recovery contact (internal, separate concept)

## Password reset flow
1. User enters their @afuchat.com username on the forgot-password screen
2. App calls `supabase.functions.invoke("reset-password", { username })` 
3. Edge Function: looks up profile by username → gets `notification_email` → calls Supabase Auth Admin `POST /auth/v1/admin/generate_link` with the user's real auth email → sends link via Resend to `notification_email`
4. User clicks link in real inbox → browser opens app at `site_url` with `#access_token=...&type=recovery`
5. `detectSessionInUrl: true` in Supabase client makes the client pick up the token automatically
6. `onAuthStateChange` fires with `PASSWORD_RECOVERY` event → `AuthContext` sets `isPasswordRecovery=true`
7. Root layout detects `isPasswordRecovery` and navigates to `/(auth)/set-new-password`
8. User sets new password → `supabase.auth.updateUser({ password })` → `clearPasswordRecovery()` called

## Supabase SMTP
Configured with Resend SMTP: host=smtp.resend.com, port=465, user=resend, sender=noreply@afuchat.com.
`site_url` = Replit dev domain (must match where reset link lands).

**Why:** Auth emails (including reset links) go nowhere without custom SMTP; afuchat.com is verified in Resend so all sending works from that domain.

## detectSessionInUrl
Must be `true` in the Supabase client for the web password reset flow to work. Was previously `false` — changing it enables Supabase to parse the `#access_token` hash from the reset link URL.
