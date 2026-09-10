const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

type ParsedAddress = { name: string; email: string };

// Parse an RFC address, keeping the sender-provided display name exactly when
// one exists. A missing name is intentionally left empty so the client can
// apply its own safe provider/profile fallback.
function parseAddress(rawValue: unknown): ParsedAddress {
  if (rawValue && typeof rawValue === "object") {
    const value = rawValue as Record<string, unknown>;
    const email = String(value.email ?? value.address ?? value.Email ?? value.Address ?? "").trim().toLowerCase();
    const name = String(value.name ?? value.display_name ?? value.displayName ?? value.Name ?? "").trim();
    if (email) return { name, email };
  }

  const raw = String(rawValue ?? "").trim();
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: (match[1] ?? "").trim().replace(/^["']|["']$/g, ""),
      email: (match[2] ?? "").trim().toLowerCase(),
    };
  }
  const email = raw.toLowerCase();
  return { name: "", email };
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

// Addresses can arrive as either RFC strings or provider-normalized objects.
// Keep the object until parseAddress can read its display-name fields.
function pickValue(obj: any, ...keys: string[]): unknown {
  for (const k of keys) {
    const value = obj?.[k];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") return value;
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
          const o = v as Record<string, unknown>;
          const email = String(o.email ?? o.address ?? o.Email ?? o.Address ?? "").trim();
          const name = String(o.name ?? o.display_name ?? o.displayName ?? o.Name ?? "").trim();
          return email ? (name ? `${name} <${email}>` : email) : "";
        }
        return "";
      })
      .filter(Boolean);
  }
  return [];
}

