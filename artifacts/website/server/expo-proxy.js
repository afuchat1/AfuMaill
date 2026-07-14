/**
 * expo-proxy.js  (website)
 *
 * Opens port 5002 immediately so Replit's waitForPort check passes,
 * then spawns the website's Expo/Metro dev server on internal port 5003
 * and transparently proxies all HTTP and WebSocket traffic 5002 → 5003.
 *
 * Port layout (website artifact):
 *   5002 — this proxy   (what web-proxy.js connects to)
 *   5003 — Expo Metro   (internal only)
 *   3000 — web-proxy.js (Replit website frame, serves landing + proxies to 5002)
 */

const http = require("http");
const net = require("net");
const { spawn } = require("child_process");

const LISTEN_PORT = parseInt(process.env.PORT || "5002", 10);
const EXPO_PORT = 5003;
let expoReady = false;

// ── 1. Start Expo Metro on EXPO_PORT (with auto-restart on crash) ─────────────
function startExpo() {
  console.log(`[website-expo-proxy] Spawning Expo on port ${EXPO_PORT}…`);

  const expo = spawn(
    "pnpm",
    ["exec", "expo", "start", "--localhost", "--port", String(EXPO_PORT)],
    {
      env: { ...process.env, PORT: String(EXPO_PORT) },
      stdio: "inherit",
      cwd: process.cwd(),
    }
  );

  expo.on("exit", (code, signal) => {
    expoReady = false;
    console.log(
      `[website-expo-proxy] Expo exited (code=${code} signal=${signal}), restarting in 3s…`
    );
    setTimeout(startExpo, 3000);
  });

  // Mark Expo as likely ready after a reasonable warm-up period
  setTimeout(() => { expoReady = true; }, 15000);
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
    `[website-expo-proxy] Proxy ready on port ${LISTEN_PORT} → forwarding to Expo on port ${EXPO_PORT}`
  );
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`[website-expo-proxy] Port ${LISTEN_PORT} busy, retrying in 2s…`);
    setTimeout(() => {
      server.close(() => server.listen(LISTEN_PORT, "0.0.0.0"));
    }, 2000);
  } else {
    console.error("[website-expo-proxy] Fatal server error:", err.message);
    process.exit(1);
  }
});

server.listen(LISTEN_PORT, "0.0.0.0");
