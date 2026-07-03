import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { Router, type IRouter } from "express";

import { supabaseAdmin, getUserFromBearerToken } from "../lib/supabaseAdmin";

const router: IRouter = Router();

const AUTH_CODE_TTL_MS = 60 * 1000; // 60s, standard for auth codes
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d

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
      }
    | null;
}

/**
 * GET /api/oauth/clients/:clientId?redirect_uri=...
 * Public. Used by the consent screen to show "X wants to access your account"
 * and to validate the redirect_uri before rendering anything.
 */
router.get("/oauth/clients/:clientId", async (req, res) => {
  const client = await getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: "Unknown client_id." });

  const redirectUri = req.query.redirect_uri as string | undefined;
  if (redirectUri && !client.redirect_uris.includes(redirectUri)) {
    return res.status(400).json({ error: "redirect_uri is not registered for this client." });
  }

  return res.json({
    clientId: client.client_id,
    name: client.name,
    logoUrl: client.logo_url,
    scopes: client.scopes,
    isFirstParty: client.is_first_party,
  });
});

/**
 * POST /api/oauth/authorize
 * Requires: Authorization: Bearer <supabase access token> (the AfuMail session).
 * Body: { client_id, redirect_uri, code_challenge, code_challenge_method, scope, state }
 * Mints a one-time authorization code once the (already-authenticated) user
 * approves the consent screen.
 */
router.post("/oauth/authorize", async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "You must be signed in to AfuMail to authorize an app." });

  const { client_id, redirect_uri, code_challenge, code_challenge_method, scope, state } = req.body ?? {};

  if (!client_id || !redirect_uri || !code_challenge) {
    return res.status(400).json({ error: "client_id, redirect_uri and code_challenge are required." });
  }
  if (code_challenge_method && code_challenge_method !== "S256") {
    return res.status(400).json({ error: "Only the S256 PKCE method is supported." });
  }

  const client = await getClient(client_id);
  if (!client) return res.status(400).json({ error: "Unknown client_id." });
  if (!client.redirect_uris.includes(redirect_uri)) {
    return res.status(400).json({ error: "redirect_uri is not registered for this client." });
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
  });

  if (error) return res.status(500).json({ error: "Failed to create authorization code." });

  return res.json({ code, state: state ?? null });
});

/**
 * POST /api/oauth/token
 * Standard OAuth2 token endpoint. Public clients only (PKCE required, no
 * client_secret). Supports grant_type=authorization_code and refresh_token.
 */
router.post("/oauth/token", async (req, res) => {
  const { grant_type } = req.body ?? {};

  if (grant_type === "authorization_code") {
    const { code, redirect_uri, client_id, code_verifier } = req.body ?? {};
    if (!code || !redirect_uri || !client_id || !code_verifier) {
      return res.status(400).json({ error: "invalid_request", error_description: "Missing required parameters." });
    }

    const { data: authCode } = await supabaseAdmin
      .from("oauth_authorization_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!authCode || authCode.used || authCode.client_id !== client_id || authCode.redirect_uri !== redirect_uri) {
      return res.status(400).json({ error: "invalid_grant", error_description: "Authorization code is invalid." });
    }
    if (new Date(authCode.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "invalid_grant", error_description: "Authorization code has expired." });
    }

    const expectedChallenge = base64UrlSha256(code_verifier);
    if (!safeEqual(expectedChallenge, authCode.code_challenge)) {
      return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed." });
    }

    // Mark used (single-use codes)
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
    if (tokenError) return res.status(500).json({ error: "server_error" });

    return res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      scope: authCode.scope,
    });
  }

  if (grant_type === "refresh_token") {
    const { refresh_token, client_id } = req.body ?? {};
    if (!refresh_token || !client_id) {
      return res.status(400).json({ error: "invalid_request" });
    }

    const { data: existing } = await supabaseAdmin
      .from("oauth_tokens")
      .select("*")
      .eq("refresh_token", refresh_token)
      .eq("client_id", client_id)
      .maybeSingle();

    if (!existing || existing.revoked || new Date(existing.refresh_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "invalid_grant" });
    }

    // Rotate: revoke old, issue new pair
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
    if (tokenError) return res.status(500).json({ error: "server_error" });

    return res.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      scope: existing.scope,
    });
  }

  return res.status(400).json({ error: "unsupported_grant_type" });
});

/**
 * GET /api/oauth/userinfo
 * OIDC-style userinfo endpoint. Requires: Authorization: Bearer <access_token>
 * (the opaque OAuth access token minted above, NOT the AfuMail Supabase session).
 */
router.get("/oauth/userinfo", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "invalid_token" });
  }
  const accessToken = authHeader.slice("Bearer ".length);

  const { data: tokenRow } = await supabaseAdmin
    .from("oauth_tokens")
    .select("*")
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked || new Date(tokenRow.access_expires_at).getTime() < Date.now()) {
    return res.status(401).json({ error: "invalid_token", error_description: "Access token is invalid or expired." });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, email")
    .eq("id", tokenRow.user_id)
    .maybeSingle();

  if (!profile) return res.status(404).json({ error: "user_not_found" });

  return res.json({
    sub: profile.id,
    preferred_username: profile.username,
    name: profile.full_name,
    email: profile.email,
    email_verified: true,
  });
});

/**
 * GET /api/oauth/grants
 * Requires: Authorization: Bearer <supabase access token> (AfuMail session).
 * Lists third-party apps the signed-in user has authorized (for the
 * "Connected Accounts" settings screen).
 */
router.get("/oauth/grants", async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Not signed in." });

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
router.delete("/oauth/grants/:clientId", async (req, res) => {
  const user = await getUserFromBearerToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const { error } = await supabaseAdmin
    .from("oauth_tokens")
    .update({ revoked: true })
    .eq("user_id", user.id)
    .eq("client_id", req.params.clientId);

  if (error) return res.status(500).json({ error: "Failed to revoke access." });
  return res.json({ ok: true });
});

export default router;
