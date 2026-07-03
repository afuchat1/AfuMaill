/**
 * Thin HTTP proxy: forwards all requests from port 5000 → port 8099 (Expo dev server).
 * This gives the "AfuMail Web" workflow its own port while reusing the live Expo server.
 */
const http = require("http");

const TARGET_PORT = 8099;
const PROXY_PORT = parseInt(process.env.PORT || "5000", 10);

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

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`Web proxy listening on port ${PROXY_PORT} → forwarding to ${TARGET_PORT}`);
});
