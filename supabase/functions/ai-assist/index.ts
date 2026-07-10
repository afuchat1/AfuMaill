/**
 * AfuMail AI Assistant — Supabase Edge Function
 *
 * Server-side proxy to the Engagera API (https://engagera.afuchat.com/docs).
 * The Engagera API key lives only here (ENGAGERA_API_KEY secret) — it is never
 * sent to the browser or the mobile app. Callers authenticate with their normal
 * AfuMail Supabase session token; this function verifies it, then talks to
 * Engagera on the user's behalf.
 *
 * POST /  body: { mode: "compose" | "reply" | "summarize" | "chat", ...mode fields }
 *
 *   mode "compose"   { instruction: string, draft?: string, subject?: string, to?: string }
 *                     -> { content: string }
 *   mode "reply"     { emailSubject?: string, emailFrom?: string, emailBody: string, tone?: string }
 *                     -> { replies: string[] }   (2-4 short suggested replies)
 *   mode "summarize" { emailSubject?: string, emailBody: string }
 *                     -> { content: string }     (a few sentences)
 *   mode "chat"      { messages: { role: "user"|"assistant"|"system", content: string }[] }
 *                     -> { content: string }
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROJECT_URL = "https://lqowocmjmhbkoxlwyxku.supabase.co";
const ENGAGERA_BASE = "https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1";
const DEFAULT_MODEL = "engagera-pro";

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function svcKey(): string {
  return Deno.env.get("SVC_ROLE_KEY") ?? "";
}

async function getUserFromBearerToken(
  authHeader: string | null | undefined,
): Promise<{ id: string; email: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const key = svcKey();
  const r = await fetch(`${PROJECT_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: key },
  });
  if (!r.ok) return null;
  const user = (await r.json()) as { id?: string; email?: string };
  return user?.id ? (user as { id: string; email: string }) : null;
}

interface EngageraMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callEngagera(messages: EngageraMessage[], model = DEFAULT_MODEL): Promise<string> {
  const apiKey = Deno.env.get("ENGAGERA_API_KEY");
  if (!apiKey) throw new Error("ENGAGERA_API_KEY is not configured.");

  const res = await fetch(`${ENGAGERA_BASE}/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Engagera request failed (${res.status}).`);
  }
  const content = (data as { message?: { content?: string } }).message?.content;
  if (typeof content !== "string") throw new Error("Engagera returned an unexpected response.");
  return content;
}

function truncate(text: string, max = 6000): string {
  return text.length > max ? text.slice(0, max) + "\n…(truncated)" : text;
}

function parseReplyList(raw: string): string[] {
  // Try JSON array first.
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      const list = parsed.filter((x) => typeof x === "string" && x.trim().length > 0);
      if (list.length > 0) return list.slice(0, 4);
    }
  } catch {
    // fall through to line-based parsing
  }
  // Fallback: split lines, strip numbering/bullets/quotes.
  return trimmed
    .split("\n")
    .map((l) => l.replace(/^[\s\-*\d.)"']+/, "").replace(/["']$/, "").trim())
    .filter((l) => l.length > 0)
    .slice(0, 4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResp({ error: "Method not allowed" }, 405);
  }

  const user = await getUserFromBearerToken(req.headers.get("Authorization"));
  if (!user) {
    return jsonResp({ error: "Your AfuMail session has expired. Please sign in again." }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: "Invalid JSON body." }, 400);
  }

  const mode = body.mode;

  try {
    if (mode === "compose") {
      const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
      if (!instruction) return jsonResp({ error: "instruction is required." }, 400);
      const draft = typeof body.draft === "string" ? body.draft : "";
      const subject = typeof body.subject === "string" ? body.subject : "";
      const to = typeof body.to === "string" ? body.to : "";

      const messages: EngageraMessage[] = [
        {
          role: "system",
          content:
            "You are AfuMail's email writing assistant. Write or revise the body of an email based on the user's instruction. " +
            "Output only the finished email body text — no subject line, no greeting like 'Here is your email', no markdown, no quotes.",
        },
        {
          role: "user",
          content:
            `Instruction: ${instruction}\n` +
            (subject ? `Subject: ${subject}\n` : "") +
            (to ? `Recipient: ${to}\n` : "") +
            (draft ? `Current draft to revise:\n${truncate(draft)}` : "There is no existing draft — write a new email from scratch."),
        },
      ];

      const content = await callEngagera(messages, "engagera-pro");
      return jsonResp({ content: content.trim() });
    }

    if (mode === "reply") {
      const emailBody = typeof body.emailBody === "string" ? body.emailBody : "";
      if (!emailBody) return jsonResp({ error: "emailBody is required." }, 400);
      const emailSubject = typeof body.emailSubject === "string" ? body.emailSubject : "";
      const emailFrom = typeof body.emailFrom === "string" ? body.emailFrom : "";
      const tone = typeof body.tone === "string" ? body.tone : "friendly and concise";

      const messages: EngageraMessage[] = [
        {
          role: "system",
          content:
            "You suggest quick reply options for an email inbox, like Gmail's Smart Reply. " +
            "Given the email below, respond with a JSON array of 3 short reply strings (each under 15 words), " +
            `in a ${tone} tone. Output ONLY the JSON array, nothing else.`,
        },
        {
          role: "user",
          content:
            (emailFrom ? `From: ${emailFrom}\n` : "") +
            (emailSubject ? `Subject: ${emailSubject}\n` : "") +
            `Body:\n${truncate(emailBody, 3000)}`,
        },
      ];

      const content = await callEngagera(messages, "engagera-lite");
      const replies = parseReplyList(content);
      if (replies.length === 0) return jsonResp({ error: "Could not generate replies." }, 502);
      return jsonResp({ replies });
    }

    if (mode === "summarize") {
      const emailBody = typeof body.emailBody === "string" ? body.emailBody : "";
      if (!emailBody) return jsonResp({ error: "emailBody is required." }, 400);
      const emailSubject = typeof body.emailSubject === "string" ? body.emailSubject : "";

      const messages: EngageraMessage[] = [
        {
          role: "system",
          content:
            "Summarize the following email in 2-3 short sentences, focused on what the reader needs to know or do. " +
            "Plain text only, no markdown, no preamble like 'This email is about'.",
        },
        {
          role: "user",
          content: (emailSubject ? `Subject: ${emailSubject}\n` : "") + `Body:\n${truncate(emailBody)}`,
        },
      ];

      const content = await callEngagera(messages, "engagera-lite");
      return jsonResp({ content: content.trim() });
    }

    if (mode === "chat") {
      const rawMessages = body.messages;
      if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
        return jsonResp({ error: "messages is required." }, 400);
      }
      const messages: EngageraMessage[] = rawMessages
        .filter(
          (m): m is EngageraMessage =>
            m &&
            typeof m === "object" &&
            (m.role === "user" || m.role === "assistant" || m.role === "system") &&
            typeof m.content === "string",
        )
        .slice(-20);
      if (messages.length === 0) return jsonResp({ error: "messages is empty after validation." }, 400);

      const model = typeof body.model === "string" ? body.model : DEFAULT_MODEL;
      const content = await callEngagera(messages, model);
      return jsonResp({ content: content.trim() });
    }

    return jsonResp({ error: "Unknown mode. Expected compose, reply, summarize, or chat." }, 400);
  } catch (err) {
    return jsonResp({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
