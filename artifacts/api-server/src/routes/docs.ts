import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * GET /docs
 * Public developer documentation for the AfuMail OAuth 2.1 / OIDC platform.
 * No authentication required.
 */
router.get("/docs", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(HTML);
});

// Serve the same page at /docs/ with trailing slash
router.get("/docs/", (_req, res) => res.redirect(301, "/docs"));

// ─── HTML ────────────────────────────────────────────────────────────────────

const HTML = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AfuMail OAuth · Developer Docs</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0a0a0b;
      --surface: #111113;
      --surface2: #18181b;
      --border: #27272a;
      --accent: #6366f1;
      --accent-dim: #6366f120;
      --text: #fafafa;
      --muted: #a1a1aa;
      --green: #22c55e;
      --red: #ef4444;
      --yellow: #eab308;
      --code-bg: #18181b;
      --radius: 12px;
      --mono: "SF Mono", "Fira Code", "Cascadia Code", Consolas, monospace;
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      font-size: 15px;
    }

    /* ── Layout ── */
    .layout { display: flex; min-height: 100vh; }

    .sidebar {
      width: 260px;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 32px 0;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 20px 28px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }

    .sidebar-logo-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .sidebar-logo-text { font-weight: 700; font-size: 16px; }
    .sidebar-logo-sub { font-size: 11px; color: var(--muted); }

    .sidebar nav { padding: 0 12px; }

    .nav-section {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      padding: 14px 8px 6px;
      font-weight: 600;
    }

    .nav-item {
      display: block;
      padding: 8px 10px;
      border-radius: 8px;
      color: var(--muted);
      text-decoration: none;
      font-size: 14px;
      transition: all 0.15s;
    }
    .nav-item:hover, .nav-item.active { background: var(--accent-dim); color: var(--text); }

    .main { flex: 1; min-width: 0; }

    .hero {
      padding: 80px 64px 60px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, var(--bg) 0%, #0d0d1a 100%);
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid var(--accent)40;
      border-radius: 100px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .hero h1 { font-size: 42px; font-weight: 800; letter-spacing: -1.5px; line-height: 1.1; margin-bottom: 16px; }
    .hero h1 span { color: var(--accent); }

    .hero-sub { font-size: 17px; color: var(--muted); max-width: 560px; line-height: 1.7; margin-bottom: 32px; }

    .hero-chips { display: flex; flex-wrap: wrap; gap: 8px; }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 100px;
      padding: 6px 14px;
      font-size: 13px;
      color: var(--muted);
    }
    .chip .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }

    .content { padding: 64px; max-width: 860px; }

    /* ── Sections ── */
    .section { margin-bottom: 72px; }
    .section-anchor { scroll-margin-top: 24px; }

    h2 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 10px; }
    h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
    h4 { font-size: 14px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }

    p { color: var(--muted); margin-bottom: 14px; line-height: 1.75; }
    p strong { color: var(--text); }
    p a { color: var(--accent); text-decoration: none; }
    p a:hover { text-decoration: underline; }

    .section-divider { height: 1px; background: var(--border); margin-bottom: 72px; }

    /* ── Cards ── */
    .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    @media (max-width: 700px) { .card-grid { grid-template-columns: 1fr; } }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
    }
    .card-icon { font-size: 22px; margin-bottom: 10px; }
    .card h3 { font-size: 15px; margin-bottom: 6px; }
    .card p { font-size: 13px; margin: 0; }

    /* ── Flow diagram ── */
    .flow { display: flex; flex-direction: column; gap: 0; margin: 24px 0; }
    .flow-step {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-bottom: none;
      position: relative;
    }
    .flow-step:first-child { border-radius: var(--radius) var(--radius) 0 0; }
    .flow-step:last-child { border-bottom: 1px solid var(--border); border-radius: 0 0 var(--radius) var(--radius); }

    .flow-num {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--accent);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .flow-text { flex: 1; }
    .flow-text strong { color: var(--text); display: block; margin-bottom: 3px; font-size: 14px; }
    .flow-text span { color: var(--muted); font-size: 13px; line-height: 1.6; }

    /* ── Code blocks ── */
    pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 22px;
      overflow-x: auto;
      margin: 16px 0;
      font-family: var(--mono);
      font-size: 13px;
      line-height: 1.65;
    }

    code {
      font-family: var(--mono);
      font-size: 13px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 2px 6px;
      color: var(--accent);
    }

    pre code {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
    }

    .kw { color: #c792ea; }
    .str { color: #c3e88d; }
    .cm { color: #546e7a; font-style: italic; }
    .num { color: #f78c6c; }
    .fn { color: #82aaff; }
    .var { color: #eeffff; }
    .prop { color: #80cbc4; }
    .url { color: #89ddff; }

    /* ── Endpoint cards ── */
    .endpoint {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 16px;
      overflow: hidden;
    }

    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
    }

    .method {
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 5px;
      letter-spacing: 0.03em;
    }
    .method.get { background: #22c55e22; color: var(--green); }
    .method.post { background: #6366f122; color: var(--accent); }
    .method.delete { background: #ef444422; color: var(--red); }

    .endpoint-path { font-family: var(--mono); font-size: 13px; color: var(--text); }
    .endpoint-desc { font-size: 13px; color: var(--muted); margin-left: auto; }

    .endpoint-body { padding: 16px 18px; }
    .endpoint-body p { margin-bottom: 10px; font-size: 13px; }
    .endpoint-body p:last-child { margin-bottom: 0; }

    /* ── Param table ── */
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 13px; }
    th { text-align: left; padding: 8px 12px; color: var(--muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    td { padding: 10px 12px; border-bottom: 1px solid var(--border)80; vertical-align: top; }
    td:first-child { font-family: var(--mono); color: var(--accent); white-space: nowrap; }
    td:nth-child(2) { color: var(--green); font-family: var(--mono); font-size: 12px; white-space: nowrap; }
    td:last-child { color: var(--muted); line-height: 1.6; }

    /* ── Scope badges ── */
    .scope-list { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
    .scope-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .scope-name { font-family: var(--mono); font-size: 13px; color: var(--accent); min-width: 80px; padding-top: 1px; }
    .scope-desc { font-size: 13px; color: var(--muted); line-height: 1.6; }

    /* ── Error table ── */
    .error-code { color: var(--red) !important; }

    /* ── Callout ── */
    .callout {
      display: flex;
      gap: 12px;
      background: var(--accent-dim);
      border: 1px solid var(--accent)40;
      border-radius: var(--radius);
      padding: 14px 16px;
      margin: 16px 0;
    }
    .callout-icon { font-size: 16px; flex-shrink: 0; padding-top: 1px; }
    .callout p { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.65; }

    /* ── Lang tabs ── */
    .tabs { display: flex; gap: 4px; margin-bottom: -1px; position: relative; z-index: 1; }
    .tab {
      padding: 7px 16px;
      border-radius: 8px 8px 0 0;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border);
      border-bottom: none;
      background: var(--surface2);
      color: var(--muted);
      transition: all 0.15s;
    }
    .tab.active { background: var(--code-bg); color: var(--text); border-color: var(--border); }

    /* ── Footer ── */
    .footer {
      padding: 40px 64px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .footer a { color: var(--muted); text-decoration: none; }
    .footer a:hover { color: var(--text); }

    @media (max-width: 900px) {
      .sidebar { display: none; }
      .hero { padding: 48px 24px 40px; }
      .hero h1 { font-size: 30px; }
      .content { padding: 40px 24px; }
      .footer { padding: 32px 24px; }
    }
  </style>
</head>
<body>
<div class="layout">

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">✉️</div>
      <div>
        <div class="sidebar-logo-text">AfuMail</div>
        <div class="sidebar-logo-sub">Developer Platform</div>
      </div>
    </div>
    <nav>
      <div class="nav-section">Getting Started</div>
      <a class="nav-item" href="#overview">Overview</a>
      <a class="nav-item" href="#quickstart">Quick Start</a>
      <a class="nav-item" href="#registering">Registering an App</a>

      <div class="nav-section">Core Flow</div>
      <a class="nav-item" href="#flow">Authorization Flow</a>
      <a class="nav-item" href="#pkce">PKCE</a>
      <a class="nav-item" href="#scopes">Scopes</a>

      <div class="nav-section">API Reference</div>
      <a class="nav-item" href="#endpoints">All Endpoints</a>
      <a class="nav-item" href="#userinfo">UserInfo</a>
      <a class="nav-item" href="#revocation">Token Revocation</a>

      <div class="nav-section">Examples</div>
      <a class="nav-item" href="#js-example">JavaScript / Web</a>
      <a class="nav-item" href="#python-example">Python</a>
      <a class="nav-item" href="#curl-example">cURL</a>

      <div class="nav-section">Reference</div>
      <a class="nav-item" href="#errors">Error Codes</a>
      <a class="nav-item" href="#discovery">OIDC Discovery</a>
      <a class="nav-item" href="#security">Security</a>
    </nav>
  </aside>

  <!-- Main -->
  <div class="main">

    <!-- Hero -->
    <div class="hero">
      <div class="hero-badge">✦ AfuMail Identity Platform</div>
      <h1>Sign in with<br/><span>AfuMail</span></h1>
      <p class="hero-sub">
        Let your users authenticate with their AfuMail account. One account, every Afu app — 
        and soon, any third-party application. Built on OAuth 2.1 + PKCE with OpenID Connect.
      </p>
      <div class="hero-chips">
        <span class="chip"><span class="dot"></span> OAuth 2.1</span>
        <span class="chip"><span class="dot"></span> OpenID Connect</span>
        <span class="chip"><span class="dot"></span> PKCE Required</span>
        <span class="chip"><span class="dot"></span> No Client Secrets</span>
        <span class="chip"><span class="dot"></span> Token Rotation</span>
      </div>
    </div>

    <!-- Content -->
    <div class="content">

      <!-- ── Overview ── -->
      <div class="section" id="overview">
        <div class="section-anchor"></div>
        <h2>Overview</h2>
        <p>
          AfuMail is the <strong>identity foundation of the entire Afu ecosystem</strong>. Every user creates one 
          AfuMail account and uses it to sign in to every Afu product — AfuChat, Engagera, AfuCloud, MMRadio — 
          without creating another account.
        </p>
        <p>
          The AfuMail OAuth platform is designed around <strong>widely-adopted open standards</strong>: OAuth 2.1, 
          OpenID Connect, and PKCE. There are no proprietary flows. If you've integrated Google Sign-In or 
          GitHub OAuth before, this will feel familiar.
        </p>

        <div class="card-grid">
          <div class="card">
            <div class="card-icon">🔐</div>
            <h3>No Passwords Shared</h3>
            <p>Your app never sees the user's password. Auth always happens on AfuMail's own UI.</p>
          </div>
          <div class="card">
            <div class="card-icon">🔄</div>
            <h3>Token Rotation</h3>
            <p>Refresh tokens rotate on every use. Stolen tokens are invalidated automatically.</p>
          </div>
          <div class="card">
            <div class="card-icon">📋</div>
            <h3>User Consent</h3>
            <p>Users explicitly approve which data your app can access and can revoke at any time.</p>
          </div>
          <div class="card">
            <div class="card-icon">🌐</div>
            <h3>Standard OIDC</h3>
            <p>OpenID Connect userinfo endpoint. Use any OIDC-compatible library in your app.</p>
          </div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ── Quick Start ── -->
      <div class="section" id="quickstart">
        <div class="section-anchor"></div>
        <h2>Quick Start</h2>
        <p>The fastest way to add "Sign in with AfuMail" to a web app — three steps:</p>

        <h3 style="margin-top: 24px;">Step 1 — Build the authorization URL</h3>
        <p>Generate a PKCE code verifier, hash it to a challenge, and send the user here:</p>
        <pre><span class="cm">// 1. Generate PKCE values (do this in the browser or server)</span>
<span class="kw">const</span> <span class="var">codeVerifier</span> = <span class="fn">generateCodeVerifier</span>(); <span class="cm">// random 64-byte base64url string</span>
<span class="kw">const</span> <span class="var">codeChallenge</span> = <span class="kw">await</span> <span class="fn">sha256Base64Url</span>(<span class="var">codeVerifier</span>);
<span class="kw">const</span> <span class="var">state</span> = <span class="fn">randomBase64Url</span>(<span class="num">16</span>); <span class="cm">// CSRF protection</span>

<span class="cm">// 2. Store verifier + state in session/localStorage (you'll need them at callback)</span>
sessionStorage.<span class="fn">setItem</span>(<span class="str">"oauth_state"</span>, <span class="var">state</span>);
sessionStorage.<span class="fn">setItem</span>(<span class="str">"code_verifier"</span>, <span class="var">codeVerifier</span>);

<span class="cm">// 3. Redirect the user</span>
<span class="kw">const</span> <span class="var">params</span> = <span class="kw">new</span> <span class="fn">URLSearchParams</span>({
  client_id:             <span class="str">"your-client-id"</span>,
  redirect_uri:          <span class="str">"https://yourapp.com/callback"</span>,
  code_challenge:        <span class="var">codeChallenge</span>,
  code_challenge_method: <span class="str">"S256"</span>,
  scope:                 <span class="str">"profile email"</span>,
  state:                 <span class="var">state</span>,
});

window.location.href = <span class="str">\`https://mail.afuchat.com/oauth/authorize?\${<span class="var">params</span>}\`</span>;</pre>

        <h3>Step 2 — Handle the callback</h3>
        <p>AfuMail redirects back to your <code>redirect_uri</code> with <code>?code=...&state=...</code>. Exchange the code for tokens:</p>
        <pre><span class="cm">// At your redirect_uri callback page:</span>
<span class="kw">const</span> { <span class="var">code</span>, <span class="var">state</span> } = <span class="fn">parseQueryParams</span>(window.location.search);

<span class="cm">// Verify state matches (CSRF check)</span>
<span class="kw">if</span> (<span class="var">state</span> !== sessionStorage.<span class="fn">getItem</span>(<span class="str">"oauth_state"</span>)) <span class="kw">throw new</span> <span class="fn">Error</span>(<span class="str">"State mismatch"</span>);

<span class="kw">const</span> <span class="var">codeVerifier</span> = sessionStorage.<span class="fn">getItem</span>(<span class="str">"code_verifier"</span>);

<span class="cm">// Exchange code for tokens</span>
<span class="kw">const</span> <span class="var">tokenRes</span> = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">"https://api.mail.afuchat.com/api/oauth/token"</span>, {
  method: <span class="str">"POST"</span>,
  headers: { <span class="str">"Content-Type"</span>: <span class="str">"application/json"</span> },
  body: <span class="fn">JSON.stringify</span>({
    grant_type:    <span class="str">"authorization_code"</span>,
    code:          <span class="var">code</span>,
    redirect_uri:  <span class="str">"https://yourapp.com/callback"</span>,
    client_id:     <span class="str">"your-client-id"</span>,
    code_verifier: <span class="var">codeVerifier</span>,
  }),
});
<span class="kw">const</span> { <span class="var">access_token</span>, <span class="var">refresh_token</span> } = <span class="kw">await</span> <span class="var">tokenRes</span>.<span class="fn">json</span>();</pre>

        <h3>Step 3 — Fetch the user's profile</h3>
        <pre><span class="kw">const</span> <span class="var">userRes</span> = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">"https://api.mail.afuchat.com/api/oauth/userinfo"</span>, {
  headers: { <span class="prop">Authorization</span>: <span class="str">\`Bearer \${<span class="var">access_token</span>}\`</span> },
});
<span class="kw">const</span> <span class="var">user</span> = <span class="kw">await</span> <span class="var">userRes</span>.<span class="fn">json</span>();
<span class="cm">// { sub, name, preferred_username, email, email_verified }</span>
console.<span class="fn">log</span>(<span class="str">"Signed in as:"</span>, <span class="var">user</span>.<span class="prop">name</span>, <span class="var">user</span>.<span class="prop">email</span>);</pre>

        <div class="callout">
          <div class="callout-icon">💡</div>
          <p>The <strong>OIDC discovery document</strong> at 
          <code>/api/oauth/.well-known/openid-configuration</code> lists all endpoint URLs 
          and capabilities. Most OIDC libraries can auto-configure from this URL.</p>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ── Registering ── -->
      <div class="section" id="registering">
        <div class="section-anchor"></div>
        <h2>Registering Your App</h2>
        <p>
          Applications are registered <strong>self-service</strong> through the
          <strong>AfuMail Developer Dashboard</strong> (sign in at mail.afuchat.com →
          Profile &amp; Account → Developer → Open dashboard). You must have an AfuMail account
          to register an app, and every app you create is permanently owned by your account —
          only you can view its secret material, edit it, rotate its secret, or delete it.
        </p>
        <p>
          Registration mints a unique <strong>client_id</strong> immediately. There is no manual
          approval step, but abusive or compromised apps may be suspended.
        </p>

        <h3 style="margin-top: 20px;">Choosing a client type</h3>
        <table>
          <tr><th>Type</th><th>Use for</th><th>Authenticates with</th></tr>
          <tr>
            <td>public</td>
            <td>Mobile apps, single-page apps, and anything else that can't keep a secret safe.</td>
            <td>PKCE only — no client_secret is issued.</td>
          </tr>
          <tr>
            <td>confidential</td>
            <td>Trusted backend servers that can store a secret safely.</td>
            <td>PKCE <em>and</em> client_secret, sent at the token endpoint.</td>
          </tr>
        </table>

        <h3 style="margin-top: 20px;">What you'll receive</h3>
        <table>
          <tr><th>Item</th><th>Example</th><th>Description</th></tr>
          <tr>
            <td>client_id</td>
            <td style="color: var(--muted); font-family: var(--mono);">afu_3f9a1c...</td>
            <td>Public identifier for your app. Safe to include in frontend code.</td>
          </tr>
          <tr>
            <td>client_secret</td>
            <td style="color: var(--muted); font-family: var(--mono);">afu_secret_...</td>
            <td>Confidential apps only. Shown <strong>exactly once</strong> at creation (or rotation) — AfuMail stores only its hash and cannot redisplay it. Never ship it in a mobile app, browser bundle, or public repo.</td>
          </tr>
          <tr>
            <td>redirect_uris</td>
            <td style="color: var(--muted); font-family: var(--mono);">["https://yourapp.com/cb"]</td>
            <td>AfuMail will only redirect to these exact URIs after authorization. Must be https:// (custom URL schemes are permitted for public/native apps; http://localhost for local development).</td>
          </tr>
          <tr>
            <td>scopes</td>
            <td style="color: var(--muted); font-family: var(--mono);">["profile", "email"]</td>
            <td>The maximum set of scopes your app may request.</td>
          </tr>
        </table>

        <div class="callout">
          <div class="callout-icon">🔒</div>
          <p>
            PKCE is required for <strong>every</strong> app, public or confidential — it's not a
            substitute for a client_secret, it's defense in depth. If your client_secret is ever
            exposed, rotate it immediately from the dashboard; the old secret stops working the
            instant a new one is issued.
          </p>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ── Flow ── -->
      <div class="section" id="flow">
        <div class="section-anchor"></div>
        <h2>Authorization Flow</h2>
        <p>AfuMail implements the <strong>OAuth 2.1 Authorization Code flow with PKCE</strong>.</p>

        <div class="flow">
          <div class="flow-step">
            <div class="flow-num">1</div>
            <div class="flow-text">
              <strong>Your app generates a PKCE code verifier + challenge</strong>
              <span>A cryptographically random 64-byte string (verifier) is hashed with SHA-256 to produce the challenge. The verifier stays secret in your app; only the challenge is sent.</span>
            </div>
          </div>
          <div class="flow-step">
            <div class="flow-num">2</div>
            <div class="flow-text">
              <strong>Redirect the user to AfuMail's consent screen</strong>
              <span>Send the user to <code>/oauth/authorize</code> with your client_id, redirect_uri, code_challenge, and scopes. AfuMail handles the sign-in UI.</span>
            </div>
          </div>
          <div class="flow-step">
            <div class="flow-num">3</div>
            <div class="flow-text">
              <strong>User signs in and approves (or denies)</strong>
              <span>AfuMail authenticates the user and shows a consent screen listing exactly what your app is requesting. The user taps Allow or Deny.</span>
            </div>
          </div>
          <div class="flow-step">
            <div class="flow-num">4</div>
            <div class="flow-text">
              <strong>AfuMail redirects back with a one-time authorization code</strong>
              <span>A short-lived code (60 seconds) is appended to your redirect_uri as <code>?code=...&state=...</code>. This code can only be used once.</span>
            </div>
          </div>
          <div class="flow-step">
            <div class="flow-num">5</div>
            <div class="flow-text">
              <strong>Exchange the code for tokens</strong>
              <span>POST the code + your code verifier to <code>/api/oauth/token</code>. AfuMail verifies the PKCE hash and issues an access token + refresh token.</span>
            </div>
          </div>
          <div class="flow-step">
            <div class="flow-num">6</div>
            <div class="flow-text">
              <strong>Use the access token to read the user's profile</strong>
              <span>GET <code>/api/oauth/userinfo</code> with <code>Authorization: Bearer &lt;access_token&gt;</code>. Returns the user's AfuMail ID, name, username, and email.</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ── PKCE ── -->
      <div class="section" id="pkce">
        <div class="section-anchor"></div>
        <h2>PKCE — Why It's Required</h2>
        <p>
          PKCE (Proof Key for Code Exchange) is <strong>mandatory</strong> for all AfuMail OAuth clients. 
          There are no exceptions. This is the OAuth 2.1 standard for public clients and prevents 
          authorization code interception attacks.
        </p>

        <h3 style="margin-top: 20px;">Generating PKCE values</h3>
        <pre><span class="cm">// Browser (Web Crypto API)</span>
<span class="kw">async function</span> <span class="fn">generatePKCE</span>() {
  <span class="kw">const</span> <span class="var">array</span> = <span class="kw">new</span> <span class="fn">Uint8Array</span>(<span class="num">64</span>);
  crypto.<span class="fn">getRandomValues</span>(<span class="var">array</span>);
  <span class="kw">const</span> <span class="var">codeVerifier</span> = <span class="fn">btoa</span>(<span class="fn">String.fromCharCode</span>(...<span class="var">array</span>))
    .<span class="fn">replace</span>(<span class="str">/\+/g</span>, <span class="str">"-"</span>).<span class="fn">replace</span>(<span class="str">/\//g</span>, <span class="str">"_"</span>).<span class="fn">replace</span>(<span class="str">/=+$/</span>, <span class="str">""</span>);

  <span class="kw">const</span> <span class="var">hashBuffer</span> = <span class="kw">await</span> crypto.subtle.<span class="fn">digest</span>(<span class="str">"SHA-256"</span>, <span class="kw">new</span> <span class="fn">TextEncoder</span>().<span class="fn">encode</span>(<span class="var">codeVerifier</span>));
  <span class="kw">const</span> <span class="var">codeChallenge</span> = <span class="fn">btoa</span>(<span class="fn">String.fromCharCode</span>(...<span class="kw">new</span> <span class="fn">Uint8Array</span>(<span class="var">hashBuffer</span>)))
    .<span class="fn">replace</span>(<span class="str">/\+/g</span>, <span class="str">"-"</span>).<span class="fn">replace</span>(<span class="str">/\//g</span>, <span class="str">"_"</span>).<span class="fn">replace</span>(<span class="str">/=+$/</span>, <span class="str">""</span>);

  <span class="kw">return</span> { <span class="var">codeVerifier</span>, <span class="var">codeChallenge</span> };
}</pre>
      </div>

      <div class="section-divider"></div>

      <!-- ── Scopes ── -->
      <div class="section" id="scopes">
        <div class="section-anchor"></div>
        <h2>Scopes</h2>
        <p>
          Scopes control which user data your application can access. Request only what you need — 
          users see exactly what they're approving.
        </p>

        <div class="scope-list">
          <div class="scope-item">
            <div class="scope-name">profile</div>
            <div class="scope-desc">
              Access the user's display name and username (<code>name</code>, <code>preferred_username</code>).
              Does <em>not</em> include the email address.
            </div>
          </div>
          <div class="scope-item">
            <div class="scope-name">email</div>
            <div class="scope-desc">
              Access the user's AfuMail email address (<code>email</code>, <code>email_verified</code>).
              Always <code>true</code> for AfuMail accounts — email is verified at registration.
            </div>
          </div>
        </div>

        <p style="margin-top: 16px;">
          Request multiple scopes as a space-separated string: <code>scope=profile email</code>
        </p>

        <div class="callout">
          <div class="callout-icon">🔭</div>
          <p>
            Additional scopes (<code>inbox.read</code>, <code>calendar.read</code>, etc.) are planned 
            and will be documented here when available.
          </p>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ── Endpoints ── -->
      <div class="section" id="endpoints">
        <div class="section-anchor"></div>
        <h2>API Reference</h2>
        <p>
          All endpoints are under <code>https://api.mail.afuchat.com/api/oauth/</code> in production.
          In development, the API server runs on port 8080.
        </p>

        <!-- Discovery -->
        <div class="endpoint">
          <div class="endpoint-header">
            <span class="method get">GET</span>
            <span class="endpoint-path">/api/oauth/.well-known/openid-configuration</span>
            <span class="endpoint-desc">Public</span>
          </div>
          <div class="endpoint-body">
            <p>OIDC Discovery document. Returns issuer, endpoint URLs, and supported capabilities. 
            Use this URL to auto-configure an OIDC client library.</p>
          </div>
        </div>

        <!-- Clients -->
        <div class="endpoint">
          <div class="endpoint-header">
            <span class="method get">GET</span>
            <span class="endpoint-path">/api/oauth/clients/:clientId</span>
            <span class="endpoint-desc">Public</span>
          </div>
          <div class="endpoint-body">
            <p>Returns metadata for a registered client. Used by the consent screen to display 
            the app's name and logo, and to validate the redirect_uri before showing anything to the user.</p>
            <table>
              <tr><th>Query param</th><th>Required</th><th>Description</th></tr>
              <tr><td>redirect_uri</td><td style="color:var(--yellow)">optional</td><td>If provided, AfuMail validates it against the registered URIs and returns 400 if it doesn't match.</td></tr>
            </table>
          </div>
        </div>

        <!-- Authorize -->
        <div class="endpoint">
          <div class="endpoint-header">
            <span class="method post">POST</span>
            <span class="endpoint-path">/api/oauth/authorize</span>
            <span class="endpoint-desc">AfuMail session required</span>
          </div>
          <div class="endpoint-body">
            <p>Mints a one-time authorization code after the authenticated user approves the consent screen. 
            This is called by AfuMail's own UI — your app redirects the user to the consent screen; 
            AfuMail calls this endpoint internally on approval.</p>
            <p><strong>Authorization:</strong> <code>Bearer &lt;supabase-session-access-token&gt;</code></p>
            <table>
              <tr><th>Body field</th><th>Required</th><th>Description</th></tr>
              <tr><td>client_id</td><td style="color:var(--red)">required</td><td>Your registered client ID.</td></tr>
              <tr><td>redirect_uri</td><td style="color:var(--red)">required</td><td>Must exactly match a registered URI.</td></tr>
              <tr><td>code_challenge</td><td style="color:var(--red)">required</td><td>SHA-256 hash of code_verifier, base64url-encoded.</td></tr>
              <tr><td>code_challenge_method</td><td style="color:var(--yellow)">optional</td><td>Must be <code>S256</code> (only supported method). Defaults to S256.</td></tr>
              <tr><td>scope</td><td style="color:var(--yellow)">optional</td><td>Space-separated scopes. Defaults to <code>profile email</code>.</td></tr>
              <tr><td>state</td><td style="color:var(--red)">required</td><td>Opaque, unguessable value returned unchanged in the callback. Required for CSRF protection.</td></tr>
            </table>
            <p><strong>Response:</strong> <code>{"code": "...", "state": "..."}</code></p>
          </div>
        </div>

        <!-- Token -->
        <div class="endpoint" id="endpoints-token">
          <div class="endpoint-header">
            <span class="method post">POST</span>
            <span class="endpoint-path">/api/oauth/token</span>
            <span class="endpoint-desc">Public</span>
          </div>
          <div class="endpoint-body">
            <p>Exchanges an authorization code for tokens, or rotates a refresh token. 
            Content-Type must be <code>application/json</code>.</p>

            <h4>grant_type: authorization_code</h4>
            <table>
              <tr><th>Body field</th><th>Required</th><th>Description</th></tr>
              <tr><td>grant_type</td><td style="color:var(--red)">required</td><td><code>authorization_code</code></td></tr>
              <tr><td>code</td><td style="color:var(--red)">required</td><td>The authorization code from the callback.</td></tr>
              <tr><td>redirect_uri</td><td style="color:var(--red)">required</td><td>Same URI used when requesting the code.</td></tr>
              <tr><td>client_id</td><td style="color:var(--red)">required</td><td>Your client ID.</td></tr>
              <tr><td>code_verifier</td><td style="color:var(--red)">required</td><td>The original PKCE verifier string.</td></tr>
              <tr><td>client_secret</td><td style="color:var(--yellow)">conditional</td><td>Required only if your app is registered as <code>confidential</code>. Omit for public apps.</td></tr>
            </table>

            <h4>grant_type: refresh_token</h4>
            <table>
              <tr><th>Body field</th><th>Required</th><th>Description</th></tr>
              <tr><td>grant_type</td><td style="color:var(--red)">required</td><td><code>refresh_token</code></td></tr>
              <tr><td>refresh_token</td><td style="color:var(--red)">required</td><td>The refresh token from a previous token response.</td></tr>
              <tr><td>client_id</td><td style="color:var(--red)">required</td><td>Your client ID.</td></tr>
              <tr><td>client_secret</td><td style="color:var(--yellow)">conditional</td><td>Required only if your app is registered as <code>confidential</code>. Omit for public apps.</td></tr>
            </table>

            <p><strong>Response (both grant types):</strong></p>
            <pre>{
  <span class="prop">"access_token"</span>:  <span class="str">"eyJ..."</span>,         <span class="cm">// 1-hour opaque Bearer token</span>
  <span class="prop">"refresh_token"</span>: <span class="str">"eyJ..."</span>,         <span class="cm">// 30-day rotating refresh token</span>
  <span class="prop">"token_type"</span>:    <span class="str">"Bearer"</span>,
  <span class="prop">"expires_in"</span>:    <span class="num">3600</span>,             <span class="cm">// seconds</span>
  <span class="prop">"scope"</span>:         <span class="str">"profile email"</span>
}</pre>
          </div>
        </div>

        <!-- UserInfo -->
        <div class="endpoint" id="userinfo">
          <div class="endpoint-header">
            <span class="method get">GET</span>
            <span class="endpoint-path">/api/oauth/userinfo</span>
            <span class="endpoint-desc">Access token required</span>
          </div>
          <div class="endpoint-body">
            <p>Returns claims about the authenticated user. The access token must be an AfuMail OAuth 
            token (from <code>/api/oauth/token</code>), not a Supabase session token.</p>
            <p><strong>Authorization:</strong> <code>Bearer &lt;access_token&gt;</code></p>
            <p><strong>Response:</strong></p>
            <pre>{
  <span class="prop">"sub"</span>:                <span class="str">"uuid-of-user"</span>,       <span class="cm">// permanent user ID</span>
  <span class="prop">"name"</span>:               <span class="str">"Afu User"</span>,           <span class="cm">// full display name (scope: profile)</span>
  <span class="prop">"preferred_username"</span>: <span class="str">"afuuser"</span>,           <span class="cm">// @username (scope: profile)</span>
  <span class="prop">"email"</span>:              <span class="str">"afuuser@afumail.com"</span>,<span class="cm">// AfuMail address (scope: email)</span>
  <span class="prop">"email_verified"</span>:     <span class="kw">true</span>                 <span class="cm">// always true for AfuMail accounts</span>
}</pre>
            <p>Only fields covered by the granted scopes are included in the response.</p>
          </div>
        </div>

        <!-- Revoke -->
        <div class="endpoint" id="revocation">
          <div class="endpoint-header">
            <span class="method post">POST</span>
            <span class="endpoint-path">/api/oauth/revoke</span>
            <span class="endpoint-desc">Public</span>
          </div>
          <div class="endpoint-body">
            <p>RFC 7009 token revocation. Always returns 200, even for unknown tokens.</p>
            <table>
              <tr><th>Body field</th><th>Required</th><th>Description</th></tr>
              <tr><td>token</td><td style="color:var(--red)">required</td><td>The access_token or refresh_token to revoke.</td></tr>
              <tr><td>client_id</td><td style="color:var(--red)">required</td><td>Your client ID.</td></tr>
              <tr><td>token_type_hint</td><td style="color:var(--yellow)">optional</td><td><code>access_token</code> or <code>refresh_token</code> — helps the server search faster.</td></tr>
            </table>
          </div>
        </div>

        <!-- Grants -->
        <div class="endpoint">
          <div class="endpoint-header">
            <span class="method get">GET</span>
            <span class="endpoint-path">/api/oauth/grants</span>
            <span class="endpoint-desc">AfuMail session required</span>
          </div>
          <div class="endpoint-body">
            <p>Lists all apps the signed-in user has authorized. Used by the AfuMail 
            Settings → Connected Accounts screen.</p>
          </div>
        </div>

        <div class="endpoint">
          <div class="endpoint-header">
            <span class="method delete">DELETE</span>
            <span class="endpoint-path">/api/oauth/grants/:clientId</span>
            <span class="endpoint-desc">AfuMail session required</span>
          </div>
          <div class="endpoint-body">
            <p>Revokes all tokens the signed-in user has issued to the specified client. 
            The user can trigger this from Settings → Connected Accounts → Remove.</p>
          </div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ── JS Example ── -->
      <div class="section" id="js-example">
        <div class="section-anchor"></div>
        <h2>JavaScript / Web Example</h2>
        <p>Complete implementation using vanilla JavaScript and the Web Crypto API. No libraries required.</p>
        <pre><span class="cm">// ── afumail-oauth.js ─────────────────────────────────────</span>
<span class="kw">const</span> <span class="var">AFUMAIL_BASE</span>   = <span class="str">"https://api.mail.afuchat.com"</span>;
<span class="kw">const</span> <span class="var">CLIENT_ID</span>      = <span class="str">"your-client-id"</span>;
<span class="kw">const</span> <span class="var">REDIRECT_URI</span>   = <span class="str">"https://yourapp.com/callback"</span>;
<span class="kw">const</span> <span class="var">SCOPES</span>         = <span class="str">"profile email"</span>;

<span class="kw">function</span> <span class="fn">b64url</span>(<span class="var">buf</span>) {
  <span class="kw">return</span> <span class="fn">btoa</span>(<span class="fn">String.fromCharCode</span>(...<span class="kw">new</span> <span class="fn">Uint8Array</span>(<span class="var">buf</span>)))
    .<span class="fn">replace</span>(<span class="str">/\+/g</span>,<span class="str">"-"</span>).<span class="fn">replace</span>(<span class="str">/\//g</span>,<span class="str">"_"</span>).<span class="fn">replace</span>(<span class="str">/=+$/</span>,<span class="str">""</span>);
}

<span class="kw">export async function</span> <span class="fn">startLogin</span>() {
  <span class="cm">// Generate PKCE</span>
  <span class="kw">const</span> <span class="var">raw</span> = crypto.<span class="fn">getRandomValues</span>(<span class="kw">new</span> <span class="fn">Uint8Array</span>(<span class="num">64</span>));
  <span class="kw">const</span> <span class="var">verifier</span>  = <span class="fn">b64url</span>(<span class="var">raw</span>);
  <span class="kw">const</span> <span class="var">hashBuf</span>   = <span class="kw">await</span> crypto.subtle.<span class="fn">digest</span>(<span class="str">"SHA-256"</span>, <span class="kw">new</span> <span class="fn">TextEncoder</span>().<span class="fn">encode</span>(<span class="var">verifier</span>));
  <span class="kw">const</span> <span class="var">challenge</span> = <span class="fn">b64url</span>(<span class="var">hashBuf</span>);
  <span class="kw">const</span> <span class="var">state</span>     = <span class="fn">b64url</span>(crypto.<span class="fn">getRandomValues</span>(<span class="kw">new</span> <span class="fn">Uint8Array</span>(<span class="num">16</span>)));

  sessionStorage.<span class="fn">setItem</span>(<span class="str">"pkce_verifier"</span>, <span class="var">verifier</span>);
  sessionStorage.<span class="fn">setItem</span>(<span class="str">"oauth_state"</span>,   <span class="var">state</span>);

  <span class="kw">const</span> <span class="var">p</span> = <span class="kw">new</span> <span class="fn">URLSearchParams</span>({
    client_id: <span class="var">CLIENT_ID</span>, redirect_uri: <span class="var">REDIRECT_URI</span>,
    code_challenge: <span class="var">challenge</span>, code_challenge_method: <span class="str">"S256"</span>,
    scope: <span class="var">SCOPES</span>, state: <span class="var">state</span>,
  });
  window.location.href = <span class="str">\`https://mail.afuchat.com/oauth/authorize?\${<span class="var">p</span>}\`</span>;
}

<span class="kw">export async function</span> <span class="fn">handleCallback</span>() {
  <span class="kw">const</span> <span class="var">p</span>        = <span class="kw">new</span> <span class="fn">URLSearchParams</span>(location.search);
  <span class="kw">const</span> <span class="var">code</span>     = <span class="var">p</span>.<span class="fn">get</span>(<span class="str">"code"</span>);
  <span class="kw">const</span> <span class="var">state</span>    = <span class="var">p</span>.<span class="fn">get</span>(<span class="str">"state"</span>);
  <span class="kw">const</span> <span class="var">error</span>    = <span class="var">p</span>.<span class="fn">get</span>(<span class="str">"error"</span>);

  <span class="kw">if</span> (<span class="var">error</span>) <span class="kw">throw new</span> <span class="fn">Error</span>(<span class="str">"User denied access"</span>);
  <span class="kw">if</span> (<span class="var">state</span> !== sessionStorage.<span class="fn">getItem</span>(<span class="str">"oauth_state"</span>)) <span class="kw">throw new</span> <span class="fn">Error</span>(<span class="str">"State mismatch"</span>);

  <span class="kw">const</span> <span class="var">verifier</span> = sessionStorage.<span class="fn">getItem</span>(<span class="str">"pkce_verifier"</span>);
  sessionStorage.<span class="fn">removeItem</span>(<span class="str">"pkce_verifier"</span>);
  sessionStorage.<span class="fn">removeItem</span>(<span class="str">"oauth_state"</span>);

  <span class="kw">const</span> <span class="var">tokenRes</span> = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">\`\${<span class="var">AFUMAIL_BASE</span>}/api/oauth/token\`</span>, {
    method: <span class="str">"POST"</span>,
    headers: { <span class="str">"Content-Type"</span>: <span class="str">"application/json"</span> },
    body: <span class="fn">JSON.stringify</span>({ grant_type: <span class="str">"authorization_code"</span>,
      code: <span class="var">code</span>, redirect_uri: <span class="var">REDIRECT_URI</span>, client_id: <span class="var">CLIENT_ID</span>,
      code_verifier: <span class="var">verifier</span> }),
  });
  <span class="kw">if</span> (!<span class="var">tokenRes</span>.ok) <span class="kw">throw new</span> <span class="fn">Error</span>(<span class="kw">await</span> <span class="var">tokenRes</span>.<span class="fn">text</span>());
  <span class="kw">const</span> <span class="var">tokens</span> = <span class="kw">await</span> <span class="var">tokenRes</span>.<span class="fn">json</span>();

  <span class="kw">const</span> <span class="var">userRes</span> = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">\`\${<span class="var">AFUMAIL_BASE</span>}/api/oauth/userinfo\`</span>, {
    headers: { <span class="prop">Authorization</span>: <span class="str">\`Bearer \${<span class="var">tokens</span>.<span class="prop">access_token</span>}\`</span> },
  });
  <span class="kw">return</span> { <span class="var">tokens</span>, user: <span class="kw">await</span> <span class="var">userRes</span>.<span class="fn">json</span>() };
}</pre>
      </div>

      <div class="section-divider"></div>

      <!-- ── Python ── -->
      <div class="section" id="python-example">
        <div class="section-anchor"></div>
        <h2>Python Example</h2>
        <p>Server-side token exchange using the <code>requests</code> library (e.g. in a Flask callback route).</p>
        <pre><span class="kw">import</span> requests, hashlib, base64, secrets, urllib.parse

AFUMAIL_BASE = <span class="str">"https://api.mail.afuchat.com"</span>
CLIENT_ID    = <span class="str">"your-client-id"</span>
REDIRECT_URI = <span class="str">"https://yourapp.com/callback"</span>

<span class="kw">def</span> <span class="fn">generate_pkce</span>():
    verifier  = secrets.<span class="fn">token_urlsafe</span>(<span class="num">64</span>)
    digest    = hashlib.<span class="fn">sha256</span>(verifier.<span class="fn">encode</span>()).<span class="fn">digest</span>()
    challenge = base64.<span class="fn">urlsafe_b64encode</span>(digest).<span class="fn">rstrip</span>(<span class="str">b"="</span>).<span class="fn">decode</span>()
    <span class="kw">return</span> verifier, challenge

<span class="kw">def</span> <span class="fn">build_auth_url</span>(verifier, challenge, state):
    params = urllib.parse.<span class="fn">urlencode</span>({
        <span class="str">"client_id"</span>:             CLIENT_ID,
        <span class="str">"redirect_uri"</span>:          REDIRECT_URI,
        <span class="str">"code_challenge"</span>:        challenge,
        <span class="str">"code_challenge_method"</span>: <span class="str">"S256"</span>,
        <span class="str">"scope"</span>:                 <span class="str">"profile email"</span>,
        <span class="str">"state"</span>:                 state,
    })
    <span class="kw">return</span> <span class="str">f"https://mail.afuchat.com/oauth/authorize?{params}"</span>

<span class="kw">def</span> <span class="fn">exchange_code</span>(code, verifier):
    r = requests.<span class="fn">post</span>(<span class="str">f"{AFUMAIL_BASE}/api/oauth/token"</span>, json={
        <span class="str">"grant_type"</span>:   <span class="str">"authorization_code"</span>,
        <span class="str">"code"</span>:         code,
        <span class="str">"redirect_uri"</span>: REDIRECT_URI,
        <span class="str">"client_id"</span>:    CLIENT_ID,
        <span class="str">"code_verifier"</span>: verifier,
    })
    r.<span class="fn">raise_for_status</span>()
    <span class="kw">return</span> r.<span class="fn">json</span>()

<span class="kw">def</span> <span class="fn">get_user</span>(access_token):
    r = requests.<span class="fn">get</span>(<span class="str">f"{AFUMAIL_BASE}/api/oauth/userinfo"</span>,
                     headers={<span class="str">"Authorization"</span>: <span class="str">f"Bearer {access_token}"</span>})
    r.<span class="fn">raise_for_status</span>()
    <span class="kw">return</span> r.<span class="fn">json</span>()</pre>
      </div>

      <div class="section-divider"></div>

      <!-- ── cURL ── -->
      <div class="section" id="curl-example">
        <div class="section-anchor"></div>
        <h2>cURL Reference</h2>

        <h3>Fetch user profile</h3>
        <pre><span class="cm"># Using an access token you already have:</span>
curl -X GET https://api.mail.afuchat.com/api/oauth/userinfo \\
  -H <span class="str">"Authorization: Bearer YOUR_ACCESS_TOKEN"</span></pre>

        <h3 style="margin-top:24px;">Exchange authorization code for tokens</h3>
        <pre>curl -X POST https://api.mail.afuchat.com/api/oauth/token \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE_FROM_CALLBACK",
    "redirect_uri": "https://yourapp.com/callback",
    "client_id": "your-client-id",
    "code_verifier": "YOUR_CODE_VERIFIER"
  }'</span></pre>

        <h3 style="margin-top:24px;">Refresh an access token</h3>
        <pre>curl -X POST https://api.mail.afuchat.com/api/oauth/token \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{
    "grant_type": "refresh_token",
    "refresh_token": "YOUR_REFRESH_TOKEN",
    "client_id": "your-client-id"
  }'</span></pre>

        <h3 style="margin-top:24px;">Revoke a token</h3>
        <pre>curl -X POST https://api.mail.afuchat.com/api/oauth/revoke \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{
    "token": "TOKEN_TO_REVOKE",
    "client_id": "your-client-id",
    "token_type_hint": "access_token"
  }'</span></pre>

        <h3 style="margin-top:24px;">OIDC Discovery</h3>
        <pre>curl https://api.mail.afuchat.com/api/oauth/.well-known/openid-configuration</pre>
      </div>

      <div class="section-divider"></div>

      <!-- ── Errors ── -->
      <div class="section" id="errors">
        <div class="section-anchor"></div>
        <h2>Error Codes</h2>
        <p>AfuMail follows RFC 6749 error response format. Errors are JSON with an <code>error</code> 
        field and an optional <code>error_description</code>.</p>

        <table>
          <tr><th>Error</th><th>HTTP</th><th>Meaning</th></tr>
          <tr><td class="error-code">invalid_request</td><td>400</td><td>Missing or malformed parameters, including a missing <code>state</code> value.</td></tr>
          <tr><td class="error-code">invalid_client</td><td>400 / 404</td><td>client_id is unknown or not registered.</td></tr>
          <tr><td class="error-code">invalid_grant</td><td>400</td><td>Authorization code or refresh token is invalid, expired, used, or PKCE verification failed.</td></tr>
          <tr><td class="error-code">unsupported_grant_type</td><td>400</td><td>grant_type is not <code>authorization_code</code> or <code>refresh_token</code>.</td></tr>
          <tr><td class="error-code">invalid_token</td><td>401 / 404</td><td>Access token is invalid, expired, or revoked.</td></tr>
          <tr><td class="error-code">unauthorized</td><td>401</td><td>No valid AfuMail session token provided (for session-gated endpoints).</td></tr>
          <tr><td class="error-code">access_denied</td><td>—</td><td>User denied the consent screen. Returned as a query param in the redirect: <code>?error=access_denied</code>.</td></tr>
          <tr><td class="error-code">temporarily_unavailable</td><td>429</td><td>Rate limit exceeded. Back off and retry after a short delay.</td></tr>
          <tr><td class="error-code">server_error</td><td>500</td><td>An unexpected error occurred on the server.</td></tr>
        </table>
        <p style="margin-top: 12px;">Every error response includes a human-readable <code>error_description</code> field alongside the machine-readable <code>error</code> code.</p>
      </div>

      <div class="section-divider"></div>

      <!-- ── Discovery ── -->
      <div class="section" id="discovery">
        <div class="section-anchor"></div>
        <h2>OIDC Discovery</h2>
        <p>
          AfuMail publishes an OpenID Connect discovery document. Most OIDC client libraries 
          can auto-configure from this URL:
        </p>
        <pre>https://api.mail.afuchat.com/api/oauth/.well-known/openid-configuration</pre>
        <p>This document includes all endpoint URLs, supported scopes, and grant types.</p>
      </div>

      <div class="section-divider"></div>

      <!-- ── Security ── -->
      <div class="section" id="security">
        <div class="section-anchor"></div>
        <h2>Security</h2>

        <div class="card-grid">
          <div class="card">
            <div class="card-icon">🔀</div>
            <h3>Token Rotation</h3>
            <p>Every use of a refresh token issues a new access + refresh pair. The old refresh token is immediately revoked. Stolen tokens can't be reused.</p>
          </div>
          <div class="card">
            <div class="card-icon">⏱️</div>
            <h3>Short-lived Access Tokens</h3>
            <p>Access tokens expire in <strong>1 hour</strong>. Refresh tokens expire in <strong>30 days</strong>. Authorization codes expire in <strong>60 seconds</strong> and are single-use.</p>
          </div>
          <div class="card">
            <div class="card-icon">🛡️</div>
            <h3>PKCE Required</h3>
            <p>All clients must use PKCE (S256). There is no way to request tokens without it. This prevents authorization code interception attacks.</p>
          </div>
          <div class="card">
            <div class="card-icon">🎯</div>
            <h3>Exact Redirect URI Matching</h3>
            <p>Redirect URIs are matched exactly — no wildcards, no open redirects. Every permitted URI must be registered in advance.</p>
          </div>
          <div class="card">
            <div class="card-icon">✅</div>
            <h3>State Parameter Required</h3>
            <p>A <code>state</code> parameter is mandatory on every authorization request. AfuMail rejects requests without one. Verify it matches at your callback to prevent CSRF attacks.</p>
          </div>
          <div class="card">
            <div class="card-icon">⛔</div>
            <h3>Rate Limiting</h3>
            <p>OAuth endpoints are rate-limited per IP address. Excessive requests receive <code>429 temporarily_unavailable</code>.</p>
          </div>
          <div class="card">
            <div class="card-icon">🚫</div>
            <h3>No Client Secrets</h3>
            <p>AfuMail uses public client semantics (OAuth 2.1). No secrets are issued — PKCE replaces them and is safe for browser and mobile contexts.</p>
          </div>
        </div>
      </div>

    </div><!-- end .content -->

    <div class="footer">
      <span>AfuMail Identity Platform</span>
      <a href="https://mail.afuchat.com">AfuMail</a>
      <span>© 2026 Afu. All rights reserved.</span>
    </div>

  </div><!-- end .main -->
</div><!-- end .layout -->
</body>
</html>`;

export default router;
