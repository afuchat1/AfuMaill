# Memory Index

- [Reanimated runOnJS crashes](reanimated-runonjs-function-args.md) — passing a function as an *argument* to runOnJS(fn)(arg) from a worklet crashes; plain no-arg/primitive-arg calls are fine.
- [RN Web deprecation warnings](rn-web-style-deprecations.md) — shadow* style props and the `pointerEvents` prop are deprecated on RN Web; use `boxShadow` and `style.pointerEvents` instead.
- [AfuMail Edge Functions](afumail-edge-functions.md) — send-email and reset-password deployed; no esm.sh imports (DNS blocked in Replit build env); use native fetch + Supabase REST API directly.
- [AfuMail auth architecture](afumail-auth-arch.md) — auth email = username@afuchat.com; real email stored as notification_email in profiles for password resets; detectSessionInUrl must be true for web reset flow.
