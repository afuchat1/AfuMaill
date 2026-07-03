/**
 * Thin HTTP proxy: forwards all requests from port 3000 → port 8099 (Expo dev server).
 * Website frame (port 3000) reuses the live Expo dev server (mobile runs on port 8099).
 */
const http = require("http");

const TARGET_PORT = 8099; // Expo Web server runs on port 8099
const PROXY_PORT = parseInt(process.env.PORT || "3000", 10);

const server = http.createServer((clientReq, clientRes) => {
  const options = {
    hostname: "127.0.0.1",
    port: TARGET_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers, host: `127.0.0.1:${TARGET_PORT}` },
  };

  const proxy = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxy.on("error", (err) => {
    console.error("Proxy error:", err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502);
      clientRes.end("Expo dev server not ready yet, retrying...");
    }
  });

  clientReq.pipe(proxy, { end: true });
});

let retryTimer = null;

function startListening() {
  retryTimer = null;
  server.listen(PROXY_PORT, "0.0.0.0");
}

server.on("listening", () => {
  console.log(`Web proxy listening on port ${PROXY_PORT} → forwarding to ${TARGET_PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    // Only schedule one retry at a time — never bind if a timer is already pending
    if (!retryTimer) {
      console.log(`Port ${PROXY_PORT} busy, retrying in 2s…`);
      retryTimer = setTimeout(startListening, 2000);
    }
  } else {
    console.error("Fatal server error:", err.message);
    process.exit(1);
  }
});

startListening();
