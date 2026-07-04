/**
 * AfuMail Developer App Management — Supabase Edge Function
 *
 * CRUD for OAuth client applications previously served by the Express api-server.
 *
 * Endpoints:
 *   POST   /            Register a new app
 *   GET    /            List owned apps
 *   GET    /:clientId   Get one app
 *   PATCH  /:clientId   Update app metadata
 *   POST   /:clientId/rotate-secret   Rotate client secret
 *   DELETE /:clientId   Delete app
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const PROJECT_URL     = "https://lqowocmjmhbkoxlwyxku.supabase.co";
const VALID_SCOPES    = new Set(["profile", "email"]);
const MAX_APPS        = 25;
const MAX_URIS        = 10;

// ── Utilities ────────────────────────────────────────────────────────────────

function svcKey(): string {
  return Deno.env.get("SVC_ROLE_KEY") ?? "";
}

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function devError(status: number, error: string, description?: string): Response {
  return jsonResp(description ? { error, error_description: description } : { error }, status);
}

function genClientId(): string {
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  return `afu_${Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("")}`;
}

function genClientSecret(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return `afu_secret_${btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}`;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
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

async function dbCount(table: string, qs: string): Promise<number> {
  const key = svcKey();
  const r = await fetch(`${PROJECT_URL}/rest/v1/${table}?${qs}&select=client_id`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key, Prefer: "count=exact" },
  });
  const count = r.headers.get("content-range")?.split("/")[1];
  return parseInt(count ?? "0", 10);
}

async function dbInsert<T>(table: string, body: unknown): Promise<T | null> {
  const key = svcKey();
  const r = await fetch(`${PROJECT_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) return null;
  const rows = (await r.json()) as T[];
  return rows[0] ?? null;
}

async function dbUpdate<T>(table: string, qs: string, body: unknown): Promise<T | null> {
  const key = svcKey();
  const r = await fetch(`${PROJECT_URL}/rest/v1/${table}?${qs}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) return null;
  const rows = (await r.json()) as T[];
  return rows[0] ?? null;
}

async function dbUpdateVoid(table: string, qs: string, body: unknown): Promise<boolean> {
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
  return r.ok;
}

async function dbDelete(table: string, qs: string): Promise<boolean> {
  const key = svcKey();
  const r = await fetch(`${PROJECT_URL}/rest/v1/${table}?${qs}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}`, apikey: key, Prefer: "return=minimal" },
  });
  return r.ok;
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

// ── Validation ────────────────────────────────────────────────────────────────

function validateName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const t = name.trim();
  return t.length >= 2 && t.length <= 80 ? t : null;
}

function validateClientType(v: unknown): "public" | "confidential" | null {
  return v === "public" || v === "confidential" ? v : null;
}

function validateRedirectUri(raw: string, clientType: "public" | "confidential"): string | null {
  let url: URL;
  try { url = new URL(raw); } catch { return `"${raw}" is not a valid absolute URL.`; }
  if (url.username || url.password) return `"${raw}" must not contain credentials.`;
  if (url.hash) return `"${raw}" must not contain a fragment.`;
  if (url.hostname.includes("*")) return `"${raw}" must not contain a wildcard host.`;
  if (url.protocol === "https:") return null;
  if (url.protocol === "http:") {
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      ? null
      : `"${raw}" must use https:// (http:// only for localhost).`;
  }
  if (clientType === "public" && /^[a-z][a-z0-9+.-]*:$/i.test(url.protocol) && url.protocol !== "file:") {
    return null;
  }
  return `"${raw}" must use https://, or a custom URL scheme for public/native apps.`;
}

function validateRedirectUris(
  uris: unknown,
  clientType: "public" | "confidential",
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(uris) || uris.length === 0) {
    return { ok: false, error: "redirect_uris must be a non-empty array of URLs." };
  }
  if (uris.length > MAX_URIS) {
    return { ok: false, error: `A maximum of ${MAX_URIS} redirect_uris is supported.` };
  }
  const clean: string[] = [];
  for (const e of uris) {
    if (typeof e !== "string" || !e || e.length > 2048) {
      return { ok: false, error: "Each redirect_uri must be a non-empty string." };
    }
    const err = validateRedirectUri(e, clientType);
    if (err) return { ok: false, error: err };
    clean.push(e);
  }
  return { ok: true, value: [...new Set(clean)] };
}

function validateScopes(
  scopes: unknown,
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (scopes === undefined) return { ok: true, value: ["profile", "email"] };
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return { ok: false, error: "scopes must be a non-empty array." };
  }
  const clean: string[] = [];
  for (const s of scopes) {
    if (typeof s !== "string" || !VALID_SCOPES.has(s)) {
      return { ok: false, error: `Unsupported scope "${s}". Supported: ${[...VALID_SCOPES].join(", ")}.` };
    }
    clean.push(s);
  }
  return { ok: true, value: [...new Set(clean)] };
}

// ── Row types ─────────────────────────────────────────────────────────────────

type ClientRow = {
  client_id: string;
  name: string;
  logo_url: string | null;
  redirect_uris: string[];
  scopes: string[];
  is_first_party: boolean;
  owner_id: string | null;
  client_type: "public" | "confidential";
  client_secret_hash: string | null;
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
};

const CLIENT_SELECT =
  "client_id,name,logo_url,redirect_uris,scopes,is_first_party,owner_id,client_type,status,client_secret_hash,created_at,updated_at";

function toPublic(row: ClientRow) {
  return {
    clientId:    row.client_id,
    name:        row.name,
    logoUrl:     row.logo_url,
    redirectUris: row.redirect_uris,
    scopes:      row.scopes,
    clientType:  row.client_type,
    status:      row.status,
    hasSecret:   Boolean(row.client_secret_hash),
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

async function requireOwnedApp(
  userId: string,
  clientId: string,
): Promise<{ error: "not_found" | "forbidden" } | { error: null; client: ClientRow }> {
  const rows = await dbSelect<ClientRow>(
    "oauth_clients",
    `client_id=eq.${encodeURIComponent(clientId)}&select=${CLIENT_SELECT}&limit=1`,
  );
  const data = rows[0];
  if (!data) return { error: "not_found" };
  if (!data.owner_id || data.owner_id !== userId) return { error: "forbidden" };
  return { error: null, client: data };
}

// ── Path extraction ───────────────────────────────────────────────────────────

function extractPath(url: URL): string {
  const s = url.pathname.replace(/^\/functions\/v1\/developer-apps/, "") || "/";
  return s.startsWith("/") ? s : `/${s}`;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleCreate(req: Request): Promise<Response> {
  const user = await getUserFromBearerToken(req.headers.get("authorization"));
  if (!user) return devError(401, "unauthorized", "You must be signed in to register an application.");

  const body = await req.json() as Record<string, unknown>;
  const { name, redirect_uris, client_type, scopes, logo_url } = body;

  const cleanName = validateName(name);
  if (!cleanName) return devError(400, "invalid_request", "name is required and must be 2–80 characters.");

  const cleanType = validateClientType(client_type);
  if (!cleanType) return devError(400, "invalid_request", 'client_type must be "public" or "confidential".');

  const redirectResult = validateRedirectUris(redirect_uris, cleanType);
  if (!redirectResult.ok) return devError(400, "invalid_request", redirectResult.error);

  const scopesResult = validateScopes(scopes);
  if (!scopesResult.ok) return devError(400, "invalid_request", scopesResult.error);

  if (logo_url !== undefined && (typeof logo_url !== "string" || (logo_url && !logo_url.startsWith("https://")))) {
    return devError(400, "invalid_request", "logo_url must be an https:// URL.");
  }

  const count = await dbCount("oauth_clients", `owner_id=eq.${encodeURIComponent(user.id)}`);
  if (count >= MAX_APPS) {
    return devError(400, "invalid_request", `You have reached the maximum of ${MAX_APPS} registered applications.`);
  }

  const clientId       = genClientId();
  const plaintextSecret = cleanType === "confidential" ? genClientSecret() : null;

  const inserted = await dbInsert<ClientRow>("oauth_clients", {
    client_id:          clientId,
    name:               cleanName,
    logo_url:           (logo_url as string) || null,
    redirect_uris:      redirectResult.value,
    scopes:             scopesResult.value,
    is_first_party:     false,
    owner_id:           user.id,
    client_type:        cleanType,
    client_secret_hash: plaintextSecret ? await sha256Hex(plaintextSecret) : null,
    status:             "active",
  });

  if (!inserted) return devError(500, "server_error", "Failed to register the application. Please try again.");

  return jsonResp({ app: toPublic(inserted), clientSecret: plaintextSecret }, 201);
}

async function handleList(req: Request): Promise<Response> {
  const user = await getUserFromBearerToken(req.headers.get("authorization"));
  if (!user) return devError(401, "unauthorized", "You must be signed in to AfuMail.");

  const rows = await dbSelect<ClientRow>(
    "oauth_clients",
    `owner_id=eq.${encodeURIComponent(user.id)}&select=${CLIENT_SELECT}&order=created_at.desc`,
  );
  return jsonResp({ apps: rows.map(toPublic) });
}

async function handleGet(req: Request, clientId: string): Promise<Response> {
  const user = await getUserFromBearerToken(req.headers.get("authorization"));
  if (!user) return devError(401, "unauthorized", "You must be signed in to AfuMail.");

  const r = await requireOwnedApp(user.id, clientId);
  if (r.error === "not_found") return devError(404, "invalid_client", "Application not found.");
  if (r.error === "forbidden") return devError(403, "forbidden", "You do not own this application.");

  return jsonResp({ app: toPublic(r.client) });
}

async function handleUpdate(req: Request, clientId: string): Promise<Response> {
  const user = await getUserFromBearerToken(req.headers.get("authorization"));
  if (!user) return devError(401, "unauthorized", "You must be signed in to AfuMail.");

  const r = await requireOwnedApp(user.id, clientId);
  if (r.error === "not_found") return devError(404, "invalid_client", "Application not found.");
  if (r.error === "forbidden") return devError(403, "forbidden", "You do not own this application.");

  const body = await req.json() as Record<string, unknown>;
  const { name, redirect_uris, scopes, logo_url } = body;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (name !== undefined) {
    const n = validateName(name);
    if (!n) return devError(400, "invalid_request", "name must be 2–80 characters.");
    updates.name = n;
  }
  if (redirect_uris !== undefined) {
    const rv = validateRedirectUris(redirect_uris, r.client.client_type);
    if (!rv.ok) return devError(400, "invalid_request", rv.error);
    updates.redirect_uris = rv.value;
  }
  if (scopes !== undefined) {
    const sv = validateScopes(scopes);
    if (!sv.ok) return devError(400, "invalid_request", sv.error);
    updates.scopes = sv.value;
  }
  if (logo_url !== undefined) {
    if (logo_url !== null && (typeof logo_url !== "string" || !logo_url.startsWith("https://"))) {
      return devError(400, "invalid_request", "logo_url must be an https:// URL.");
    }
    updates.logo_url = (logo_url as string) || null;
  }

  const updated = await dbUpdate<ClientRow>(
    "oauth_clients",
    `client_id=eq.${encodeURIComponent(clientId)}&select=${CLIENT_SELECT}`,
    updates,
  );
  if (!updated) return devError(500, "server_error", "Failed to update the application.");

  return jsonResp({ app: toPublic(updated) });
}

async function handleRotateSecret(req: Request, clientId: string): Promise<Response> {
  const user = await getUserFromBearerToken(req.headers.get("authorization"));
  if (!user) return devError(401, "unauthorized", "You must be signed in to AfuMail.");

  const r = await requireOwnedApp(user.id, clientId);
  if (r.error === "not_found") return devError(404, "invalid_client", "Application not found.");
  if (r.error === "forbidden") return devError(403, "forbidden", "You do not own this application.");
  if (r.client.client_type !== "confidential") {
    return devError(400, "invalid_request", "Only confidential applications have a client_secret to rotate.");
  }

  const plaintextSecret = genClientSecret();
  const ok = await dbUpdateVoid(
    "oauth_clients",
    `client_id=eq.${encodeURIComponent(clientId)}`,
    { client_secret_hash: await sha256Hex(plaintextSecret), updated_at: new Date().toISOString() },
  );
  if (!ok) return devError(500, "server_error", "Failed to rotate the client secret.");

  return jsonResp({ clientSecret: plaintextSecret });
}

async function handleDelete(req: Request, clientId: string): Promise<Response> {
  const user = await getUserFromBearerToken(req.headers.get("authorization"));
  if (!user) return devError(401, "unauthorized", "You must be signed in to AfuMail.");

  const r = await requireOwnedApp(user.id, clientId);
  if (r.error === "not_found") return devError(404, "invalid_client", "Application not found.");
  if (r.error === "forbidden") return devError(403, "forbidden", "You do not own this application.");

  const ok = await dbDelete("oauth_clients", `client_id=eq.${encodeURIComponent(clientId)}`);
  if (!ok) return devError(500, "server_error", "Failed to delete the application.");

  return jsonResp({ ok: true });
}

// ── Main router ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url    = new URL(req.url);
  const path   = extractPath(url);       // e.g. "/" or "/:clientId" or "/:clientId/rotate-secret"
  const method = req.method.toUpperCase();

  // POST / → create
  if (method === "POST" && path === "/") return handleCreate(req);

  // GET / → list
  if (method === "GET" && path === "/") return handleList(req);

  // Routes with /:clientId
  const idMatch = path.match(/^\/([^/]+)$/);
  if (idMatch) {
    const clientId = decodeURIComponent(idMatch[1]);
    if (method === "GET")    return handleGet(req, clientId);
    if (method === "PATCH")  return handleUpdate(req, clientId);
    if (method === "DELETE") return handleDelete(req, clientId);
  }

  // POST /:clientId/rotate-secret
  const rotateMatch = path.match(/^\/([^/]+)\/rotate-secret$/);
  if (method === "POST" && rotateMatch) {
    return handleRotateSecret(req, decodeURIComponent(rotateMatch[1]));
  }

  return jsonResp({ error: "not_found" }, 404);
});
