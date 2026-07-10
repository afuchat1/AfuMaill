/**
 * Expo dynamic app config.
 *
 * The web build needs different baseUrl values depending on environment:
 *
 *   Vercel  (VERCEL=1 is auto-injected) → baseUrl = ""
 *     Assets land at /_expo/... which Vercel serves from the dist root. ✓
 *
 *   Replit preview (artifact routes /site/* → port 3000) → baseUrl = "/site"
 *     Assets land at /site/_expo/... which the proxy forwards to serve.js
 *     and serve.js strips the /site prefix to find the file in dist/. ✓
 *
 * All other config comes from app.json (merged in via `config`).
 */

/** @param {{ config: import('@expo/config-types').ExpoConfig }} ctx */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    // Vercel sets VERCEL=1 automatically during every build.
    // Any other deployer can set EXPO_BASE_URL="" to get the same behaviour.
    baseUrl: process.env.VERCEL
      ? ""
      : (process.env.EXPO_BASE_URL ?? "/site"),
  },
});
