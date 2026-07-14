/**
 * expo-proxy.js  (afumail)
 *
 * Listens on port 8099 (Replit mobile artifact port).
 * - Spawns the afumail Metro on port 5001 (so it stays available for the desktop frame).
 * - Forwards all HTTP/WS traffic on 8099 → port 5003 (website Metro),
 *   so the mobile artifact frame previews the website app.
 *
 * Port layout:
 *   8099 — this proxy         (mobile artifact frame → website Metro)
 *   5001 — afumail Metro      (spawned here; used by web-proxy on port 3000)
 *   5002 — website expo-proxy (managed by artifacts/website: expo workflow)
 *   5003 — website Metro      (website app; what 8099 forwards to)
 *   3000 — web-proxy.js       (desktop artifact frame → afumail Metro on 5001)
 */

const http = require("http");
const net  = require("net");
const { spawn } = require("child_process");

const LISTEN_PORT  = parseInt(process.env.PORT || "8099", 10);
const AFUMAIL_PORT = 5001;  // afumail Metro (spawned below)
const WEBSITE_PORT = 5003;  // website Metro (proxy target for 8099)

// ── 1. Spawn the afumail Metro so port 3000's web-proxy can reach it ──────────
function startExpo() {
  console.log(`[expo-proxy] Spawning afumail Metro on port ${AFUMAIL_PORT}…`);

  const expo = spawn(
    "pnpm",
    ["exec", "expo", "start", "--localhost", "--port", String(AFUMAIL_PORT)],
    {
      env: { ...process.env, PORT: String(AFUMAIL_PORT) },
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

// ── 2. HTTP proxy: 8099 → website Metro (5003) ────────────────────────────────
const server = http.createServer((clientReq, clientRes) => {
  const fwdHeaders = { ...clientReq.headers };
  delete fwdHeaders["origin"];
  delete fwdHeaders["referer"];
  fwdHeaders["host"] = `127.0.0.1:${WEBSITE_PORT}`;

  const opts = {
    hostname: "127.0.0.1",
    port: WEBSITE_PORT,
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

// ── 3. WebSocket proxy: 8099 → website Metro (Metro HMR) ─────────────────────
server.on("upgrade", (req, socket, head) => {
  const upstream = net.createConnection(WEBSITE_PORT, "127.0.0.1");

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

// ── 4. Listen ─────────────────────────────────────────────────────────────────
server.on("listening", () => {
  console.log(
    `[expo-proxy] Ready on port ${LISTEN_PORT}` +
    ` | 8099 → website Metro :${WEBSITE_PORT}` +
    ` | afumail Metro spawned on :${AFUMAIL_PORT} (for port 3000)`
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
