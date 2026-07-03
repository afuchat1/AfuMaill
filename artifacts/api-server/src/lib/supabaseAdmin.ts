import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabaseAdmin] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set. " +
      "The server will start, but any route that talks to Supabase will fail until these are configured.",
  );
}

export const supabaseAdmin = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key",
  {
    auth: { autoRefreshToken: false, persistSession: false },
    // Node.js 20 lacks a native WebSocket global, which supabase-js's realtime
    // client requires even when realtime features aren't used.
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  },
);

export async function getUserFromBearerToken(authHeader: string | undefined) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
