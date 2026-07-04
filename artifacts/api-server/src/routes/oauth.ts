import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Response } from "express";
import { rateLimit } from "express-rate-limit";

import { supabaseAdmin, getUserFromBearerToken } from "../lib/supabaseAdmin";

const router: IRouter = Router();

const AUTH_CODE_TTL_MS = 60 * 1000; // 60s — standard for authorization codes
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d

/**
 * RFC 6749 §5.2 error response helper. Every error the OAuth endpoints return
 * follows this exact shape so third-party integrators can rely on a single,
 * documented error contract instead of guessing at ad hoc messages.
 */
function oauthError(
  res: Response,
  status: number,
  error: string,
  description?: string,
) {
  return res.status(status).json(
    description ? { error, error_description: description } : { error },
  );
}

// Token/code-guessing and credential-stuffing mitigation. Limits apply per
// client IP; thresholds are generous enough for legitimate integrations but
// block brute-force attempts against authorization codes, refresh tokens,
// and access tokens.
const tokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => oauthError(res, 429, "temporarily_unavailable", "Too many token requests. Please try again later."),
});

const authorizeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => oauthError(res, 429, "temporarily_unavailable", "Too many authorization requests. Please try again later."),
});

const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => oauthError(res, 429, "temporarily_unavailable", "Too many requests. Please try again later."),
});

function genToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function base64UrlSha256(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function getClient(clientId: string) {
  const { data } = await supabaseAdmin
    .from("oauth_clients")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  return data as
    | {
        client_id: string;
        name: string;
        logo_url: string | null;
        redirect_uris: string[];
        scopes: string[];
        is_first_party: boolean;
        client_type: "public" | "confidential";
        client_secret_hash: string | null;
        status: "active" | "suspended";
      }
    | null;
}

/**
 * Verifies a confidential client's secret. Public clients (mobile/SPA) have
 * no secret and rely on PKCE instead — this only applies to apps registered
 * as "confidential" via the Developer Dashboard.
 */
function verifyClientSecret(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
  providedSecret: unknown,
): { ok: true } | { ok: false; error: string } {
  if (client.client_type !== "confidential") return { ok: true };
  if (!client.client_secret_hash) {
    // Defensive: a confidential client must always have a secret hash.
    return { ok: false, error: "This application is misconfigured. Contact the application developer." };
  }
  if (!providedSecret || typeof providedSecret !== "string") {
    return { ok: false, error: "client_secret is required for this application." };
  }
  const providedHash = base64UrlSha256(providedSecret);
  const storedHash = Buffer.from(client.client_secret_hash, "hex").toString("base64url");
  if (!safeEqual(providedHash, storedHash)) {
    return { ok: false, error: "client_secret is incorrect." };
  }
  return { ok: true };
}

/**
 * Returns true when the redirect_uri is permitted for this client.
 * In non-production, first-party clients also accept the specific Replit
 * preview domain configured via REPLIT_DEV_DOMAIN (set by Replit's runtime)
 * so the in-app demo works on preview URLs without wildcard bypasses.
 */
function isRedirectUriAllowed(
  redirectUri: string,
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>
): boolean {
  if (client.redirect_uris.includes(redirectUri)) return true;
  if (client.is_first_party && process.env.NODE_ENV !== "production") {
    const devDomain = process.env.REPLIT_DEV_DOMAIN;
    if (devDomain) {
      try {
        const { hostname } = new URL(redirectUri);
        // Allow only the exact Replit preview domain for this repl
        if (hostname === devDomain) return true;
      } catch {
        // invalid URL — fall through
      }
    }
  }
  return false;
}

// ─── OIDC Discovery ──────────────────────────────────────────────────────────

/**
 * GET /api/oauth/.well-known/openid-configuration
 * Machine-readable OIDC metadata document (RFC 8414 / OpenID Discovery 1.0).
 * No authentication required — this is a public endpoint.
 */
router.get("/oauth/.well-known/openid-configuration", (req, res) => {
  const base = req.protocol + "://" + req.get("host");
  return res.json({
    issuer: `${base}/api/oauth`,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    userinfo_endpoint: `${base}/api/oauth/userinfo`,
    revocation_endpoint: `${base}/api/oauth/revoke`,
    jwks_uri: null,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: [],
    scopes_supported: ["profile", "email"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    code_challenge_methods_supported: ["S256"],
    claims_supported: ["sub", "name", "preferred_username", "email", "email_verified"],
  });
});

// ─── Client metadata ─────────────────────────────────────────────────────────

/**
 * GET /api/oauth/clients/:clientId?redirect_uri=...
 * Public. Used by the consent screen to show "X wants to access your account"
 * and to validate the redirect_uri before rendering anything.
 */
router.get("/oauth/clients/:clientId", sensitiveRateLimiter, async (req, res) => {
  const client = await getClient(String(req.params.clientId));
  if (!client) return oauthError(res, 404, "invalid_client", "Unknown client_id.");
  if (client.status !== "active") {
    return oauthError(res, 400, "invalid_client", "This application is no longer available.");
  }

  const redirectUri = req.query.redirect_uri as string | undefined;
  if (redirectUri && !isRedirectUriAllowed(redirectUri, client)) {
    return oauthError(res, 400, "invalid_request", "redirect_uri is not registered for this client.");
  }

  return res.json({
    clientId: client.client_id,
    name: client.name,
    logoUrl: client.logo_url,
    scopes: client.scopes,
    isFirstParty: client.is_first_party,
  });
});

// ─── Authorization code ──────────────────────────────────────────────────────

/**
 * POST /api/oauth/authorize
 * Requires: Authorization: Bearer <supabase access token> (the AfuMail session).
 * Body: { client_id, redirect_uri, code_challenge, code_challenge_method, scope, state }
 * Mints a one-time PKCE authorization code once the authenticated user approves the
 * consent screen. This is step 2 of the Authorization Code flow.
 */
router.post("/oauth/authorize", authorizeRateLimiter, async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return oauthError(res, 401, "unauthorized", "You must be signed in to AfuMail to authorize an application.");

  const { client_id, redirect_uri, code_challenge, code_challenge_method, scope, state } = req.body ?? {};

  if (!client_id || !redirect_uri || !code_challenge) {
    return oauthError(res, 400, "invalid_request", "client_id, redirect_uri and code_challenge are required.");
  }
  // `state` is mandatory: without it, third-party integrations have no
  // reliable way to bind the callback to the request that initiated it,
  // which is a CSRF risk (RFC 6749 §10.12).
  if (!state || typeof state !== "string") {
    return oauthError(res, 400, "invalid_request", "state is required and must be a non-empty string. Generate a random value before redirecting the user here.");
  }
  if (code_challenge_method && code_challenge_method !== "S256") {
    return oauthError(res, 400, "invalid_request", "Only the S256 PKCE method is supported.");
  }

  const client = await getClient(client_id);
  if (!client) return oauthError(res, 400, "invalid_client", "Unknown client_id.");
  if (client.status !== "active") {
    return oauthError(res, 400, "invalid_client", "This application is no longer available.");
  }
  if (!isRedirectUriAllowed(redirect_uri, client)) {
    return oauthError(res, 400, "invalid_request", "redirect_uri is not registered for this client.");
  }

  const code = genToken(32);
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from("oauth_authorization_codes").insert({
    code,
    client_id,
    user_id: user.id,
    redirect_uri,
    code_challenge,
    code_challenge_method: code_challenge_method ?? "S256",
    scope: scope ?? "profile email",
    expires_at: expiresAt,
  });

  if (error) {
    console.error("oauth_authorization_codes insert error:", error);
    return oauthError(res, 500, "server_error", "Failed to create authorization code.");
  }

  return res.json({ code, state });
});

// ─── Token endpoint ──────────────────────────────────────────────────────────

/**
 * POST /api/oauth/token
 * Standard OAuth 2.1 token endpoint. Public clients only — PKCE is mandatory,
 * no client_secret. Supports grant_type=authorization_code and refresh_token.
 */
router.post("/oauth/token", tokenRateLimiter, async (req, res) => {
  const { grant_type } = req.body ?? {};

  // ── Authorization Code ──
  if (grant_type === "authorization_code") {
    const { code, redirect_uri, client_id, code_verifier, client_secret } = req.body ?? {};
    if (!code || !redirect_uri || !client_id || !code_verifier) {
      return oauthError(res, 400, "invalid_request", "code, redirect_uri, client_id and code_verifier are required.");
    }

    const client = await getClient(client_id);
    if (!client) return oauthError(res, 400, "invalid_client", "Unknown client_id.");
    if (client.status !== "active") {
      return oauthError(res, 400, "invalid_client", "This application is no longer available.");
    }
    // Confidential apps (registered via the Developer Dashboard) must also
    // authenticate with their client_secret — PKCE alone isn't sufficient
    // once a client can hold a secret safely on a server.
    const secretCheck = verifyClientSecret(client, client_secret);
    if (!secretCheck.ok) return oauthError(res, 401, "invalid_client", secretCheck.error);

    const { data: authCode } = await supabaseAdmin
      .from("oauth_authorization_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!authCode || authCode.used || authCode.client_id !== client_id || authCode.redirect_uri !== redirect_uri) {
      return oauthError(res, 400, "invalid_grant", "Authorization code is invalid.");
    }
    if (new Date(authCode.expires_at).getTime() < Date.now()) {
      return oauthError(res, 400, "invalid_grant", "Authorization code has expired.");
    }

    // Verify PKCE: SHA-256(code_verifier) must equal the stored challenge
    const expectedChallenge = base64UrlSha256(code_verifier);
    if (!safeEqual(expectedChallenge, authCode.code_challenge)) {
      return oauthError(res, 400, "invalid_grant", "PKCE verification failed.");
    }

    // Single-use: mark code consumed before issuing tokens
    await supabaseAdmin.from("oauth_authorization_codes").update({ used: true }).eq("code", code);

    const accessToken = genToken(32);
    const refreshToken = genToken(32);
    const now = Date.now();

    const { error: tokenError } = await supabaseAdmin.from("oauth_tokens").insert({
      access_token: accessToken,
      refresh_token: refreshToken,
      client_id,
      user_id: authCode.user_id,
      scope: authCode.scope,
      access_expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
      refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
    });
    if (tokenError) {
      console.error("oauth_tokens insert error:", tokenError);
      return oauthError(res, 500, "server_error", "Failed to issue tokens. Please try again.");
    }

    return res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      scope: authCode.scope,
    });
  }

  // ── Refresh Token ──
  if (grant_type === "refresh_token") {
    const { refresh_token, client_id, client_secret } = req.body ?? {};
    if (!refresh_token || !client_id) {
      return oauthError(res, 400, "invalid_request", "refresh_token and client_id are required.");
    }

    const client = await getClient(client_id);
    if (!client) return oauthError(res, 400, "invalid_client", "Unknown client_id.");
    if (client.status !== "active") {
      return oauthError(res, 400, "invalid_client", "This application is no longer available.");
    }
    const secretCheck = verifyClientSecret(client, client_secret);
    if (!secretCheck.ok) return oauthError(res, 401, "invalid_client", secretCheck.error);

    const { data: existing } = await supabaseAdmin
      .from("oauth_tokens")
      .select("*")
      .eq("refresh_token", refresh_token)
      .eq("client_id", client_id)
      .maybeSingle();

    if (!existing || existing.revoked || new Date(existing.refresh_expires_at).getTime() < Date.now()) {
      return oauthError(res, 400, "invalid_grant", "Refresh token is invalid or expired.");
    }

    // Rotate: revoke old pair, issue new pair
    await supabaseAdmin.from("oauth_tokens").update({ revoked: true }).eq("access_token", existing.access_token);

    const accessToken = genToken(32);
    const newRefreshToken = genToken(32);
    const now = Date.now();

    const { error: tokenError } = await supabaseAdmin.from("oauth_tokens").insert({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      client_id,
      user_id: existing.user_id,
      scope: existing.scope,
      access_expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
      refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
    });
    if (tokenError) {
      console.error("oauth_tokens rotate error:", tokenError);
      return oauthError(res, 500, "server_error", "Failed to issue tokens. Please try again.");
    }

    return res.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      scope: existing.scope,
    });
  }

  return oauthError(res, 400, "unsupported_grant_type", "grant_type must be authorization_code or refresh_token.");
});

