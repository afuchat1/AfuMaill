import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";

import { supabaseAdmin, getUserFromBearerToken } from "../lib/supabaseAdmin";

const router: IRouter = Router();

// ─── Shared helpers (mirrors the conventions in oauth.ts) ────────────────────

function devError(res: import("express").Response, status: number, error: string, description?: string) {
  return res.status(status).json(description ? { error, error_description: description } : { error });
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function generateClientId(): string {
  return `afu_${randomBytes(12).toString("hex")}`;
}

function generateClientSecret(): string {
  return `afu_secret_${randomBytes(32).toString("base64url")}`;
}

const VALID_SCOPES = new Set(["profile", "email"]);
const MAX_APPS_PER_USER = 25;
const MAX_REDIRECT_URIS = 10;

/**
 * Registering, editing, and rotating secrets for OAuth apps are all
 * sensitive, low-frequency actions. Rate limiting them (per IP) mitigates
 * automated abuse — spinning up large numbers of client_ids, or hammering
 * the secret-rotation endpoint to try to intercept a race condition.
 */
const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => devError(res, 429, "temporarily_unavailable", "Too many app-management requests. Please try again later."),
});

const readRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => devError(res, 429, "temporarily_unavailable", "Too many requests. Please try again later."),
});

/**
 * Validates that a redirect URI is safe to register. This is the same trust
 * boundary as the OAuth authorize endpoint's exact-match check, so getting
 * it wrong here would let a malicious developer register an open redirect.
 *
 * Rules:
 *  - Must be a syntactically valid absolute URL.
 *  - `confidential` (server-side) apps must use https, except for
 *    http://localhost during local development of the integration itself.
 *  - `public` apps (native/mobile) may also use a custom URL scheme
 *    (e.g. myapp://oauth/callback), which is the standard native pattern.
 *  - No fragment, no userinfo, no wildcard host.
 */
function validateRedirectUri(raw: string, clientType: "public" | "confidential"): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return `"${raw}" is not a valid absolute URL.`;
  }

  if (url.username || url.password) return `"${raw}" must not contain credentials.`;
  if (url.hash) return `"${raw}" must not contain a fragment.`;
  if (url.hostname.includes("*")) return `"${raw}" must not contain a wildcard host.`;

  if (url.protocol === "https:") return null;

  if (url.protocol === "http:") {
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return null;
    return `"${raw}" must use https:// (http:// is only permitted for localhost).`;
  }

  // Custom schemes (myapp://, com.example.app://) are only valid for public
  // native clients, matching how mobile OAuth clients receive redirects.
  if (clientType === "public" && /^[a-z][a-z0-9+.-]*:$/i.test(url.protocol) && url.protocol !== "file:") {
    return null;
  }

  return `"${raw}" must use https://, or a custom URL scheme for public/native apps.`;
}

function validateRedirectUris(uris: unknown, clientType: "public" | "confidential"): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(uris) || uris.length === 0) {
    return { ok: false, error: "redirect_uris must be a non-empty array of URLs." };
  }
  if (uris.length > MAX_REDIRECT_URIS) {
    return { ok: false, error: `A maximum of ${MAX_REDIRECT_URIS} redirect_uris is supported.` };
  }
  const clean: string[] = [];
  for (const entry of uris) {
    if (typeof entry !== "string" || entry.length === 0 || entry.length > 2048) {
      return { ok: false, error: "Each redirect_uri must be a non-empty string." };
    }
    const err = validateRedirectUri(entry, clientType);
    if (err) return { ok: false, error: err };
    clean.push(entry);
  }
  return { ok: true, value: Array.from(new Set(clean)) };
}

function validateScopes(scopes: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (scopes === undefined) return { ok: true, value: ["profile", "email"] };
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return { ok: false, error: "scopes must be a non-empty array." };
  }
  const clean: string[] = [];
  for (const scope of scopes) {
    if (typeof scope !== "string" || !VALID_SCOPES.has(scope)) {
      return { ok: false, error: `Unsupported scope "${scope}". Supported scopes: ${Array.from(VALID_SCOPES).join(", ")}.` };
    }
    clean.push(scope);
  }
  return { ok: true, value: Array.from(new Set(clean)) };
}

function validateName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return null;
  return trimmed;
}

function validateClientType(clientType: unknown): "public" | "confidential" | null {
  if (clientType === "public" || clientType === "confidential") return clientType;
  return null;
}

type OwnedClientRow = {
  client_id: string;
  name: string;
  logo_url: string | null;
  redirect_uris: string[];
  scopes: string[];
  is_first_party: boolean;
  owner_id: string | null;
  client_type: "public" | "confidential";
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
};

