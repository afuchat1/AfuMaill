---
name: AfuMail live schema
description: The live Supabase schema and the stale bootstrap SQL file can diverge.
---

The AfuMail Supabase project currently uses normalized `email_addresses`, `folders`, `user_settings`, `calendar_events`, and relationship-based `emails` rows. The checked-in `supabase-setup.sql` is an older flat-schema bootstrap and must not be treated as the live source of truth.

**Why:** A native audit found the production database had the normalized tables, foreign-key names, RPCs, and RLS policies required by the current app even though the local SQL snapshot described a different model.

**How to apply:** Before changing native Supabase queries, inspect the live project schema with the Supabase project access token and verify relationship names, RPC existence, RLS, and row-link integrity. Prefer app fallbacks for legacy rows rather than assuming every account has a primary address.

The checked-in migrations are now the authoritative local ledger for the native app contract. Keep migration versions unique and use idempotent `if not exists`/policy replacement statements when reconciling a database that was provisioned by an older project history.

**Why:** The remote project had an older migration history that was not present in the repository, and duplicate local timestamps prevented Supabase from safely applying the current schema additions.

**How to apply:** Run `supabase migration list` before pushing. If the project reports legacy remote versions missing locally, repair only those history records as reverted, then dry-run and apply the current local migrations with `--include-all`.