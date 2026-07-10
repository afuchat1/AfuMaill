/**
 * AfuMail AI Assistant client — talks to the `ai-assist` Supabase Edge
 * Function, which proxies Engagera (https://engagera.afuchat.com/docs).
 * The Engagera API key never reaches this client; only the user's normal
 * Supabase session token is sent.
 */
import { apiUrl } from "@/lib/api-base";
import { supabase } from "@/lib/supabase";

async function callAiAssist<T>(body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Your AfuMail session has expired. Please sign in again.");

  const res = await fetch(apiUrl("/ai-assist"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "The AI assistant is unavailable right now.");
  }
  return data as T;
}

/** Draft or revise an email body from a plain-language instruction. */
export async function aiCompose(params: {
  instruction: string;
  draft?: string;
  subject?: string;
  to?: string;
}): Promise<string> {
  const { content } = await callAiAssist<{ content: string }>({ mode: "compose", ...params });
  return content;
}

/** Get 2-4 short suggested replies for an opened email. */
export async function aiSmartReplies(params: {
  emailBody: string;
  emailSubject?: string;
  emailFrom?: string;
}): Promise<string[]> {
  const { replies } = await callAiAssist<{ replies: string[] }>({ mode: "reply", ...params });
  return replies;
}

/** Summarize an email in a couple of sentences. */
export async function aiSummarize(params: {
  emailBody: string;
  emailSubject?: string;
}): Promise<string> {
  const { content } = await callAiAssist<{ content: string }>({ mode: "summarize", ...params });
  return content;
}

/** Send a chat message to the AI assistant and get a reply. */
export async function aiChat(params: {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
}): Promise<string> {
  const { content } = await callAiAssist<{ content: string }>({ mode: "chat", ...params });
  return content;
}
