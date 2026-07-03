# AfuMail Port Assignment — Strict Rules

These rules are permanent and must never be changed.

---

## Port Map

| Port | Service | Workflow | Frame |
|------|---------|----------|-------|
| **8099** | Mobile app — Expo dev server | `artifacts/afumail: expo` | Mobile (phone chrome) |
| **3000** | Website — proxy → port 8099 | `AfuMail Web` | Website (browser frame) |

> **Why 8099 and not 5000?**
> Replit's platform hardwires the mobile artifact (`artifacts/afumail`) to port 8099 at the infrastructure level. It passes `$PORT=8099` into the managed workflow and times out if that port is not opened. This cannot be changed from inside the project — it is a Replit platform constraint, not a project choice.

---

## Rules

1. **Port 8099 is always the mobile app.** The Expo dev server (`pnpm exec expo start`) must always bind to port 8099. Replit controls this via `$PORT`. Never hardcode a different port in the `dev` script.

2. **Port 3000 is always the website.** The `AfuMail Web` workflow runs `server/web-proxy.js` on port 3000. It forwards every request to port 8099 (the live Expo dev server) so the website frame gets the same live bundle. No other service may use port 3000.

3. **Do not swap, reuse, or reassign these ports.** Every developer and every AI agent working on this project must leave these assignments exactly as they are.

4. **Do not serve static builds on port 3000.** `serve.js` (which serves the static `dist/` export) must never be used as the `AfuMail Web` command. Always use `web-proxy.js`.

5. **Do not change the `AfuMail Web` workflow command.** It must remain:
   ```
   cd artifacts/afumail && PORT=3000 node server/web-proxy.js
   ```

6. **Do not change `TARGET_PORT` in `web-proxy.js`.** It must always be `8099`.

7. **Do not change `waitForPort` in `.replit`.** `AfuMail Web` waits for port 3000; `artifacts/afumail: expo` waits for port 8099.

---

## How it works

```
Replit Mobile frame
       │
       ▼
  port 8099  ──────────  Expo dev server (Metro bundler)
       ▲
       │  (web-proxy.js forwards all HTTP requests)
  port 3000  ──────────  web-proxy.js
       │
       ▼
Replit Website frame
```

- Both frames serve the same live Expo bundle.
- The app uses `useWindowDimensions()` to detect viewport width:
  - Wide viewport (website frame, ≥768 px) → full two-column desktop layout.
  - Narrow viewport (phone chrome, <768 px) → auth-only mobile layout.

---

## File references

| File | What must not change |
|------|----------------------|
| `artifacts/afumail/server/web-proxy.js` | `TARGET_PORT = 8099`, `PROXY_PORT` reads `PORT` env (set to 3000 by workflow) |
| `artifacts/afumail/package.json` → `scripts.dev` | Must end with `--port $PORT`; Replit injects `PORT=8099` |
| `.replit` → `AfuMail Web` workflow | `waitForPort = 3000` |
| `.replit` → `artifacts/afumail: expo` workflow | `waitForPort = 8099` (managed by Replit) |
