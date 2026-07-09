const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

// Parse "Name <email@example.com>" or plain "email@example.com" → { name, email }
function parseAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: (match[1] ?? "").trim().replace(/^["']|["']$/g, ""),
      email: (match[2] ?? "").trim().toLowerCase(),
    };
  }
  const email = raw.trim().toLowerCase();
  return { name: email.split("@")[0] ?? email, email };
}

// Strip HTML tags and decode common entities
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|tr|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Category heuristic
function guessCategory(from: string, subject: string): string {
  const text = (from + " " + subject).toLowerCase();
  if (/bank|invoice|payment|receipt|transaction|order|refund|billing|stripe|paypal/.test(text)) return "finance";
  if (/shop|amazon|ebay|etsy|shipping|delivery|track|fedex|ups|usps/.test(text)) return "shopping";
  if (/flight|hotel|booking|airbnb|travel|trip|itinerary|reservation/.test(text)) return "travel";
  if (/github|jira|linear|slack|notion|zoom|meet|calendar|work|office/.test(text)) return "work";
  if (/linkedin|twitter|instagram|facebook|social|follow|friend/.test(text)) return "social";
  if (/newsletter|unsubscribe|update|digest|weekly|notification/.test(text)) return "updates";
  return "primary";
}

// Try a list of key names and return the first non-empty string value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(obj: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

