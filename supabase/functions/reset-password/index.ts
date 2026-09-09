const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROJECT_URL = "https://lqowocmjmhbkoxlwyxku.supabase.co";
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

type ProfileRow = {
  id: string;
  full_name: string | null;
  recovery_email_address_id: string | null;
};

type AddressRow = {
  id: string;
  user_id: string;
  full_email: string | null;
};

type ResetCodeRow = {
  id: string;
  user_id: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serviceRoleKey(): string {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SVC_ROLE_KEY") ?? "";
}

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = serviceRoleKey();
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    ...extra,
  };
}

async function restJson(path: string, init: RequestInit = {}): Promise<{ response: Response; data: unknown }> {
  const response = await fetch(`${PROJECT_URL}${path}`, {
    ...init,
    headers: serviceHeaders({
      ...(init.headers as Record<string, string> | undefined),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    }),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

function normalizeRecoveryEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidRecoveryEmail(email: string): boolean {
  return /^[^\s@]+@afuchat\.com$/.test(email);
}

function createCode(): string {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String(100000 + (random[0] % 900000));
}

async function hashCode(userId: string, email: string, code: string): Promise<string> {
  const pepper = Deno.env.get("RESET_CODE_PEPPER") ?? "";
  const input = new TextEncoder().encode(`${pepper}:${userId}:${email}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function findAccountByProfileEmail(profileEmail: string): Promise<{
  profile: ProfileRow;
  authEmail: string;
  recoveryEmail: string | null;
} | null> {
  const profileAddressResult = await restJson(
    `/rest/v1/email_addresses?full_email=eq.${encodeURIComponent(profileEmail)}&domain=eq.afuchat.com&is_primary=eq.true&select=id,user_id,full_email&limit=1`,
  );
  if (!profileAddressResult.response.ok) throw new Error("Could not look up the AfuChat profile.");

  const profileAddress = (profileAddressResult.data as AddressRow[])[0];
  if (!profileAddress?.id || !profileAddress.user_id || !profileAddress.full_email) return null;

  const profileResult = await restJson(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(profileAddress.user_id)}&select=id,full_name,recovery_email_address_id&limit=1`,
  );
  if (!profileResult.response.ok) throw new Error("Could not look up the AfuMail profile.");

  const profile = (profileResult.data as ProfileRow[])[0];
  if (!profile?.id) return null;

  if (!profile.recovery_email_address_id) {
    return { profile, authEmail: profileAddress.full_email, recoveryEmail: null };
  }

  const recoveryAddressResult = await restJson(
    `/rest/v1/email_addresses?id=eq.${encodeURIComponent(profile.recovery_email_address_id)}&user_id=eq.${encodeURIComponent(profile.id)}&domain=eq.afuchat.com&select=full_email&limit=1`,
  );
  if (!recoveryAddressResult.response.ok) throw new Error("Could not look up the linked AfuChat recovery inbox.");

  const recoveryAddress = (recoveryAddressResult.data as AddressRow[])[0];
  const recoveryEmail = recoveryAddress?.full_email?.toLowerCase() ?? null;
  if (!recoveryEmail || !isValidRecoveryEmail(recoveryEmail)) {
    return { profile, authEmail: profileAddress.full_email, recoveryEmail: null };
  }

  return { profile, authEmail: profileAddress.full_email, recoveryEmail };
}

async function sendRecoveryCodeEmail(
  recoveryEmail: string,
  displayName: string,
  code: string,
): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) throw new Error("RESEND_API_KEY is not configured.");

  const safeName = escapeHtml(displayName);
  const text = [
    `Hi ${displayName},`,
    "",
    "Use this AfuMail verification code to reset your password:",
    "",
    code,
    "",
    "This code expires in 10 minutes and can only be used once.",
    "If you did not request this, you can safely ignore this email.",
    "",
    "AfuMail. Secure email for AfuChat.",
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#f7f5f2;color:#1a1a1a;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:36px 20px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#1b6ef3;color:#fff;font-size:20px;font-weight:800;letter-spacing:-.5px;padding:12px 18px;border-radius:14px;">AfuMail</div>
      </div>
      <div style="background:#fff;border:1px solid #e5e1dc;border-radius:18px;padding:32px 28px;box-shadow:0 8px 30px rgba(26,26,26,.06);">
        <p style="margin:0 0 8px;color:#6e6a66;font-size:14px;">Password reset</p>
        <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2;color:#1a1a1a;">Your AfuMail verification code</h1>
        <p style="margin:0 0 22px;color:#55504b;font-size:15px;line-height:1.6;">Hi ${safeName}, use the code below in the AfuMail app to choose a new password.</p>
        <div style="background:#eef4ff;border:1px solid #cfe0ff;border-radius:14px;padding:20px;text-align:center;margin:0 0 22px;">
          <div style="color:#1b6ef3;font-size:34px;font-weight:800;letter-spacing:8px;">${code}</div>
        </div>
        <p style="margin:0;color:#77716b;font-size:13px;line-height:1.6;">This code expires in 10 minutes and can only be used once. AfuMail will never ask you to share it with anyone.</p>
      </div>
      <p style="margin:22px 0 0;text-align:center;color:#9a948e;font-size:12px;line-height:1.5;">AfuMail by AfuChat Technologies Limited<br>Secure email for your everyday conversations.</p>
    </div>
  </body>
</html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AfuMail <noreply@afuchat.com>",
      to: [recoveryEmail],
      subject: "Your AfuMail password reset code",
      text,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("Recovery email delivery failed:", response.status, details);
    throw new Error("Failed to send the recovery email.");
  }
}

async function requestReset(profileEmail: string): Promise<Response> {
  const account = await findAccountByProfileEmail(profileEmail);
  if (!account) {
    return jsonResponse({ error: "No AfuMail profile exists with that @afuchat.com address." }, 404);
  }
  if (!account.recoveryEmail) {
    return jsonResponse({
      error: "No AfuChat recovery email is linked to this profile. Sign in and add one in Settings before resetting your password.",
    }, 400);
  }
  const recoveryEmail = account.recoveryEmail;

  const activeResult = await restJson(
    `/rest/v1/password_reset_codes?user_id=eq.${encodeURIComponent(account.profile.id)}&used_at=is.null&select=created_at&order=created_at.desc&limit=1`,
  );
  if (!activeResult.response.ok) throw new Error("Could not check recent reset attempts.");

  const latest = (activeResult.data as Array<{ created_at: string }>)[0];
  if (latest && Date.now() - new Date(latest.created_at).getTime() < RESEND_COOLDOWN_MS) {
    return jsonResponse({ error: "A code was sent recently. Please wait a minute before requesting another." }, 429);
  }

  const code = createCode();
  const codeHash = await hashCode(account.profile.id, recoveryEmail, code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS).toISOString();

  const invalidateResult = await restJson(
    `/rest/v1/password_reset_codes?user_id=eq.${encodeURIComponent(account.profile.id)}&used_at=is.null`,
    {
      method: "PATCH",
      body: JSON.stringify({ used_at: now.toISOString() }),
    },
  );
  if (!invalidateResult.response.ok) throw new Error("Could not prepare the reset request.");

  const insertResult = await restJson("/rest/v1/password_reset_codes", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: account.profile.id,
      recovery_email: recoveryEmail,
      code_hash: codeHash,
      expires_at: expiresAt,
    }),
  });
  if (!insertResult.response.ok) throw new Error("Could not create the reset code.");

  try {
    await sendRecoveryCodeEmail(
      recoveryEmail,
      account.profile.full_name?.trim() || account.authEmail.split("@")[0],
      code,
    );
  } catch (error) {
    await restJson(
      `/rest/v1/password_reset_codes?user_id=eq.${encodeURIComponent(account.profile.id)}&code_hash=eq.${encodeURIComponent(codeHash)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ used_at: new Date().toISOString() }),
      },
    );
    throw error;
  }

  return jsonResponse({
    ok: true,
    profileEmail: account.authEmail,
    recoveryEmail,
    deliveryEmail: recoveryEmail,
    expiresInSeconds: CODE_TTL_MS / 1000,
  });
}

type ResetAccount = NonNullable<Awaited<ReturnType<typeof findAccountByProfileEmail>>>;
type VerifiedResetCode = {
  account: ResetAccount;
  recoveryEmail: string;
  stored: ResetCodeRow;
};

/**
 * Validate a reset code without consuming it. The code is consumed only after
 * the new password has been successfully written, so the user can move from
 * the code screen to the password screen without losing their reset attempt.
 */
async function getVerifiedResetCode(
  profileEmail: string,
  code: string,
): Promise<VerifiedResetCode | Response> {
  if (!/^\d{6}$/.test(code)) {
    return jsonResponse({ error: "Enter the six digit verification code." }, 400);
  }

  const account = await findAccountByProfileEmail(profileEmail);
  if (!account) {
    return jsonResponse({ error: "No AfuMail profile exists with that @afuchat.com address." }, 404);
  }
  if (!account.recoveryEmail) {
    return jsonResponse({
      error: "No AfuChat recovery email is linked to this profile. Sign in and add one in Settings before resetting your password.",
    }, 400);
  }
  const recoveryEmail = account.recoveryEmail;

  const codeResult = await restJson(
    `/rest/v1/password_reset_codes?user_id=eq.${encodeURIComponent(account.profile.id)}&recovery_email=eq.${encodeURIComponent(recoveryEmail)}&used_at=is.null&select=id,user_id,code_hash,attempts,expires_at,used_at,created_at&order=created_at.desc&limit=1`,
  );
  if (!codeResult.response.ok) throw new Error("Could not verify the reset code.");

  const stored = (codeResult.data as ResetCodeRow[])[0];
  if (
    !stored ||
    stored.attempts >= MAX_CODE_ATTEMPTS ||
    stored.used_at ||
    new Date(stored.expires_at).getTime() <= Date.now()
  ) {
    return jsonResponse({ error: "The recovery code is invalid or expired." }, 400);
  }

  const codeHash = await hashCode(account.profile.id, recoveryEmail, code);
  if (codeHash !== stored.code_hash) {
    const attempts = stored.attempts + 1;
    await restJson(`/rest/v1/password_reset_codes?id=eq.${encodeURIComponent(stored.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ attempts }),
    });
    return jsonResponse({
      error: attempts >= MAX_CODE_ATTEMPTS
        ? "Too many incorrect attempts. Request a new code."
        : "That verification code is not correct.",
    }, 400);
  }

  return { account, recoveryEmail, stored };
}

