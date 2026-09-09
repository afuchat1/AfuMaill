const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username, redirectTo } = await req.json();

    if (!username) {
      return new Response(JSON.stringify({ error: "Username is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectUrl = Deno.env.get("PROJECT_URL") ?? "https://lqowocmjmhbkoxlwyxku.supabase.co";
    const serviceRoleKey = Deno.env.get("SVC_ROLE_KEY") ?? "";

    const slug = (username as string)
      .toLowerCase()
      .trim()
      .replace(/^@/, "")
      .replace(/@afuchat\.com$/, "");

    // 1. Look up the requesting user's primary mailbox address.
    const profileRes = await fetch(
      `${projectUrl}/rest/v1/email_addresses?local_part=eq.${encodeURIComponent(slug)}&domain=eq.afuchat.com&is_primary=eq.true&select=id,user_id,full_email&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    );

    if (!profileRes.ok) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const addresses = await profileRes.json() as Array<{
      id: string;
      user_id: string;
      full_email: string;
    }>;

    const address = addresses[0];

    if (!address) {
      return new Response(JSON.stringify({ error: "No account found with that username." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileLookup = await fetch(
      `${projectUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(address.user_id)}&select=id,full_name,recovery_email_address_id&limit=1`,
      { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } },
    );
    const profiles = await profileLookup.json() as Array<{
      id: string;
      full_name: string | null;
      recovery_email_address_id: string | null;
    }>;
    const profile = profiles[0];
    if (!profile?.recovery_email_address_id) {
      return new Response(JSON.stringify({ error: "No recovery email is set for this account. Please sign in and add one under Settings → Account." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Validate that the recovery address belongs to a different AfuMail user.
    const recoveryRes = await fetch(
      `${projectUrl}/rest/v1/email_addresses?id=eq.${encodeURIComponent(profile.recovery_email_address_id)}&select=id,user_id,full_email&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    );

    if (!recoveryRes.ok) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recoveryAddresses = await recoveryRes.json() as Array<{
      id: string;
      user_id: string;
      full_email: string;
    }>;

    const recoveryAddress = recoveryAddresses[0];
    if (!recoveryAddress || recoveryAddress.user_id === address.user_id) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recoveryProfileRes = await fetch(
      `${projectUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(recoveryAddress.user_id)}&select=id,full_name&limit=1`,
      { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } },
    );
    const recoveryProfiles = await recoveryProfileRes.json() as Array<{
      id: string;
      full_name: string | null;
    }>;
    const recoveryUser = recoveryProfiles[0];
    if (!recoveryUser) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Generate the Supabase password-reset action link for the requesting user
    const generateRes = await fetch(`${projectUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "recovery",
        email: address.full_email,
        options: {
          redirect_to: redirectTo ?? projectUrl,
        },
      }),
    });

    const generateData = await generateRes.json() as {
      action_link?: string;
      error_code?: string;
      message?: string;
    };

    if (!generateRes.ok || !generateData.action_link) {
      console.error("generate_link error:", generateData);
      return new Response(JSON.stringify({ error: "Failed to generate reset link." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resetLink = generateData.action_link;
    const displayName = profile.full_name ?? slug;
    const now = new Date().toISOString();

    const body = `Hi ${recoveryUser.full_name ?? recoveryAddress.full_email},\n\n${displayName} (${address.full_email}) has requested a password reset on AfuMail.\n\nClick the link below to reset their password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you didn't expect this request, you can ignore it.`;

    const preview = `Password reset request for ${slug}@afuchat.com — click to reset.`;

    const htmlBody = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Password Reset Request</h2>
  <p style="color:#555;line-height:1.6;margin:0 0 24px;">
    Hi ${recoveryUser.full_name ?? recoveryUser.username},<br><br>
    <strong>${displayName}</strong> (<a href="mailto:${slug}@afuchat.com" style="color:#1B6EF3;">${slug}@afuchat.com</a>)
    has requested a password reset on AfuMail. Click the button below to help them reset their password.
  </p>
  <a href="${resetLink}"
     style="display:inline-block;background:#1B6EF3;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;">
    Reset Password
  </a>
  <p style="color:#999;font-size:13px;margin-top:28px;line-height:1.4;">
    This link expires in 1 hour. If you didn't expect this, simply ignore this message.
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="color:#aaa;font-size:12px;margin:0 0 2px;">AfuMail &mdash; <a href="https://mail.afuchat.com" style="color:#1B6EF3;text-decoration:none;">mail.afuchat.com</a></p>
  <p style="color:#ccc;font-size:11px;margin:0;">AfuChat Technologies Limited &bull; Entebbe, Kittoro, Uganda</p>
</div>`;

    // 4. Deliver the reset email directly into the recovery user's AfuMail inbox
    const folderRes = await fetch(
      `${projectUrl}/rest/v1/folders?user_id=eq.${encodeURIComponent(recoveryUser.id)}&type=eq.inbox&select=id&limit=1`,
      { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } },
    );
    const folders = await folderRes.json() as Array<{ id: string }>;
    const folder = folders[0];
    if (!folder) {
      return new Response(JSON.stringify({ error: "Failed to locate the recovery inbox." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          user_id: recoveryUser.id,
          email_address_id: recoveryAddress.id,
          folder_id: folder.id,
          from_address: "AfuMail <noreply@afuchat.com>",
          to_addresses: [recoveryAddress.full_email],
          cc_addresses: [],
          bcc_addresses: [],
        subject: `Password reset for ${slug}@afuchat.com`,
          body_text: body,
          body_html: htmlBody,
        preview,
          received_at: now,
          is_read: false,
          is_starred: false,
          is_important: false,
          is_draft: false,
        attachments: [],
        category: "primary",
      }),
    });

    if (!insertRes.ok && insertRes.status !== 201) {
      const err = await insertRes.text();
      console.error("inbox insert error:", err);
      return new Response(JSON.stringify({ error: "Failed to deliver reset email." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
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
