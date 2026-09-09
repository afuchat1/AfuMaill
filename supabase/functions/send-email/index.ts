const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROJECT_URL = "https://lqowocmjmhbkoxlwyxku.supabase.co";

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
    const { to, cc, subject, body, fromEmail, fromName } = await req.json();

    if (!to || to.length === 0) {
      return new Response(JSON.stringify({ error: "At least one recipient is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SVC_ROLE_KEY") ?? "";

    // Split recipients: internal @afuchat.com vs external
    const allRecipients: string[] = [...(to ?? []), ...(cc ?? [])];
    const internalTo: string[] = (to ?? []).filter((e: string) => e.endsWith("@afuchat.com"));
    const externalTo: string[] = (to ?? []).filter((e: string) => !e.endsWith("@afuchat.com"));
    const internalCc: string[] = (cc ?? []).filter((e: string) => e.endsWith("@afuchat.com"));
    const externalCc: string[] = (cc ?? []).filter((e: string) => !e.endsWith("@afuchat.com"));
    const hasExternal = externalTo.length > 0;

    const now = new Date().toISOString();
    const preview = (body ?? "").slice(0, 140).replace(/\n/g, " ");
    const category = guessCategory(fromEmail ?? "", subject ?? "");

    const toAddresses = (to ?? []).map((e: string) => ({
      name: e.split("@")[0] ?? e,
      email: e,
    }));
    const ccAddresses = (cc ?? []).map((e: string) => ({
      name: e.split("@")[0] ?? e,
      email: e,
    }));

    // Look up a normalized AfuMail address and its owner.
    async function getAddress(email: string): Promise<{ userId: string; addressId: string } | null> {
      const r = await fetch(
        `${PROJECT_URL}/rest/v1/email_addresses?full_email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,user_id&limit=1`,
        { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } }
      );
      if (!r.ok) return null;
      const rows = await r.json() as Array<{ id: string; user_id: string }>;
      return rows[0] ? { userId: rows[0].user_id, addressId: rows[0].id } : null;
    }

    async function getFolderId(userId: string, type: string): Promise<string | null> {
      const r = await fetch(
        `${PROJECT_URL}/rest/v1/folders?user_id=eq.${encodeURIComponent(userId)}&type=eq.${encodeURIComponent(type)}&select=id&limit=1`,
        { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } }
      );
      if (!r.ok) return null;
      const rows = await r.json() as Array<{ id: string }>;
      return rows[0]?.id ?? null;
    }

    // Helper: insert a normalized email row.
    async function insertEmail(
      recipient: { userId: string; addressId: string },
      folderType: string,
      read: boolean,
    ) {
      const folderId = await getFolderId(recipient.userId, folderType);
      if (!folderId) throw new Error(`Missing ${folderType} folder for recipient.`);
      await fetch(`${PROJECT_URL}/rest/v1/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          user_id: recipient.userId,
          email_address_id: recipient.addressId,
          folder_id: folderId,
          from_address: `${fromName ?? fromEmail} <${fromEmail}>`,
          to_addresses: to ?? [],
          cc_addresses: cc ?? [],
          bcc_addresses: [],
          subject: subject || "(No Subject)",
          body_text: body ?? "",
          preview,
          sent_at: folderType === "sent" ? now : null,
          received_at: folderType === "inbox" ? now : null,
          is_read: read,
          is_starred: false,
          is_important: false,
          is_draft: false,
          attachments: [],
          category,
        }),
      });
    }

    // 1a. Store "sent" copy for the sender
    if (fromEmail?.endsWith("@afuchat.com")) {
      const sender = await getAddress(fromEmail);
      if (sender) await insertEmail(sender, "sent", true);
    }

    // 1b. Deliver to internal @afuchat.com recipients directly (no Resend routing)
    const internalAll = [
      ...(to ?? []).filter((e: string) => e.endsWith("@afuchat.com")),
      ...(cc ?? []).filter((e: string) => e.endsWith("@afuchat.com")),
    ];
    for (const recipientEmail of internalAll) {
      const recipient = await getAddress(recipientEmail);
      if (!recipient) continue;
      await insertEmail(recipient, "inbox", false);
    }

    // 2. Send to external recipients via Resend (skip if none)
    if (!hasExternal) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to: externalTo,
      subject: subject || "(No Subject)",
      text: body,
    };
    if (externalCc.length > 0) payload.cc = externalCc;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: (data as { message?: string }).message ?? "Failed to send email." }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
