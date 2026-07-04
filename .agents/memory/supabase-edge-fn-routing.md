---
name: Supabase edge function URL routing
description: How Supabase rewrites request URLs before they reach a Deno edge function — critical for sub-path routing.
---

## The rule

Inside a Supabase Edge Function, `new URL(req.url).pathname` is:

```
/<function-name>/<rest-of-path>
```

**Not** `/functions/v1/<function-name>/<rest-of-path>`.

## Example

External caller hits:
`https://lqowocmjmhbkoxlwyxku.supabase.co/functions/v1/oauth/authorize`

Inside the function, `req.url` is:
`http://lqowocmjmhbkoxlwyxku.supabase.co/oauth/authorize`

## How to apply

Strip only the function-name segment in `extractPath`:

```ts
function extractPath(url: URL): string {
  // Strip /<function-name> prefix — Supabase does NOT include /functions/v1/
  const s = url.pathname.replace(/^\/oauth/, "") || "/";
  return s.startsWith("/") ? s : `/${s}`;
}
```

For a function named `developer-apps`:
```ts
const s = url.pathname.replace(/^\/developer-apps/, "") || "/";
```

**Why:** Discovered during AfuMail OAuth migration — all routes returned 404 until the prefix was corrected. The Supabase runtime rewrites the URL before handing it to Deno.serve().
