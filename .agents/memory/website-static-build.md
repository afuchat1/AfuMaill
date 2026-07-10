---
    name: Website static build
    description: Website serves a pre-built static export; dist/ must be rebuilt when missing. Vercel vs Replit use different base paths.
    ---

    The website artifact (artifacts/website) serves a static Expo export via server/serve.js.

    **Rule:** Before the preview or production site can show the app, run `pnpm --filter @workspace/website run build` to populate `artifacts/website/dist/`. If dist/ is missing, server falls back to the landing page template only.

    **Why:** The dev script runs node server/serve.js which serves pre-built files — it does NOT run a live bundler. The static export is gitignored and lost on container reprovision.

    **Dual base-path setup (app.config.js):**
    - Vercel (VERCEL=1 auto-injected): baseUrl="" → assets at /_expo/... ✓
    - Replit preview (no VERCEL): baseUrl="/site" → assets at /site/_expo/... which the artifact proxy forwards correctly ✓
    - app.json has no baseUrl; it is set only in app.config.js conditionally.

    **Supabase access token:** sbp_e634aa... — use with SUPABASE_ACCESS_TOKEN env var to push secrets or deploy edge functions (--use-api flag avoids Docker rate limits).
    