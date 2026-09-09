# Memory Index

- [Reanimated runOnJS crashes](reanimated-runonjs-function-args.md) — passing a function as an *argument* to runOnJS(fn)(arg) from a worklet crashes; plain no-arg/primitive-arg calls are fine.
- [RN Web deprecation warnings](rn-web-style-deprecations.md) — shadow* style props and the `pointerEvents` prop are deprecated on RN Web; use `boxShadow` and `style.pointerEvents` instead.
- [AfuMail Edge Functions](afumail-edge-functions.md) — send-email and reset-password deployed; no esm.sh imports (DNS blocked in Replit build env); use native fetch + Supabase REST API directly.
- [Supabase edge function URL routing](supabase-edge-fn-routing.md) — functions receive pathname as `/<fn-name>/<rest>`, NOT `/functions/v1/<fn-name>/<rest>`; strip just the fn-name prefix in extractPath.
- [AfuMail auth architecture](afumail-auth-arch.md) — auth email = username@afuchat.com; real email stored as notification_email in profiles for password resets; detectSessionInUrl must be true for web reset flow.
- [AfuMail OAuth production hardening](afumail-oauth-hardening.md) — RFC 6749 error contract, mandatory `state`, rate limiting, and canonical-domain handling for the mobile OAuth flow.
- [AfuMail native-only boundary](afumail-native-only-boundary.md) — the Expo artifact excludes website routes/config/dependencies; retain native mailto, WebView email rendering, and device-safe layouts.
- [AfuMail inbound email body should stay HTML](afumail-html-email-bodies.md) — receive-email must store raw HTML, not flattened text, or image-heavy emails look blank.
- [AfuMail live schema](afumail-live-schema.md) — the live Supabase database uses normalized email tables and relationships; the checked-in bootstrap SQL is stale.
- [AfuMail Expo preview](afumail-expo-preview.md) — native preview runs through the Expo workflow, not the web screenshot port; Metro can run despite the DevTools shared-library warning.