async function requireOwnedApp(userId: string, clientId: string) {
  const { data } = await supabaseAdmin
    .from("oauth_clients")
    .select("client_id, name, logo_url, redirect_uris, scopes, is_first_party, owner_id, client_type, status, client_secret_hash, created_at, updated_at")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!data) return { error: "not_found" as const };
  // Ownership is checked server-side on every mutation — a developer can
  // never read, edit, rotate, or delete another developer's app, even if
  // they guess a valid client_id.
  if (!data.owner_id || data.owner_id !== userId) return { error: "forbidden" as const };
  return { error: null, client: data };
}

function toPublicShape(row: Omit<OwnedClientRow, "client_secret_hash"> & { client_secret_hash?: string | null }) {
  return {
    clientId: row.client_id,
    name: row.name,
    logoUrl: row.logo_url,
    redirectUris: row.redirect_uris,
    scopes: row.scopes,
    clientType: row.client_type,
    status: row.status,
    hasSecret: Boolean(row.client_secret_hash),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Developer app registration ──────────────────────────────────────────────

/**
 * POST /api/developer/apps
 * Registers a new third-party OAuth application. Requires a signed-in
 * AfuMail account — self-service, but every app is permanently tied to the
 * developer who created it, and only that developer can manage it.
 *
 * Body: { name, redirect_uris: string[], client_type: "public"|"confidential", scopes?: string[], logo_url?: string }
 *
 * For confidential apps, the response includes a one-time client_secret.
 * AfuMail never stores or displays the plaintext secret again — only its
 * hash is kept, exactly like the opaque tokens minted elsewhere in this API.
 */
router.post("/developer/apps", registrationRateLimiter, async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return devError(res, 401, "unauthorized", "You must be signed in to AfuMail to register an application.");

  const { name, redirect_uris, client_type, scopes, logo_url } = req.body ?? {};

  const cleanName = validateName(name);
  if (!cleanName) return devError(res, 400, "invalid_request", "name is required and must be 2–80 characters.");

  const cleanClientType = validateClientType(client_type);
  if (!cleanClientType) return devError(res, 400, "invalid_request", 'client_type must be "public" or "confidential".');

  const redirectResult = validateRedirectUris(redirect_uris, cleanClientType);
  if (!redirectResult.ok) return devError(res, 400, "invalid_request", redirectResult.error);

  const scopesResult = validateScopes(scopes);
  if (!scopesResult.ok) return devError(res, 400, "invalid_request", scopesResult.error);

  if (logo_url !== undefined && (typeof logo_url !== "string" || (logo_url && !logo_url.startsWith("https://")))) {
    return devError(res, 400, "invalid_request", "logo_url must be an https:// URL.");
  }

  const { count } = await supabaseAdmin
    .from("oauth_clients")
    .select("client_id", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if ((count ?? 0) >= MAX_APPS_PER_USER) {
    return devError(res, 400, "invalid_request", `You have reached the maximum of ${MAX_APPS_PER_USER} registered applications.`);
  }

  const clientId = generateClientId();
  const plaintextSecret = cleanClientType === "confidential" ? generateClientSecret() : null;

  const { data: inserted, error } = await supabaseAdmin
    .from("oauth_clients")
    .insert({
      client_id: clientId,
      name: cleanName,
      logo_url: logo_url || null,
      redirect_uris: redirectResult.value,
      scopes: scopesResult.value,
      is_first_party: false,
      owner_id: user.id,
      client_type: cleanClientType,
      client_secret_hash: plaintextSecret ? sha256Hex(plaintextSecret) : null,
      status: "active",
    })
    .select("client_id, name, logo_url, redirect_uris, scopes, is_first_party, owner_id, client_type, status, client_secret_hash, created_at, updated_at")
    .single();

  if (error || !inserted) {
    console.error("oauth_clients insert error:", error);
    return devError(res, 500, "server_error", "Failed to register the application. Please try again.");
  }

  return res.status(201).json({
    app: toPublicShape(inserted),
    // Present exactly once. The developer must copy it now — AfuMail cannot
    // retrieve or redisplay it, only rotate it for a new one.
    clientSecret: plaintextSecret,
  });
});

/**
 * GET /api/developer/apps
 * Lists every application owned by the signed-in developer. Never returns
 * secret material — only whether a secret exists (hasSecret).
 */
router.get("/developer/apps", readRateLimiter, async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return devError(res, 401, "unauthorized", "You must be signed in to AfuMail.");

  const { data, error } = await supabaseAdmin
    .from("oauth_clients")
    .select("client_id, name, logo_url, redirect_uris, scopes, is_first_party, owner_id, client_type, status, client_secret_hash, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("oauth_clients list error:", error);
    return devError(res, 500, "server_error", "Failed to load your applications.");
  }

  return res.json({ apps: (data ?? []).map(toPublicShape) });
});

/**
 * GET /api/developer/apps/:clientId
 * Fetches a single application owned by the signed-in developer.
 */
router.get("/developer/apps/:clientId", readRateLimiter, async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return devError(res, 401, "unauthorized", "You must be signed in to AfuMail.");

  const result = await requireOwnedApp(user.id, String(req.params.clientId));
  if (result.error === "not_found") return devError(res, 404, "invalid_client", "Application not found.");
  if (result.error === "forbidden") return devError(res, 403, "forbidden", "You do not own this application.");

  return res.json({ app: toPublicShape(result.client) });
});

