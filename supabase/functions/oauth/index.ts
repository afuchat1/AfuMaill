/**
 * AfuMail OAuth 2.1 / OIDC Identity Provider — Supabase Edge Function
 *
 * Handles all OAuth endpoints for the mobile app.
 * Uses the Web Crypto API (Deno-native) in place of Node.js `crypto`.
 *
 * Endpoints:
 *   GET  /.well-known/openid-configuration
 *   GET  /clients/:clientId
 *   POST /authorize
 *   POST /token
 *   GET  /userinfo
 *   POST /revoke
 *   POST /introspect
 *   GET  /grants
 *   DELETE /grants/:clientId
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-service-key",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const PROJECT_URL = "https://lqowocmjmhbkoxlwyxku.supabase.co";
const AUTH_CODE_TTL_MS   = 60_000;           // 60 s
const ACCESS_TOKEN_TTL_MS  = 3_600_000;        // 1 h
const REFRESH_TOKEN_TTL_MS = 30 * 86_400_000;  // 30 d

// ── Utilities ────────────────────────────────────────────────────────────────

function svcKey(): string {
  return Deno.env.get("SVC_ROLE_KEY") ?? "";
}

function jsonResp(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extra },
  });
}

function oauthError(status: number, error: string, description?: string): Response {
  return jsonResp(
    description ? { error, error_description: description } : { error },
    status,
  );
}

/** Generate a cryptographically-random base64url token. */
function genToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** SHA-256(input) → base64url string. */
async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  let s = "";
  for (const b of new Uint8Array(hash)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Decode a hex string and re-encode it as base64url (for secret hash comparison). */
function hexToBase64Url(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Constant-time string comparison to prevent timing attacks. */
function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

// ── Supabase REST helpers ─────────────────────────────────────────────────────

async function dbSelect<T>(table: string, qs: string): Promise<T[]> {
  const key = svcKey();
  const r = await fetch(`${PROJECT_URL}/rest/v1/${table}?${qs}`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
  });
  if (!r.ok) return [];
  return (await r.json()) as T[];
}

async function dbInsert(table: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const key = svcKey();
  const r = await fetch(`${PROJECT_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (r.ok) return { ok: true };
  return { ok: false, error: await r.text() };
}

async function dbUpdate(table: string, qs: string, body: unknown): Promise<{ ok: boolean }> {
  const key = svcKey();
  const r = await fetch(`${PROJECT_URL}/rest/v1/${table}?${qs}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  return { ok: r.ok };
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getUserFromBearerToken(
  authHeader: string | null | undefined,
): Promise<{ id: string; email: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const key = svcKey();
  const r = await fetch(`${PROJECT_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: key },
  });
  if (!r.ok) return null;
  const user = await r.json() as { id?: string; email?: string };
  return user?.id ? (user as { id: string; email: string }) : null;
}

// ── OAuth client helpers ──────────────────────────────────────────────────────

type OAuthClient = {
  application_id: string;
  client_id: string;
  name: string;
  logo_url: string | null;
  redirect_uris: string[];
  scopes: string[];
  is_first_party: boolean;
  client_type: "public" | "confidential";
  client_secret_hash: string | null;
  status: "active" | "suspended";
};

async function getClient(clientId: string): Promise<OAuthClient | null> {
  const rows = await dbSelect<{
    id: string;
    client_id: string;
    name: string;
    logo_url: string | null;
    redirect_uris: string[];
    scopes: string[];
    is_first_party: boolean;
    status: "active" | "suspended";
  }>(
    "oauth_applications",
    `client_id=eq.${encodeURIComponent(clientId)}&select=*&limit=1`,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    application_id: row.id ?? row.application_id,
    logo_url: row.logo_url ?? null,
    is_first_party: Boolean(row.is_first_party),
    client_type: "public",
    client_secret_hash: null,
    status: row.status ?? "active",
  };
}

async function getPrimaryAddressId(userId: string): Promise<string | null> {
  const rows = await dbSelect<{ id: string }>(
    "email_addresses",
    `user_id=eq.${encodeURIComponent(userId)}&is_primary=eq.true&select=id&limit=1`,
  );
  return rows[0]?.id ?? null;
}

function isRedirectUriAllowed(redirectUri: string, client: OAuthClient): boolean {
  if (client.redirect_uris.includes(redirectUri)) return true;
  if (client.is_first_party) {
    const devDomain = Deno.env.get("REPLIT_DEV_DOMAIN");
    if (devDomain) {
      try {
        const { hostname } = new URL(redirectUri);
        if (hostname === devDomain) return true;
      } catch { /* invalid URL */ }
    }
  }
  return false;
}

async function verifyClientSecret(
  client: OAuthClient,
  provided: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (client.client_type !== "confidential") return { ok: true };
  if (!client.client_secret_hash) {
    return { ok: false, error: "This application is misconfigured. Contact the application developer." };
  }
  if (!provided || typeof provided !== "string") {
    return { ok: false, error: "client_secret is required for this application." };
  }
  const providedHash = await sha256Base64Url(provided);
  const storedHash   = hexToBase64Url(client.client_secret_hash);
  if (!safeEqual(providedHash, storedHash)) {
    return { ok: false, error: "client_secret is incorrect." };
  }
  return { ok: true };
}

// ── Request body parser (JSON or form-encoded) ────────────────────────────────

async function parseBody(req: Request): Promise<Record<string, string>> {
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const obj: Record<string, string> = {};
      for (const [k, v] of new URLSearchParams(text)) obj[k] = v;
      return obj;
    }
    return await req.json() as Record<string, string>;
  } catch {
    return {};
  }
}

// ── Path extraction ───────────────────────────────────────────────────────────

function extractPath(url: URL): string {
  // Supabase passes pathname as /<function-name>/<rest>, e.g. /oauth/authorize
  // Strip the leading /oauth segment to get the sub-path.
  const stripped = url.pathname.replace(/^\/oauth/, "") || "/";
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

function handleDiscovery(): Response {
  const base = `${PROJECT_URL}/functions/v1/oauth`;
  return jsonResp({
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    userinfo_endpoint: `${base}/userinfo`,
    revocation_endpoint: `${base}/revoke`,
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
}

async function handleClientMeta(clientId: string, url: URL): Promise<Response> {
  const client = await getClient(clientId);
  if (!client) return oauthError(404, "invalid_client", "Unknown client_id.");
  if (client.status !== "active") {
    return oauthError(400, "invalid_client", "This application is no longer available.");
  }
  const redirectUri = url.searchParams.get("redirect_uri") ?? undefined;
  if (redirectUri && !isRedirectUriAllowed(redirectUri, client)) {
    return oauthError(400, "invalid_request", "redirect_uri is not registered for this client.");
  }
  return jsonResp({
    clientId: client.client_id,
    name: client.name,
    logoUrl: client.logo_url,
    scopes: client.scopes,
    isFirstParty: client.is_first_party,
  });
}

async function handleAuthorize(req: Request): Promise<Response> {
  const user = await getUserFromBearerToken(req.headers.get("authorization"));
  if (!user) return oauthError(401, "unauthorized", "You must be signed in to AfuMail to authorize an application.");

  const body = await parseBody(req);
  const { client_id, redirect_uri, code_challenge, code_challenge_method, scope, state } = body;

  if (!client_id || !redirect_uri || !code_challenge) {
    return oauthError(400, "invalid_request", "client_id, redirect_uri and code_challenge are required.");
  }
  if (!state) {
    return oauthError(400, "invalid_request", "state is required and must be a non-empty string.");
  }
  if (code_challenge_method && code_challenge_method !== "S256") {
    return oauthError(400, "invalid_request", "Only the S256 PKCE method is supported.");
  }

  const client = await getClient(client_id);
  if (!client) return oauthError(400, "invalid_client", "Unknown client_id.");
  if (client.status !== "active") return oauthError(400, "invalid_client", "This application is no longer available.");
  if (!isRedirectUriAllowed(redirect_uri, client)) {
    return oauthError(400, "invalid_request", "redirect_uri is not registered for this client.");
  }

  const emailAddressId = await getPrimaryAddressId(user.id);
  if (!emailAddressId) return oauthError(500, "server_error", "No primary AfuMail address is available.");

  const code      = genToken(32);
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString();

  const ins = await dbInsert("oauth_authorization_codes", {
    code,
    application_id: client.application_id,
    user_id: user.id,
    email_address_id: emailAddressId,
    redirect_uri,
    code_challenge,
    code_challenge_method: code_challenge_method ?? "S256",
    scopes: (scope ?? "profile email").split(" ").filter(Boolean),
    expires_at: expiresAt,
  });
  if (!ins.ok) return oauthError(500, "server_error", "Failed to create authorization code.");

  return jsonResp({ code, state });
}

async function handleToken(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const { grant_type } = body;

  // ── Authorization Code grant ──
  if (grant_type === "authorization_code") {
    const { code, redirect_uri, client_id, code_verifier, client_secret } = body;
    if (!code || !redirect_uri || !client_id || !code_verifier) {
      return oauthError(400, "invalid_request", "code, redirect_uri, client_id and code_verifier are required.");
    }

    const client = await getClient(client_id);
    if (!client) return oauthError(400, "invalid_client", "Unknown client_id.");
    if (client.status !== "active") return oauthError(400, "invalid_client", "This application is no longer available.");
    const secretCheck = await verifyClientSecret(client, client_secret);
    if (!secretCheck.ok) return oauthError(401, "invalid_client", secretCheck.error);

    const rows = await dbSelect<{
      code: string; used: boolean; application_id: string; redirect_uri: string;
      user_id: string; email_address_id: string; expires_at: string;
      code_challenge: string; scopes: string[];
    }>("oauth_authorization_codes", `code=eq.${encodeURIComponent(code)}&select=*&limit=1`);

    const authCode = rows[0];
    if (!authCode || authCode.used || authCode.application_id !== client.application_id || authCode.redirect_uri !== redirect_uri) {
      return oauthError(400, "invalid_grant", "Authorization code is invalid.");
    }
    if (new Date(authCode.expires_at).getTime() < Date.now()) {
      return oauthError(400, "invalid_grant", "Authorization code has expired.");
    }

    const expectedChallenge = await sha256Base64Url(code_verifier);
    if (!safeEqual(expectedChallenge, authCode.code_challenge)) {
      return oauthError(400, "invalid_grant", "PKCE verification failed.");
    }

    // Mark code as used (single-use)
    // Fail closed: if marking the code used fails, do not issue tokens (blocks replay)
    const markUsed = await dbUpdate("oauth_authorization_codes", `code=eq.${encodeURIComponent(code)}`, { used: true });
    if (!markUsed.ok) return oauthError(500, "server_error", "Failed to consume authorization code. Please try again.");

    const accessToken  = genToken(32);
    const refreshToken = genToken(32);
    const now = Date.now();

    const ins = await dbInsert("oauth_tokens", {
      access_token: accessToken,
      refresh_token: refreshToken,
      application_id: client.application_id,
      user_id: authCode.user_id,
      email_address_id: authCode.email_address_id,
      scopes: authCode.scopes,
      expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
      refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
    });
    if (!ins.ok) return oauthError(500, "server_error", "Failed to issue tokens. Please try again.");

    return jsonResp({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      scope: authCode.scopes.join(" "),
    });
  }

  // ── Refresh Token grant ──
  if (grant_type === "refresh_token") {
    const { refresh_token, client_id, client_secret } = body;
    if (!refresh_token || !client_id) {
      return oauthError(400, "invalid_request", "refresh_token and client_id are required.");
    }

    const client = await getClient(client_id);
    if (!client) return oauthError(400, "invalid_client", "Unknown client_id.");
    if (client.status !== "active") return oauthError(400, "invalid_client", "This application is no longer available.");
    const secretCheck = await verifyClientSecret(client, client_secret);
    if (!secretCheck.ok) return oauthError(401, "invalid_client", secretCheck.error);

    const rows = await dbSelect<{
      refresh_token: string; revoked: boolean; refresh_expires_at: string;
      access_token: string; user_id: string; email_address_id: string; scopes: string[];
      expires_at: string;
    }>("oauth_tokens", `refresh_token=eq.${encodeURIComponent(refresh_token)}&application_id=eq.${encodeURIComponent(client.application_id)}&select=*&limit=1`);

    const existing = rows[0];
    if (!existing || existing.revoked || new Date(existing.refresh_expires_at).getTime() < Date.now()) {
      return oauthError(400, "invalid_grant", "Refresh token is invalid or expired.");
    }

    // Rotate: revoke old pair — fail closed so old token can't remain active
    const revoke = await dbUpdate("oauth_tokens", `access_token=eq.${encodeURIComponent(existing.access_token)}`, { revoked: true });
    if (!revoke.ok) return oauthError(500, "server_error", "Failed to rotate tokens. Please try again.");

    const accessToken     = genToken(32);
    const newRefreshToken = genToken(32);
    const now = Date.now();

    const ins = await dbInsert("oauth_tokens", {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      application_id: client.application_id,
      user_id: existing.user_id,
      email_address_id: existing.email_address_id,
      scopes: existing.scopes,
      expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
      refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
    });
    if (!ins.ok) return oauthError(500, "server_error", "Failed to issue tokens. Please try again.");

    return jsonResp({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      scope: existing.scopes.join(" "),
    });
  }

  return oauthError(400, "unsupported_grant_type", "grant_type must be authorization_code or refresh_token.");
}

async function handleUserinfo(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return oauthError(401, "invalid_token", "Missing or malformed Authorization header.");
  }
  const accessToken = authHeader.slice(7).trim();

  const tokenRows = await dbSelect<{
    access_token: string; revoked: boolean; expires_at: string;
    user_id: string; scopes: string[];
  }>("oauth_tokens", `access_token=eq.${encodeURIComponent(accessToken)}&select=*&limit=1`);

  const tokenRow = tokenRows[0];
  if (!tokenRow || tokenRow.revoked || new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return oauthError(401, "invalid_token", "Access token is invalid or expired.");
  }

  const profileRows = await dbSelect<{
    id: string; full_name: string | null;
  }>("profiles", `id=eq.${encodeURIComponent(tokenRow.user_id)}&select=id,full_name&limit=1`);

  const profile = profileRows[0];
  if (!profile) return oauthError(404, "invalid_token", "The user for this token no longer exists.");

  const addressRows = await dbSelect<{ local_part: string; full_email: string }>(
    "email_addresses",
    `user_id=eq.${encodeURIComponent(tokenRow.user_id)}&is_primary=eq.true&select=local_part,full_email&limit=1`,
  );
  const address = addressRows[0];
  const scopes = tokenRow.scopes ?? [];
  const resp: Record<string, unknown> = { sub: profile.id };
  if (scopes.includes("profile")) {
    resp.name = profile.full_name;
    resp.preferred_username = address?.local_part;
  }
  if (scopes.includes("email")) {
    resp.email = address?.full_email;
    resp.email_verified = true;
  }
  return jsonResp(resp);
}

async function handleRevoke(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const { token, token_type_hint, client_id } = body;
  if (!token || !client_id) return oauthError(400, "invalid_request", "token and client_id are required.");
  const client = await getClient(client_id);
  if (!client) return oauthError(400, "invalid_client", "Unknown client_id.");

  if (token_type_hint === "refresh_token") {
    await dbUpdate("oauth_tokens", `refresh_token=eq.${encodeURIComponent(token)}&application_id=eq.${encodeURIComponent(client.application_id)}`, { revoked: true });
  } else {
    await dbUpdate("oauth_tokens", `access_token=eq.${encodeURIComponent(token)}&application_id=eq.${encodeURIComponent(client.application_id)}`, { revoked: true });
    await dbUpdate("oauth_tokens", `refresh_token=eq.${encodeURIComponent(token)}&application_id=eq.${encodeURIComponent(client.application_id)}`, { revoked: true });
  }
  return jsonResp({ ok: true });
}

async function handleIntrospect(req: Request): Promise<Response> {
  const serviceKey = req.headers.get("x-service-key");
  const expectedKey = Deno.env.get("SVC_ROLE_KEY");
  if (!serviceKey || !expectedKey || !safeEqual(serviceKey, expectedKey)) {
    return oauthError(401, "unauthorized", "Missing or invalid X-Service-Key header.");
  }

  const body = await parseBody(req);
  const { token } = body;
  if (!token) return oauthError(400, "invalid_request", "token is required.");

  const rows = await dbSelect<{
    access_token: string; revoked: boolean; expires_at: string;
    user_id: string; application_id: string; scopes: string[]; created_at: string;
  }>("oauth_tokens", `access_token=eq.${encodeURIComponent(token)}&select=*&limit=1`);

  const tokenRow = rows[0];
  if (!tokenRow || tokenRow.revoked || new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return jsonResp({ active: false });
  }
  const clientRows = await dbSelect<{ client_id: string }>(
    "oauth_applications",
    `id=eq.${encodeURIComponent(tokenRow.application_id)}&select=client_id&limit=1`,
  );
  return jsonResp({
    active: true,
    sub: tokenRow.user_id,
    client_id: clientRows[0]?.client_id,
    scope: tokenRow.scopes.join(" "),
    exp: Math.floor(new Date(tokenRow.expires_at).getTime() / 1000),
    iat: Math.floor(new Date(tokenRow.created_at).getTime() / 1000),
    token_type: "Bearer",
  });
}

async function handleGetGrants(req: Request): Promise<Response> {
  const user = await getUserFromBearerToken(req.headers.get("authorization"));
  if (!user) return oauthError(401, "unauthorized", "You must be signed in to AfuMail.");

  const tokens = await dbSelect<{
    application_id: string; scopes: string[]; created_at: string; expires_at: string;
  }>("oauth_tokens", `user_id=eq.${encodeURIComponent(user.id)}&revoked=eq.false&refresh_expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=application_id,scopes,created_at,expires_at`);

  if (!tokens.length) return jsonResp({ grants: [] });

  const uniqueApplicationIds = [...new Set(tokens.map((t) => t.application_id))];
  const clients = await dbSelect<{ id: string; client_id: string; name: string; logo_url: string | null }>(
    "oauth_applications",
    `id=in.(${uniqueApplicationIds.map(encodeURIComponent).join(",")})&select=id,client_id,name,logo_url`,
  );

  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const grants = uniqueApplicationIds.map((applicationId) => {
    const c = clientMap.get(applicationId);
    const grantTokens = tokens.filter((t) => t.application_id === applicationId);
    const scopes = new Set(grantTokens.flatMap((t) => t.scopes));
    return {
      clientId: c?.client_id ?? applicationId,
      name: c?.name ?? applicationId,
      logoUrl: c?.logo_url ?? null,
      scopes: [...scopes],
      authorizedAt: grantTokens.map((t) => t.created_at).sort()[0],
    };
  });
  return jsonResp({ grants });
}

async function handleDeleteGrant(req: Request, clientId: string): Promise<Response> {
  const user = await getUserFromBearerToken(req.headers.get("authorization"));
  if (!user) return oauthError(401, "unauthorized", "You must be signed in to AfuMail.");

  const key = svcKey();
  const r = await fetch(
    `${PROJECT_URL}/rest/v1/oauth_tokens?user_id=eq.${encodeURIComponent(user.id)}&client_id=eq.${encodeURIComponent(clientId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ revoked: true }),
    },
  );
  if (!r.ok) return oauthError(500, "server_error", "Failed to revoke access. Please try again.");
  return jsonResp({ ok: true });
}

// ── Main router ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url  = new URL(req.url);
  const path = extractPath(url);
  const method = req.method.toUpperCase();

  // GET /.well-known/openid-configuration
  if (method === "GET" && (path === "/.well-known/openid-configuration" || path === "/openid-configuration")) {
    return handleDiscovery();
  }

  // GET /clients/:clientId
  const clientsMatch = path.match(/^\/clients\/([^/]+)$/);
  if (method === "GET" && clientsMatch) {
    return handleClientMeta(decodeURIComponent(clientsMatch[1]), url);
  }

  // POST /authorize
  if (method === "POST" && path === "/authorize") {
    return handleAuthorize(req);
  }

  // POST /token
  if (method === "POST" && path === "/token") {
    return handleToken(req);
  }

  // GET /userinfo
  if (method === "GET" && path === "/userinfo") {
    return handleUserinfo(req);
  }

  // POST /revoke
  if (method === "POST" && path === "/revoke") {
    return handleRevoke(req);
  }

  // POST /introspect
  if (method === "POST" && path === "/introspect") {
    return handleIntrospect(req);
  }

  // GET /grants
  if (method === "GET" && path === "/grants") {
    return handleGetGrants(req);
  }

  // DELETE /grants/:clientId
  const grantsMatch = path.match(/^\/grants\/([^/]+)$/);
  if (method === "DELETE" && grantsMatch) {
    return handleDeleteGrant(req, decodeURIComponent(grantsMatch[1]));
  }

  return jsonResp({ error: "not_found" }, 404);
});
