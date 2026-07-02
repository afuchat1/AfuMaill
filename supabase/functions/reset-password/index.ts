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
    const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";

    const slug = (username as string).toLowerCase().trim().replace(/^@/, "").replace(/@afuchat\.com$/, "");

    // 1. Look up profile by username via PostgREST
    const profileRes = await fetch(
      `${projectUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(slug)}&select=email,notification_email,full_name`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!profileRes.ok) {
      // Return generic ok to avoid enumeration
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profiles = await profileRes.json() as Array<{
      email: string;
      notification_email: string | null;
      full_name: string | null;
    }>;

    const profile = profiles[0];
    if (!profile || !profile.notification_email) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Generate password reset link via Supabase Auth Admin API
    const generateRes = await fetch(
      `${projectUrl}/auth/v1/admin/generate_link`,
      {
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
      }
    );

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

    // 3. Send via Resend to the user's real notification email
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AfuMail <noreply@afuchat.com>",
        to: [profile.notification_email],
        subject: "Reset your AfuMail password",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
            <div style="text-align:center;margin-bottom:24px;">
              <h1 style="font-size:24px;font-weight:700;margin:0;color:#1a1a1a;">AfuMail</h1>
            </div>
            <h2 style="font-size:20px;font-weight:600;color:#1a1a1a;margin-bottom:8px;">Reset your password</h2>
            <p style="color:#555;margin-bottom:24px;line-height:1.5;">
              Hi ${displayName},<br><br>
              We received a request to reset the password for your AfuMail account
              <strong>${slug}@afuchat.com</strong>. Click the button below to set a new password.
            </p>
            <a href="${resetLink}" style="display:inline-block;background:#1B6EF3;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">
              Reset Password
            </a>
            <p style="color:#999;font-size:13px;margin-top:32px;line-height:1.4;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
            <p style="color:#ccc;font-size:12px;text-align:center;margin:0;">AfuMail &mdash; afuchat.com</p>
          </div>
        `,
      }),
    });

    if (!sendRes.ok) {
      const sendErr = await sendRes.json();
      console.error("Resend error:", sendErr);
      return new Response(JSON.stringify({ error: "Failed to send reset email." }), {
        status: 502,
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