/**
 * PATCH /api/developer/apps/:clientId
 * Updates name, logo_url, redirect_uris, or scopes for an app the signed-in
 * developer owns. client_type cannot be changed after creation — switching
 * a public (PKCE-only) client to confidential (or vice versa) after the
 * fact would silently change its trust model for apps already integrated
 * against it, so a new registration is required instead.
 */
router.patch("/developer/apps/:clientId", registrationRateLimiter, async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return devError(res, 401, "unauthorized", "You must be signed in to AfuMail.");

  const result = await requireOwnedApp(user.id, String(req.params.clientId));
  if (result.error === "not_found") return devError(res, 404, "invalid_client", "Application not found.");
  if (result.error === "forbidden") return devError(res, 403, "forbidden", "You do not own this application.");

  const { name, redirect_uris, scopes, logo_url } = req.body ?? {};
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (name !== undefined) {
    const cleanName = validateName(name);
    if (!cleanName) return devError(res, 400, "invalid_request", "name must be 2–80 characters.");
    updates.name = cleanName;
  }

  if (redirect_uris !== undefined) {
    const redirectResult = validateRedirectUris(redirect_uris, result.client.client_type);
    if (!redirectResult.ok) return devError(res, 400, "invalid_request", redirectResult.error);
    updates.redirect_uris = redirectResult.value;
  }

  if (scopes !== undefined) {
    const scopesResult = validateScopes(scopes);
    if (!scopesResult.ok) return devError(res, 400, "invalid_request", scopesResult.error);
    updates.scopes = scopesResult.value;
  }

  if (logo_url !== undefined) {
    if (logo_url !== null && (typeof logo_url !== "string" || !logo_url.startsWith("https://"))) {
      return devError(res, 400, "invalid_request", "logo_url must be an https:// URL.");
    }
    updates.logo_url = logo_url || null;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("oauth_clients")
    .update(updates)
    .eq("client_id", result.client.client_id)
    .select("client_id, name, logo_url, redirect_uris, scopes, is_first_party, owner_id, client_type, status, client_secret_hash, created_at, updated_at")
    .single();

  if (error || !updated) {
    console.error("oauth_clients update error:", error);
    return devError(res, 500, "server_error", "Failed to update the application.");
  }

  return res.json({ app: toPublicShape(updated) });
});

/**
 * POST /api/developer/apps/:clientId/rotate-secret
 * Issues a brand-new client_secret for a confidential app and immediately
 * invalidates the old one. Use this if a secret is ever suspected of being
 * exposed (checked into source control, logged, etc.) — there is no way to
 * view an existing secret again, only rotate it.
 */
router.post("/developer/apps/:clientId/rotate-secret", registrationRateLimiter, async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return devError(res, 401, "unauthorized", "You must be signed in to AfuMail.");

  const result = await requireOwnedApp(user.id, String(req.params.clientId));
  if (result.error === "not_found") return devError(res, 404, "invalid_client", "Application not found.");
  if (result.error === "forbidden") return devError(res, 403, "forbidden", "You do not own this application.");
  if (result.client.client_type !== "confidential") {
    return devError(res, 400, "invalid_request", "Only confidential applications have a client_secret to rotate.");
  }

  const plaintextSecret = generateClientSecret();
  const { error } = await supabaseAdmin
    .from("oauth_clients")
    .update({ client_secret_hash: sha256Hex(plaintextSecret), updated_at: new Date().toISOString() })
    .eq("client_id", result.client.client_id);

  if (error) {
    console.error("oauth_clients rotate-secret error:", error);
    return devError(res, 500, "server_error", "Failed to rotate the client secret.");
  }

  return res.json({ clientSecret: plaintextSecret });
});

/**
 * DELETE /api/developer/apps/:clientId
 * Permanently deletes an application the signed-in developer owns. All
 * outstanding authorization codes and tokens for it are removed via the
 * database's ON DELETE CASCADE, immediately revoking every user's access
 * grant to the app.
 */
router.delete("/developer/apps/:clientId", registrationRateLimiter, async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return devError(res, 401, "unauthorized", "You must be signed in to AfuMail.");

  const result = await requireOwnedApp(user.id, String(req.params.clientId));
  if (result.error === "not_found") return devError(res, 404, "invalid_client", "Application not found.");
  if (result.error === "forbidden") return devError(res, 403, "forbidden", "You do not own this application.");

  const { error } = await supabaseAdmin.from("oauth_clients").delete().eq("client_id", result.client.client_id);
  if (error) {
    console.error("oauth_clients delete error:", error);
    return devError(res, 500, "server_error", "Failed to delete the application.");
  }

  return res.json({ ok: true });
});

export default router;
