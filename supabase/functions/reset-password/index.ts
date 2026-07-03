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

    // 1. Look up the requesting user's profile
    const profileRes = await fetch(
      `${projectUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(slug)}&select=id,email,recovery_email,full_name&limit=1`,
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

    const profiles = await profileRes.json() as Array<{
      id: string;
      email: string;
      recovery_email: string | null;
      full_name: string | null;
    }>;

    const profile = profiles[0];

    if (!profile) {
      return new Response(JSON.stringify({ error: "No account found with that username." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.recovery_email) {
      return new Response(JSON.stringify({ error: "No recovery email is set for this account. Please sign in and add one under Settings → Account." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Validate that recovery_email belongs to a real AfuMail user
    const recoveryRes = await fetch(
      `${projectUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(profile.recovery_email)}&select=id,username,full_name&limit=1`,
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

    const recoveryProfiles = await recoveryRes.json() as Array<{
      id: string;
      username: string;
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
        email: profile.email,
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

    const body = `Hi ${recoveryUser.full_name ?? recoveryUser.username},\n\n${displayName} (${slug}@afuchat.com) has requested a password reset on AfuMail.\n\nClick the link below to reset their password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you didn't expect this request, you can ignore it.`;

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
    const insertRes = await fetch(`${projectUrl}/rest/v1/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        owner_id: recoveryUser.id,
        from_name: "AfuMail",
        from_email: "noreply@afuchat.com",
        to_emails: [{ name: recoveryUser.full_name ?? recoveryUser.username, email: profile.recovery_email }],
        cc_emails: [],
        subject: `Password reset for ${slug}@afuchat.com`,
        body: htmlBody,
        preview,
        timestamp: now,
        read: false,
        starred: false,
        pinned: false,
        attachments: [],
        category: "primary",
        folder: "inbox",
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