// ─── UserInfo ────────────────────────────────────────────────────────────────

/**
 * GET /api/oauth/userinfo
 * OIDC-style userinfo endpoint. Returns profile claims for the user who
 * authorized the token.
 * Requires: Authorization: Bearer <access_token>
 * (the opaque OAuth access token minted above, NOT the AfuMail Supabase session).
 */
router.get("/oauth/userinfo", sensitiveRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return oauthError(res, 401, "invalid_token", "Missing or malformed Authorization header.");
  }
  const accessToken = authHeader.slice("Bearer ".length);

  const { data: tokenRow } = await supabaseAdmin
    .from("oauth_tokens")
    .select("*")
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked || new Date(tokenRow.access_expires_at).getTime() < Date.now()) {
    return oauthError(res, 401, "invalid_token", "Access token is invalid or expired.");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, email, afumail_address")
    .eq("id", tokenRow.user_id)
    .maybeSingle();

  if (!profile) return oauthError(res, 404, "invalid_token", "The user for this token no longer exists.");

  const scopes: string[] = tokenRow.scope ? tokenRow.scope.split(" ") : [];
  const response: Record<string, unknown> = { sub: profile.id };

  if (scopes.includes("profile")) {
    response.name = profile.full_name;
    response.preferred_username = profile.username;
  }
  if (scopes.includes("email")) {
    response.email = profile.afumail_address ?? profile.email;
    response.email_verified = true;
  }

  return res.json(response);
});

// ─── Token revocation (RFC 7009) ─────────────────────────────────────────────

/**
 * POST /api/oauth/revoke
 * RFC 7009 token revocation. Accepts either an access_token or refresh_token.
 * Always returns 200 (even for unknown tokens) per the spec.
 */
