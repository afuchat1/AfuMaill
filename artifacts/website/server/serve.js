/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with two special routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * - GET / without expo-platform → landing page HTML
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const WEB_DIST = path.resolve(__dirname, "..", "dist");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

// mail.afuchat.com is the one and only production domain for this website.
// Any browser request that reaches production on a different host (a raw
// deployment domain, an old preview URL, etc.) is redirected there so users
// and search engines never see or index a non-canonical origin.
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const CANONICAL_HOST = process.env.CANONICAL_WEB_HOST || "mail.afuchat.com";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function tryServeStaticFile(urlPath, res) {
  const decoded = decodeURIComponent(urlPath);
  const safePath = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");

  // Check web dist first, then native static-build
  for (const root of [WEB_DIST, STATIC_ROOT]) {
    const filePath = path.join(root, safePath);
    if (!filePath.startsWith(root)) continue;
    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { "content-type": contentType });
      res.end(content);
      return true;
    }
  }

  return false;
}

function serveWebApp(req, res) {
  const indexPath = path.join(WEB_DIST, "index.html");
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(content);
  } else {
    // No compiled web build — serve the marketing landing page instead
    serveLandingPage(req, res, landingPageTemplate, appName);
  }
}

const appName = getAppName();

// Load landing page template once at startup (reload on change in dev)
let landingPageTemplate = "";
try {
  landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
} catch {
  landingPageTemplate = "<html><body><h1>AfuMail</h1><p>Template not found.</p></body></html>";
}

const server = http.createServer((req, res) => {
  // Native Expo clients identify themselves with expo-platform header — those
  // requests come from the app itself (manifest/update checks), not a
  // browser, so they're exempt from the canonical-domain redirect.
  const platform = req.headers["expo-platform"];
  const requestHost = (req.headers["x-forwarded-host"] || req.headers["host"] || "").split(":")[0];

  if (IS_PRODUCTION && !platform && requestHost && requestHost !== CANONICAL_HOST) {
    res.writeHead(301, {
      Location: `https://${CANONICAL_HOST}${req.url || "/"}`,
    });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }
  if ((pathname === "/" || pathname === "/manifest") && (platform === "ios" || platform === "android")) {
    return serveManifest(platform, res);
  }

  // Root path for web visitors with no web build → landing page directly
  if (pathname === "/" && !platform) {
    const hasWebBuild = fs.existsSync(path.join(WEB_DIST, "index.html"));
    if (!hasWebBuild) {
      return serveLandingPage(req, res, landingPageTemplate, appName);
    }
  }

  // Try to serve an exact static file (JS chunks, fonts, images, favicon, etc.)
  if (tryServeStaticFile(pathname, res)) return;

  // SPA fallback: if the path has a known static extension and the file wasn't
  // found above, return 404 (don't serve HTML for missing assets).
  const ext = path.extname(pathname).toLowerCase();
  const knownStaticExt = [".js", ".css", ".map", ".png", ".jpg", ".jpeg",
    ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".json"];
  if (ext && knownStaticExt.includes(ext)) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  // All other paths (including routes with dots like /user/jane.doe) → SPA index or landing page
  serveWebApp(req, res);
});

const port = parseInt(process.env.PORT || "3000", 10);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} already in use, retrying in 2s...`);
    setTimeout(() => server.listen(port, "0.0.0.0"), 2000);
  } else {
    throw err;
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
});