function headerValue(headers: unknown, ...names: string[]): string {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  if (Array.isArray(headers)) {
    for (const item of headers) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const name = String(record.name ?? record.Name ?? "").toLowerCase();
      if (wanted.has(name)) {
        const value = record.value ?? record.Value;
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
  } else if (headers && typeof headers === "object") {
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      if (wanted.has(key.toLowerCase()) && typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }
  return "";
}

function normaliseMessageId(value: string): string {
  return value.trim().replace(/^<|>$/g, "").toLowerCase();
}

function subjectKey(subject: string): string {
  return subject
    .replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function addressEmail(value: string): string {
  return parseAddress(value).email;
}

function participantEmails(from: ParsedAddress, to: string[], cc: string[]): string[] {
  return [from.email, ...to, ...cc]
    .map(addressEmail)
    .filter(Boolean)
    .sort();
}

async function findThreadId(
  projectUrl: string,
  serviceRoleKey: string,
  userId: string,
  messageReferences: string[],
  subject: string,
  from: ParsedAddress,
  to: string[],
  cc: string[],
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  };

  for (const reference of messageReferences.map(normaliseMessageId).filter(Boolean)) {
    const response = await fetch(
      `${projectUrl}/rest/v1/emails?user_id=eq.${encodeURIComponent(userId)}&message_id=eq.${encodeURIComponent(reference)}&select=thread_id&limit=1`,
      { headers },
    );
    if (!response.ok) continue;
    const rows = await response.json() as Array<{ thread_id?: string | null }>;
    if (rows[0]?.thread_id) return rows[0].thread_id;
  }

  // Some providers remove Message-ID headers while preserving the subject.
  // Match a recent message only when the normalized subject and participant
  // set overlap, avoiding unrelated mail with the same raw subject.
  const recentResponse = await fetch(
    `${projectUrl}/rest/v1/emails?user_id=eq.${encodeURIComponent(userId)}&select=thread_id,subject,from_address,to_addresses,cc_addresses&order=created_at.desc&limit=100`,
    { headers },
  );
  if (recentResponse.ok) {
    const recentRows = await recentResponse.json() as Array<{
      thread_id?: string | null;
      subject?: string | null;
      from_address?: string | null;
      to_addresses?: string[] | null;
      cc_addresses?: string[] | null;
    }>;
    const incomingParticipants = new Set(participantEmails(from, to, cc));
    const match = recentRows.find((row) => {
      if (!row.thread_id || subjectKey(row.subject ?? "") !== subjectKey(subject)) return false;
      const existingParticipants = participantEmails(
        parseAddress(row.from_address ?? ""),
        row.to_addresses ?? [],
        row.cc_addresses ?? [],
      );
      return existingParticipants.some((participant) => incomingParticipants.has(participant));
    });
    if (match?.thread_id) return match.thread_id;
  }

  return crypto.randomUUID();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const projectUrl = "https://lqowocmjmhbkoxlwyxku.supabase.co";
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SVC_ROLE_KEY") ?? "";

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
    let email: any = (payload?.type && payload?.data) ? payload.data : payload;

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
    let rawFrom: unknown = pickValue(email,
      // standard lowercase
      "from", "sender", "from_email",
      // Postmark / Postal style
      "From", "Sender", "ReplyTo",
    ) || headerValue(email?.headers, "from", "x-original-from");

    let rawSubject = pick(email,
      "subject", "Subject",
    );

    let toList = normaliseAddressList(
      email?.to ?? email?.To ?? email?.to_email ?? email?.recipients ?? email?.Recipients
    );
    let ccList = normaliseAddressList(
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
        // Inbound (received) emails live under a dedicated /emails/receiving/
        // path — the plain /emails/{id} endpoint is for outbound sent mail
        // and 404s/400s for inbound ids.
        const fetchRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          headers: { Authorization: `Bearer ${resendApiKey}` },
        });
        if (fetchRes.ok) {
          const fetched = await fetchRes.json();
          email = {
            ...email,
            ...(fetched?.data && typeof fetched.data === "object" ? fetched.data : fetched),
          };
          console.log("[receive-email] fetched email by id, keys:", Object.keys(fetched ?? {}).join(", "));
          finalTextBody = pick(email, "text", "text_body", "textBody");
          finalHtmlBody = pick(email, "html", "html_body", "htmlBody");
          rawFrom = pickValue(email, "from", "sender", "from_email", "From", "Sender", "ReplyTo")
            || headerValue(email?.headers, "from", "x-original-from");
          rawSubject = pick(email, "subject", "Subject");
          toList = normaliseAddressList(
            email?.to ?? email?.To ?? email?.to_email ?? email?.recipients ?? email?.Recipients,
          );
          ccList = normaliseAddressList(email?.cc ?? email?.Cc ?? email?.CC ?? email?.cc_email);
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
    const preview = previewSource.slice(0, 140).replace(/\n/g, " ");
    const category = guessCategory(fromAddr.email, rawSubject);
    const messageId = pick(email, "message_id", "messageId", "Message-ID", "Message-Id")
      || headerValue(email?.headers, "message-id", "message-id");
    const inReplyTo = pick(email, "in_reply_to", "inReplyTo", "In-Reply-To", "In-Reply-To")
      || headerValue(email?.headers, "in-reply-to");
    const referencesHeader = pick(email, "references", "References", "references_header")
      || headerValue(email?.headers, "references");

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
        `${projectUrl}/rest/v1/email_addresses?full_email=eq.${encodeURIComponent(recipient.email)}&select=id,user_id&limit=1`,
        { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } }
      );

      if (!profileRes.ok) {
        console.warn("[receive-email] profile lookup failed:", await profileRes.text());
        continue;
      }

      const addresses = await profileRes.json() as Array<{ id: string; user_id: string }>;
      const address = addresses[0];
      if (!address) {
        console.warn("[receive-email] no profile for:", recipient.email);
        continue;
      }

      const folderRes = await fetch(
        `${projectUrl}/rest/v1/folders?user_id=eq.${encodeURIComponent(address.user_id)}&type=eq.inbox&select=id&limit=1`,
        { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } },
      );
      const folders = await folderRes.json() as Array<{ id: string }>;
      const folder = folders[0];
      if (!folder) {
        console.warn("[receive-email] no inbox folder for:", recipient.email);
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
          user_id: address.user_id,
          email_address_id: address.id,
          folder_id: folder.id,
           from_address: fromAddr.name ? `${fromAddr.name} <${fromAddr.email}>` : fromAddr.email,
          to_addresses: toAddresses.map((a) => a.email),
          cc_addresses: ccAddresses.map((a) => a.email),
          bcc_addresses: [],
          subject: rawSubject || "(No Subject)",
          body_text: finalTextBody || htmlToText(finalHtmlBody),
          body_html: finalHtmlBody || null,
          preview,
          received_at: new Date().toISOString(),
          is_read: false,
          is_starred: false,
          is_important: false,
          is_draft: false,
          attachments: attachments.map((a) => ({
            id: crypto.randomUUID(),
            name: a.filename ?? a.name ?? a.Name ?? "attachment",
            size: a.size ?? a.Size ?? 0,
            type: a.content_type ?? a.type ?? a.ContentType ?? "application/octet-stream",
          })),
          category,
           thread_id: await findThreadId(
             projectUrl,
             serviceRoleKey,
             address.user_id,
             [
               inReplyTo,
               ...referencesHeader.match(/<[^>]+>|[^\s]+/g) ?? [],
             ],
             rawSubject || "(No Subject)",
             fromAddr,
             toList,
             ccList,
           ),
           message_id: messageId ? normaliseMessageId(messageId) : null,
           in_reply_to: inReplyTo ? normaliseMessageId(inReplyTo) : null,
           references_header: referencesHeader || null,
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
