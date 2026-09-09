---
name: AfuMail live schema
description: The live Supabase schema and the stale bootstrap SQL file can diverge.
---

The AfuMail Supabase project currently uses normalized `email_addresses`, `folders`, `user_settings`, `calendar_events`, and relationship-based `emails` rows. The checked-in `supabase-setup.sql` is an older flat-schema bootstrap and must not be treated as the live source of truth.

**Why:** A native audit found the production database had the normalized tables, foreign-key names, RPCs, and RLS policies required by the current app even though the local SQL snapshot described a different model.

**How to apply:** Before changing native Supabase queries, inspect the live project schema with the Supabase project access token and verify relationship names, RPC existence, RLS, and row-link integrity. Prefer app fallbacks for legacy rows rather than assuming every account has a primary address.