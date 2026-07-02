const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

// Parse "Name <email@example.com>" or "email@example.com" into { name, email }
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

// Normalize HTML body to plain text (strip tags, decode entities)
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "")
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

// Simple category guess based on from-address / subject keywords
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const projectUrl = "https://lqowocmjmhbkoxlwyxku.supabase.co";
    const serviceRoleKey = Deno.env.get("SVC_ROLE_KEY") ?? "";

    const payload = await req.json() as {
      type?: string;
      created_at?: string;
      data?: {
        from?: string;
        to?: string | string[];
        cc?: string | string[];
        subject?: string;
        html?: string;
        text?: string;
        attachments?: Array<{ filename?: string; size?: number; content_type?: string }>;
      };
    };

    // Accept either direct payload or wrapped { type, data }
    const isWrapped = payload.type === "email.received" && payload.data;
    const emailData = isWrapped ? payload.data! : (payload as typeof payload.data)!;

    const rawFrom = emailData?.from ?? "";
    const rawTo = emailData?.to;
    const rawCc = emailData?.cc;
    const subject = emailData?.subject ?? "(No Subject)";
    const htmlBody = emailData?.html ?? "";
    const textBody = emailData?.text ?? "";
    const attachments = emailData?.attachments ?? [];

    if (!rawFrom || !rawTo) {
      return new Response(JSON.stringify({ error: "Missing from or to." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromAddr = parseAddress(rawFrom);

    // Normalise to/cc into string arrays
    const toList: string[] = Array.isArray(rawTo) ? rawTo : [rawTo];
    const ccList: string[] = rawCc
      ? (Array.isArray(rawCc) ? rawCc : [rawCc])
      : [];

    const toAddresses = toList.map(parseAddress);
    const ccAddresses = ccList.map(parseAddress);

    // Prefer text body; fall back to HTML-stripped
    const body = textBody || htmlToText(htmlBody);
    const preview = body.slice(0, 140).replace(/\n/g, " ");

    const category = guessCategory(fromAddr.email, subject);

    // Find all @afuchat.com recipients and deliver to their inboxes
    const afuchatRecipients = toAddresses
      .concat(ccAddresses)
      .filter((a) => a.email.endsWith("@afuchat.com"));

    if (afuchatRecipients.length === 0) {
      return new Response(JSON.stringify({ ok: true, delivered: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let delivered = 0;

    for (const recipient of afuchatRecipients) {
      // Look up owner by their afuchat.com email in profiles
      const profileRes = await fetch(
        `${projectUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(recipient.email)}&select=id`,
        {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
        }
      );

      if (!profileRes.ok) continue;

      const profiles = await profileRes.json() as Array<{ id: string }>;
      const profile = profiles[0];
      if (!profile) continue;

      // Insert the email into that user's inbox
      const insertRes = await fetch(
        `${projectUrl}/rest/v1/emails`,
        {
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
            subject,
            body,
            preview,
            timestamp: new Date().toISOString(),
            read: false,
            starred: false,
            pinned: false,
            attachments: attachments.map((a) => ({
              id: crypto.randomUUID(),
              name: a.filename ?? "attachment",
              size: a.size ?? 0,
              type: a.content_type ?? "application/octet-stream",
            })),
            category,
            folder: "inbox",
          }),
        }
      );

      if (insertRes.ok || insertRes.status === 201) {
        delivered++;
      } else {
        const err = await insertRes.text();
        console.error("insert error for", recipient.email, err);
      }
    }

    return new Response(JSON.stringify({ ok: true, delivered }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("receive-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