async function verifyResetCode(
  profileEmail: string,
  code: string,
): Promise<Response> {
  const result = await getVerifiedResetCode(profileEmail, code);
  if (result instanceof Response) return result;
  return jsonResponse({ ok: true });
}

async function confirmReset(
  profileEmail: string,
  code: string,
  newPassword: string,
): Promise<Response> {
  if (newPassword.length < 6) {
    return jsonResponse({ error: "Password must be at least 6 characters." }, 400);
  }
  if (newPassword.length > 128) {
    return jsonResponse({ error: "Password is too long." }, 400);
  }

  const result = await getVerifiedResetCode(profileEmail, code);
  if (result instanceof Response) return result;
  const { account, stored } = result;

  const updateResult = await restJson(`/auth/v1/admin/users/${encodeURIComponent(account.profile.id)}`, {
    method: "PUT",
    body: JSON.stringify({ password: newPassword }),
  });
  if (!updateResult.response.ok) {
    const details = await updateResult.response.text().catch(() => "");
    console.error("Password update failed:", updateResult.response.status, details);
    return jsonResponse({ error: "Could not update the password. Please request a new code." }, 500);
  }

  const markUsedResult = await restJson(`/rest/v1/password_reset_codes?id=eq.${encodeURIComponent(stored.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ used_at: new Date().toISOString() }),
  });
  if (!markUsedResult.response.ok) {
    console.error("Could not mark reset code as used:", await markUsedResult.response.text().catch(() => ""));
  }

  return jsonResponse({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!serviceRoleKey()) {
    return jsonResponse({ error: "Password reset is not configured." }, 500);
  }

  try {
    const body = await req.json() as {
      action?: "request" | "confirm";
      profileEmail?: unknown;
      code?: unknown;
      newPassword?: unknown;
    };
    const profileEmail = normalizeRecoveryEmail(body.profileEmail);
    if (!isValidRecoveryEmail(profileEmail)) {
       return jsonResponse({ error: "Enter the AfuChat email on your profile (username@afuchat.com)." }, 400);
    }

    if ((body.action ?? "request") === "request") {
      return await requestReset(profileEmail);
    }

    if (body.action === "verify") {
      return await verifyResetCode(
        profileEmail,
        typeof body.code === "string" ? body.code.trim() : "",
      );
    }

    if (body.action === "confirm") {
      return await confirmReset(
        profileEmail,
        typeof body.code === "string" ? body.code.trim() : "",
        typeof body.newPassword === "string" ? body.newPassword : "",
      );
    }

    return jsonResponse({ error: "Unknown password reset action." }, 400);
  } catch (error) {
    console.error("Password reset error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Password reset failed." }, 500);
  }
});