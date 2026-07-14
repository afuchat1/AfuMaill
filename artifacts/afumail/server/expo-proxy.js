/**
 * expo-proxy.js  (smart router)
 *
 * Listens on port 8099 (hardwired by Replit to the mobile artifact).
 * Routes requests to the correct Metro bundler:
 *
 *   Native Expo client (expo-platform: ios | android) → port 5001 (afumail Metro)
 *   Browser / website artifact frame                  → port 5003 (website Metro)
 *
 * Port layout:
 *   8099 — this proxy        (Replit artifact port; both Mobile & Website frames hit here)
 *   5001 — afumail Metro     (mobile app bundle; spawned by this process)
 *   5002 — website expo-proxy (started by artifacts/website: expo workflow)
 *   5003 — website Metro     (website app bundle; started by website expo-proxy)
 */

const http = require("http");
const net  = require("net");
const { spawn } = require("child_process");

const LISTEN_PORT  = parseInt(process.env.PORT || "8099", 10);
const MOBILE_PORT  = 5001;   // afumail Metro (spawned here)
const WEBSITE_PORT = 5003;   // website Metro (managed by separate workflow)

// ── 1. Spawn the afumail Metro on MOBILE_PORT ─────────────────────────────────
function startExpo() {
  console.log(`[expo-proxy] Spawning afumail Metro on port ${MOBILE_PORT}…`);

  const expo = spawn(
    "pnpm",
    ["exec", "expo", "start", "--localhost", "--port", String(MOBILE_PORT)],
    {
      env: { ...process.env, PORT: String(MOBILE_PORT) },
      stdio: "inherit",
      cwd: process.cwd(),
    }
  );

  expo.on("exit", (code, signal) => {
    console.log(
      `[expo-proxy] afumail Metro exited (code=${code} signal=${signal}), restarting in 3s…`
    );
    setTimeout(startExpo, 3000);
  });
}

startExpo();

// ── 2. Decide which Metro to forward to ───────────────────────────────────────
function targetPort(req) {
  const platform = req.headers["expo-platform"];
  // Native Expo Go/dev client sends expo-platform: ios | android
  if (platform === "ios" || platform === "android") return MOBILE_PORT;
  // Everything else (browser, website artifact frame) → website Metro
  return WEBSITE_PORT;
}

// ── 3. HTTP proxy ─────────────────────────────────────────────────────────────
const server = http.createServer((clientReq, clientRes) => {
  const port = targetPort(clientReq);

  const fwdHeaders = { ...clientReq.headers };
  delete fwdHeaders["origin"];
  delete fwdHeaders["referer"];
  fwdHeaders["host"] = `127.0.0.1:${port}`;

  const opts = {
    hostname: "127.0.0.1",
    port,
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
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2"><title>AfuMail starting…</title></head>` +
        `<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#FAF8F5;">` +
        `<p style="color:#555;font-size:1.1rem;">AfuMail is starting up, please wait…</p></body></html>`
      );
    }
  });

  clientReq.pipe(proxy, { end: true });
});

// ── 4. WebSocket proxy (Metro HMR / hot-reload) ───────────────────────────────
server.on("upgrade", (req, socket, head) => {
  const port = targetPort(req);
  const upstream = net.createConnection(port, "127.0.0.1");

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

// ── 5. Listen ─────────────────────────────────────────────────────────────────
server.on("listening", () => {
  console.log(
    `[expo-proxy] Smart router ready on port ${LISTEN_PORT}` +
    ` | browser → website Metro :${WEBSITE_PORT}` +
    ` | native  → afumail Metro :${MOBILE_PORT}`
  );
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`[expo-proxy] Port ${LISTEN_PORT} busy, retrying in 2s…`);
    setTimeout(() => {
      server.close(() => server.listen(LISTEN_PORT, "0.0.0.0"));
    }, 2000);
  } else {
    console.error("[expo-proxy] Fatal:", err.message);
    process.exit(1);
  }
});

server.listen(LISTEN_PORT, "0.0.0.0");
