---
    name: Website static build
    description: Website serves a pre-built static export; dist/ must be rebuilt when missing.
    ---

    The website artifact serves a static Expo export via server/serve.js.

    **Rule:** Before the preview or production site can show the app, run `pnpm --filter @workspace/website run build` to populate `artifacts/website/dist/`. If dist/ is missing, server falls back to the landing page template only (blank-looking in the app).

    **Why:** The dev script runs node server/serve.js which serves pre-built files — it does NOT run a live bundler. The static export is gitignored and lost on container reprovision.

    **BASE_PATH:** Artifact system injects BASE_PATH=/site from [services.env] in artifact.toml. The build uses this automatically via expo config.

    **Supabase deploy:** Docker rate limits can block `supabase functions deploy`. Use --no-bundle flag as fallback, or deploy from Supabase dashboard at supabase.com/dashboard/project/lqowocmjmhbkoxlwyxku/functions.
    