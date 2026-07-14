/**
 * web-proxy.js
 *
 * Listens on port 3000 (website frame).
 * - GET /         → serves the marketing landing page (templates/landing-page.html)
 * - GET /get      → redirects to /login
 * - Everything else → proxied to port 5002 (website expo-proxy / Expo Metro)
 *
 * Port layout:
 *   3000 — this proxy   (what Replit's website frame sees)
 *   5002 — expo-proxy   (the website artifact / Expo Metro)
 *   5003 — Expo Metro   (internal, spawned by expo-proxy)
 *
 * Do NOT use serve.js as the dev command — that serves a static build and
 * is only for production. See PORT_ASSIGNMENT.md and DEVELOPMENT.md.
 */

const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");

const LISTEN_PORT = parseInt(process.env.PORT || "3000", 10);
const TARGET_PORT = 5002; // website Metro proxy
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");

// Load landing page template once at startup
let landingPageTemplate = "";
try {
  landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
} catch {
  landingPageTemplate = "<html><body><h1>AfuMail</h1></body></html>";
}

function serveLandingPage(req, res) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = host;

  let appName = "AfuMail";
  try {
    const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "app.json"), "utf-8"));
    appName = appJson.expo?.name || appName;
  } catch {}

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function proxyToExpo(clientReq, clientRes) {
  const fwdHeaders = { ...clientReq.headers };
  delete fwdHeaders["origin"];
  delete fwdHeaders["referer"];
  fwdHeaders["host"] = `127.0.0.1:${TARGET_PORT}`;

  const opts = {
    hostname: "127.0.0.1",
    port: TARGET_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: fwdHeaders,
  };

  const proxy = http.request(opts, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxy.on("error", () => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(200, { "Content-Type": "text/html" });
      clientRes.end(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2"><title>AfuMail starting\u2026</title></head>` +
        `<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#FAF8F5;">` +
        `<p style="color:#555;font-size:1.1rem;">AfuMail is starting up, please wait\u2026</p></body></html>`
      );
    }
  });

  clientReq.pipe(proxy, { end: true });
}

// ── 1. HTTP handler ───────────────────────────────────────────────────────────
const server = http.createServer((clientReq, clientRes) => {
  const url = new URL(clientReq.url || "/", `http://${clientReq.headers.host}`);
  const pathname = url.pathname;
  const platform = clientReq.headers["expo-platform"];

  // Root or /site (canvas preview path) without an Expo client header → marketing landing page
  if ((pathname === "/" || pathname === "/site") && !platform) {
    return serveLandingPage(clientReq, clientRes);
  }

  // /get → redirect to the web sign-in
  if (pathname === "/get") {
    clientRes.writeHead(302, { Location: "/login" });
    clientRes.end();
    return;
  }

  // Everything else (including /login, /inbox, JS bundles, HMR) → Expo Metro
  proxyToExpo(clientReq, clientRes);
});

// ── 2. WebSocket proxy: LISTEN_PORT → TARGET_PORT (Metro HMR / hot-reload) ───
server.on("upgrade", (req, socket, head) => {
  const upstream = net.createConnection(TARGET_PORT, "127.0.0.1");

  upstream.on("connect", () => {
    const headers = [
      `${req.method} ${req.url} HTTP/${req.httpVersion}`,
      ...Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`),
      "",
      "",
    ].join("\r\n");

    upstream.write(headers);
    if (head && head.length) upstream.write(head);

    socket.pipe(upstream, { end: false });
    upstream.pipe(socket, { end: false });
  });

  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

// ── 3. Listen on LISTEN_PORT with retry on EADDRINUSE ────────────────────────
server.on("listening", () => {
  console.log(
    `[web-proxy] Proxy ready on port ${LISTEN_PORT} → forwarding to Expo on port ${TARGET_PORT}`
  );
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`[web-proxy] Port ${LISTEN_PORT} busy, retrying in 2s…`);
    setTimeout(() => {
      server.close(() => server.listen(LISTEN_PORT, "0.0.0.0"));
    }, 2000);
  } else {
    console.error("[web-proxy] Fatal server error:", err.message);
    process.exit(1);
  }
});

server.listen(LISTEN_PORT, "0.0.0.0");
