/**
 * AfuMail API base URL — now points directly at Supabase Edge Functions.
 *
 * All OAuth 2.1 / OIDC and developer-app endpoints live as Supabase Edge
 * Functions under:
 *   https://<project>.supabase.co/functions/v1/oauth/*
 *   https://<project>.supabase.co/functions/v1/developer-apps/*
 *
 * The legacy Express API server is no longer required.
 */

import { SUPABASE_URL } from "@/lib/supabase-config";

const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

/**
 * Map a legacy api-server path to its Supabase Edge Function URL.
 *
 * Old paths (Express):
 *   /api/oauth/*           → /functions/v1/oauth/*
 *   /api/developer/apps*   → /functions/v1/developer-apps*
 *
 * New paths can also be passed directly without the /api prefix.
 */
export function apiUrl(path: string): string {
  // Normalise: strip optional /api prefix
  let p = path.replace(/^\/api/, "");

  // /developer/apps → /developer-apps  (matches the edge function name)
  p = p.replace(/^\/developer\/apps/, "/developer-apps");

  // Ensure leading slash
  if (!p.startsWith("/")) p = `/${p}`;

  return `${FUNCTIONS_BASE}${p}`;
}
