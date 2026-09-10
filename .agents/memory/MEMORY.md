# Memory Index

- [Reanimated runOnJS crashes](reanimated-runonjs-function-args.md) — passing a function as an *argument* to runOnJS(fn)(arg) from a worklet crashes; plain no-arg/primitive-arg calls are fine.
- [RN Web deprecation warnings](rn-web-style-deprecations.md) — shadow* style props and the `pointerEvents` prop are deprecated on RN Web; use `boxShadow` and `style.pointerEvents` instead.
- [AfuMail Edge Functions](afumail-edge-functions.md) — send-email and reset-password deployed; no esm.sh imports (DNS blocked in Replit build env); use native fetch + Supabase REST API directly.
- [Supabase edge function URL routing](supabase-edge-fn-routing.md) — functions receive pathname as `/<fn-name>/<rest>`, NOT `/functions/v1/<fn-name>/<rest>`; strip just the fn-name prefix in extractPath.
- [AfuMail auth architecture](afumail-auth-arch.md) — auth email = username@afuchat.com; real email stored as notification_email in profiles for password resets; detectSessionInUrl must be true for web reset flow.
- [AfuMail OAuth production hardening](afumail-oauth-hardening.md) — RFC 6749 error contract, mandatory `state`, rate limiting, and canonical-domain handling for the mobile OAuth flow.
- [AfuMail native and web boundary](afumail-native-only-boundary.md) — the Expo artifact supports native mail client flows plus an Expo Web preview; avoid adding unrelated website product surfaces.
- [AfuMail inbound email body should stay HTML](afumail-html-email-bodies.md) — receive-email must store raw HTML, not flattened text, or image-heavy emails look blank.
- [AfuMail live schema](afumail-live-schema.md) — the live Supabase database uses normalized email tables and relationships; the checked-in bootstrap SQL is stale.
- [AfuMail Expo preview](afumail-expo-preview.md) — the managed workflow serves Expo Web on the browser preview while retaining Expo Go QR access for native checks.
- [AfuMail SDK 57 maintenance](afumail-sdk57-maintenance.md) — Expo Go and Expo Web share one SDK 57 dependency line; verify both through the managed workflow.
- [AfuMail workspace dependency alignment](afumail-workspace-dependency-alignment.md) — after dependency or lockfile changes, reinstall the workspace so the linked Expo runtime matches the committed SDK line.
- [AfuMail AI model availability](afumail-ai-model-availability.md) — use Engagera Pro for all mail-assist modes; Lite may not be enabled for the account.
- [AfuMail sender display names](afumail-sender-display-names.md) — internal mail uses the sender profile name; external fallback uses a recognizable domain brand.
- [AfuMail Expo proxy working directory](afumail-expo-proxy-cwd.md) — Metro must launch from the artifact directory; stale port 8099 processes can make the preview appear blank.
