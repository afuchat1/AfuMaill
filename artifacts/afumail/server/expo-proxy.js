/**
 * expo-proxy.js  (afumail)
 *
 * Opens port 8099 immediately (so Replit's waitForPort check passes),
 * then spawns the afumail Expo Metro dev server on internal port 5001
 * and transparently proxies all HTTP and WebSocket traffic 8099 → 5001.
 *
 * Port layout:
 *   8099 — this proxy   (Replit preview port)
 *   5001 — Expo Web     (afumail, internal only)
 */

const http = require("http");
const net = require("net");
const { spawn } = require("child_process");

const LISTEN_PORT = parseInt(process.env.PORT || "8099", 10);
const EXPO_PORT = 5001;
let expoProcess = null;
let restartTimer = null;
let shuttingDown = false;

// ── 1. Start native Expo Metro on EXPO_PORT (with auto-restart on crash) ─────
function startExpo() {
  console.log(`[expo-proxy] Spawning Expo on port ${EXPO_PORT}…`);

  expoProcess = spawn(
    "pnpm",
    ["exec", "expo", "start", "--localhost", "--port", String(EXPO_PORT)],
    {
      env: {
        ...process.env,
        PORT: String(EXPO_PORT),
        BROWSER: "none",
        CI: "1",
        EXPO_NO_TELEMETRY: "1",
      },
      stdio: "inherit",
      cwd: process.cwd(),
    }
  );

  expoProcess.on("exit", (code, signal) => {
    expoProcess = null;
    if (shuttingDown) return;
    console.log(
      `[expo-proxy] Expo exited (code=${code} signal=${signal}), restarting in 3s…`
    );
    restartTimer = setTimeout(() => {
      restartTimer = null;
      startExpo();
    }, 3000);
  });
}

startExpo();

// ── 2. HTTP proxy: LISTEN_PORT → EXPO_PORT ───────────────────────────────────
const server = http.createServer((clientReq, clientRes) => {
  const fwdHeaders = { ...clientReq.headers };
  delete fwdHeaders["origin"];
  delete fwdHeaders["referer"];
  fwdHeaders["host"] = `127.0.0.1:${EXPO_PORT}`;

  const opts = {
    hostname: "127.0.0.1",
    port: EXPO_PORT,
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

// ── 3. WebSocket proxy: LISTEN_PORT → EXPO_PORT (Metro HMR / hot-reload) ──────
server.on("upgrade", (req, socket, head) => {
  const upstream = net.createConnection(EXPO_PORT, "127.0.0.1");

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

// ── 4. Listen on LISTEN_PORT with retry on EADDRINUSE ────────────────────────
server.on("listening", () => {
  console.log(
    `[expo-proxy] Proxy ready on port ${LISTEN_PORT} → forwarding to afumail Expo on port ${EXPO_PORT}`
  );
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`[expo-proxy] Port ${LISTEN_PORT} busy, retrying in 2s…`);
    setTimeout(() => {
      server.close(() => server.listen(LISTEN_PORT, "0.0.0.0"));
    }, 2000);
  } else {
    console.error("[expo-proxy] Fatal server error:", err.message);
    process.exit(1);
  }
});

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (restartTimer) clearTimeout(restartTimer);
  if (expoProcess && !expoProcess.killed) {
    expoProcess.kill("SIGTERM");
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

server.listen(LISTEN_PORT, "0.0.0.0");