router.post("/oauth/revoke", sensitiveRateLimiter, async (req, res) => {
  const { token, token_type_hint, client_id } = req.body ?? {};
  if (!token || !client_id) return oauthError(res, 400, "invalid_request", "token and client_id are required.");

  // Try to find by access_token or refresh_token
  let query = supabaseAdmin.from("oauth_tokens").update({ revoked: true }).eq("client_id", client_id);

  if (token_type_hint === "refresh_token") {
    await query.eq("refresh_token", token);
  } else {
    // Try access_token first, then refresh_token (RFC 7009 §2.1)
    await supabaseAdmin.from("oauth_tokens").update({ revoked: true }).eq("access_token", token).eq("client_id", client_id);
    await supabaseAdmin.from("oauth_tokens").update({ revoked: true }).eq("refresh_token", token).eq("client_id", client_id);
  }

  return res.json({ ok: true });
});

// ─── Token introspection (RFC 7662) ──────────────────────────────────────────

/**
 * POST /api/oauth/introspect
 * RFC 7662 — lets first-party Afu services validate a token.
 * Requires the Supabase service-role key in the X-Service-Key header so that
 * only trusted backend services (not end users) can call this endpoint.
 */
router.post("/oauth/introspect", sensitiveRateLimiter, async (req, res) => {
  // Gate: only trusted server-side callers may introspect tokens.
  // They authenticate with the Supabase service-role key, which is never
  // exposed to browsers or end-users.
  const serviceKey = req.headers["x-service-key"];
  if (!serviceKey || typeof serviceKey !== "string" || !process.env.SUPABASE_SERVICE_ROLE_KEY || !safeEqual(serviceKey, process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return oauthError(res, 401, "unauthorized", "Missing or invalid X-Service-Key header.");
  }

  const { token } = req.body ?? {};
  if (!token) return oauthError(res, 400, "invalid_request", "token is required.");

  const { data: tokenRow } = await supabaseAdmin
    .from("oauth_tokens")
    .select("*")
    .eq("access_token", token)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked || new Date(tokenRow.access_expires_at).getTime() < Date.now()) {
    return res.json({ active: false });
  }

  return res.json({
    active: true,
    sub: tokenRow.user_id,
    client_id: tokenRow.client_id,
    scope: tokenRow.scope,
    exp: Math.floor(new Date(tokenRow.access_expires_at).getTime() / 1000),
    iat: Math.floor(new Date(tokenRow.created_at).getTime() / 1000),
    token_type: "Bearer",
  });
});

// ─── Grants management ───────────────────────────────────────────────────────

/**
 * GET /api/oauth/grants
 * Requires: Authorization: Bearer <supabase access token> (AfuMail session).
 * Lists third-party apps the signed-in user has authorized (for the
 * "Connected Accounts" settings screen).
 */
router.get("/oauth/grants", sensitiveRateLimiter, async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return oauthError(res, 401, "unauthorized", "You must be signed in to AfuMail.");

  const { data: tokens } = await supabaseAdmin
    .from("oauth_tokens")
    .select("client_id, scope, created_at, access_expires_at")
    .eq("user_id", user.id)
    .eq("revoked", false)
    .gt("refresh_expires_at", new Date().toISOString());

  if (!tokens || tokens.length === 0) return res.json({ grants: [] });

  const uniqueClientIds = [...new Set(tokens.map((t) => t.client_id))];
  const { data: clients } = await supabaseAdmin
    .from("oauth_clients")
    .select("client_id, name, logo_url")
    .in("client_id", uniqueClientIds);

  const clientMap = new Map((clients ?? []).map((c) => [c.client_id, c]));
  const grants = uniqueClientIds.map((clientId) => {
    const client = clientMap.get(clientId);
    const grantTokens = tokens.filter((t) => t.client_id === clientId);
    const scopes = new Set(grantTokens.flatMap((t) => t.scope.split(" ")));
    return {
      clientId,
      name: client?.name ?? clientId,
      logoUrl: client?.logo_url ?? null,
      scopes: [...scopes],
      authorizedAt: grantTokens.map((t) => t.created_at).sort()[0],
    };
  });

  return res.json({ grants });
});

/**
 * DELETE /api/oauth/grants/:clientId
 * Revokes all tokens the signed-in user has issued to a given client.
 */
router.delete("/oauth/grants/:clientId", sensitiveRateLimiter, async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return oauthError(res, 401, "unauthorized", "You must be signed in to AfuMail.");

  const { error } = await supabaseAdmin
    .from("oauth_tokens")
    .update({ revoked: true })
    .eq("user_id", user.id)
    .eq("client_id", req.params.clientId);

  if (error) return oauthError(res, 500, "server_error", "Failed to revoke access. Please try again.");
  return res.json({ ok: true });
});

export default router;
