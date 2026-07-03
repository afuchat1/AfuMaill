// Base URL for the AfuMail API server (Express, artifacts/api-server), which
// hosts the OAuth 2.1 / OIDC identity-provider endpoints under /api/oauth/*.
//
// Dev (Replit): the api-server listens on port 8080, which Replit forwards
// externally on the same dev domain via an explicit `:8080` port suffix
// (see the `[[ports]]` entry in `.replit`).
// Prod: same origin as the web app, reverse-proxied to the api-server.
function computeApiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}:8080`;
  }
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL ?? "https://mail.afuchat.com";
  return `${siteUrl.replace(/\/+$/, "")}/api-server`;
}

export const API_BASE_URL = computeApiBaseUrl();

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