// Normalise to/cc into an array of raw address strings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseAddressList(val: any): string[] {
  if (!val) return [];
  if (typeof val === "string") return val.split(",").map((s: string) => s.trim()).filter(Boolean);
  if (Array.isArray(val)) {
    return val
      .map((v: unknown) => {
        if (typeof v === "string") return v.trim();
        if (v && typeof v === "object") {
          const o = v as Record<string, string>;
          return o.email ?? o.address ?? o.Email ?? o.Address ?? "";
        }
        return "";
      })
      .filter(Boolean);
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const projectUrl = "https://lqowocmjmhbkoxlwyxku.supabase.co";
    const serviceRoleKey = Deno.env.get("SVC_ROLE_KEY") ?? "";

    const rawText = await req.text();
    console.log(`[receive-email] raw payload received (${rawText.length} bytes)`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any;
    try {
      payload = JSON.parse(rawText);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Normalise envelope ────────────────────────────────────────────────────
    // Resend may send: { type, created_at, data: { … } }  OR  a flat object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const email: any = (payload?.type && payload?.data) ? payload.data : payload;

    const allKeys = Object.keys(email ?? {});
    console.log("[receive-email] email-level keys:", allKeys.join(", "));

    // Log field types/lengths only — never the content itself (email bodies
    // and addresses are user PII and must not end up in function logs).
    for (const k of allKeys) {
      const v = email[k];
      const len = typeof v === "string" ? v.length : JSON.stringify(v)?.length ?? 0;
      console.log(`  [field] ${k} (${typeof v}, length=${len})`);
    }

    // ── Extract fields — try every known variant ──────────────────────────────
    const rawFrom = pick(email,
      // standard lowercase
      "from", "sender", "from_email",
      // Postmark / Postal style
      "From", "Sender", "ReplyTo",
    );

    const rawSubject = pick(email,
      "subject", "Subject",
    );

    const toList = normaliseAddressList(
      email?.to ?? email?.To ?? email?.to_email ?? email?.recipients ?? email?.Recipients
    );
    const ccList = normaliseAddressList(
      email?.cc ?? email?.Cc ?? email?.CC ?? email?.cc_email
    );

    // Body: try every reasonable variant
    const textBody = pick(email,
      // Resend / SendGrid style
      "text", "text_body", "textBody", "plain_text", "plainText", "body_plain", "bodyPlain",
      // Postmark style
      "TextBody", "Text",
      // Generic
      "body", "Body", "content", "Content", "message", "Message",
    );

    const htmlBody = pick(email,
      // Resend / SendGrid style
      "html", "html_body", "htmlBody", "body_html", "bodyHtml",
      // Postmark style
      "HtmlBody", "Html", "HTML",
      // Generic
      "htmlContent", "HtmlContent",
    );

    console.log(`[receive-email] from="${rawFrom}" subject="${rawSubject}"`);
    console.log(`[receive-email] toList: ${toList.join("; ")}`);
    console.log(`[receive-email] textBody.length=${textBody.length} htmlBody.length=${htmlBody.length}`);

    let finalTextBody = textBody;
    let finalHtmlBody = htmlBody;

    // ── Resend inbound webhooks only send metadata (from/to/subject/email_id) —
    //   the actual message content must be fetched separately by email_id. ──
    const emailId = pick(email, "email_id", "id", "Id");
    if (!finalTextBody && !finalHtmlBody && emailId) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
      try {
        const fetchRes = await fetch(`https://api.resend.com/emails/${emailId}`, {
          headers: { Authorization: `Bearer ${resendApiKey}` },
        });
        if (fetchRes.ok) {
          const fetched = await fetchRes.json();
          console.log("[receive-email] fetched email by id, keys:", Object.keys(fetched ?? {}).join(", "));
          finalTextBody = pick(fetched, "text", "text_body", "textBody");
          finalHtmlBody = pick(fetched, "html", "html_body", "htmlBody");
        } else {
          console.warn("[receive-email] fetch by email_id failed:", fetchRes.status, await fetchRes.text());
        }
      } catch (err) {
        console.warn("[receive-email] fetch by email_id threw:", String(err));
      }
    }

    // Prefer real HTML (rendered in a WebView by the client) over plain text,
    // since marketing/transactional emails are frequently image- and layout-heavy
    // and lose almost all meaningful content when flattened to text.
    let body = finalHtmlBody || finalTextBody;

    // ── Debug fallback: if body is STILL empty, build a readable summary of all
    //   fields so the user can see what Resend actually sent (temporary diagnostic). ──
    if (!body) {
      const lines: string[] = ["[Debug: body could not be extracted. Resend payload fields:]"];
      for (const k of allKeys) {
        const v = email[k];
        const valueStr = typeof v === "string" ? v.slice(0, 300) : JSON.stringify(v)?.slice(0, 300);
        lines.push(`${k}: ${valueStr}`);
      }
      body = lines.join("\n");
      console.log("[receive-email] body empty — storing debug info instead");
    }

    if (!rawFrom || toList.length === 0) {
      return new Response(JSON.stringify({ error: "Missing from or to." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromAddr = parseAddress(rawFrom);
    const toAddresses = toList.map(parseAddress);
    const ccAddresses = ccList.map(parseAddress);
    const previewSource = finalTextBody || (finalHtmlBody ? htmlToText(finalHtmlBody) : "");
    const preview = body.startsWith("[Debug:") ? "" : previewSource.slice(0, 140).replace(/\n/g, " ");
    const category = guessCategory(fromAddr.email, rawSubject);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attachments: any[] = email?.attachments ?? email?.Attachments ?? [];

    // ── Find @afuchat.com recipients and deliver ──────────────────────────────
    const afuchatRecipients = [...toAddresses, ...ccAddresses].filter(
      (a) => a.email.endsWith("@afuchat.com")
    );

    console.log("[receive-email] afuchat recipients:", afuchatRecipients.map(a => a.email).join(", ") || "none");

    let delivered = 0;

    for (const recipient of afuchatRecipients) {
      const profileRes = await fetch(
        `${projectUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(recipient.email)}&select=id`,
        { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } }
      );

      if (!profileRes.ok) {
        console.warn("[receive-email] profile lookup failed:", await profileRes.text());
        continue;
      }

      const profiles = await profileRes.json() as Array<{ id: string }>;
      const profile = profiles[0];
      if (!profile) {
        console.warn("[receive-email] no profile for:", recipient.email);
        continue;
      }

      const insertRes = await fetch(`${projectUrl}/rest/v1/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          owner_id: profile.id,
          from_name: fromAddr.name,
          from_email: fromAddr.email,
          to_emails: toAddresses,
          cc_emails: ccAddresses,
          subject: rawSubject || "(No Subject)",
          body,
          preview,
          timestamp: new Date().toISOString(),
          read: false,
          starred: false,
          pinned: false,
          attachments: attachments.map((a) => ({
            id: crypto.randomUUID(),
            name: a.filename ?? a.name ?? a.Name ?? "attachment",
            size: a.size ?? a.Size ?? 0,
            type: a.content_type ?? a.type ?? a.ContentType ?? "application/octet-stream",
          })),
          category,
          folder: "inbox",
        }),
      });

      if (insertRes.ok || insertRes.status === 201) {
        delivered++;
        console.log("[receive-email] delivered to:", recipient.email);
      } else {
        console.error("[receive-email] insert error:", await insertRes.text());
      }
    }

    return new Response(JSON.stringify({ ok: true, delivered }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[receive-email] unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
