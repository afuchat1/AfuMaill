import { supabase } from "@/lib/supabase";
import { htmlToPlainText } from "@/lib/htmlToPlainText";

async function callAiAssist<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ai-assist", {
    body,
  });

  if (error) {
    throw new Error(error.message || "The AI assistant is unavailable right now.");
  }

  // The edge function might return { error: "..." } with a 200/400 but since we use invoke it throws if non-2xx usually,
  // but let's check data.error just in case.
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    throw new Error(data.error);
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
  const { replies } = await callAiAssist<{ replies: string[] }>({
    mode: "reply",
    ...params,
    emailBody: htmlToPlainText(params.emailBody),
  });
  return replies;
}

/** Summarize an opened email in a few concise sentences. */
export async function aiSummarize(params: {
  emailBody: string;
  emailSubject?: string;
}): Promise<string> {
  const { content } = await callAiAssist<{ content: string }>({
    mode: "summarize",
    emailSubject: params.emailSubject,
    emailBody: htmlToPlainText(params.emailBody),
  });
  return content;
}

/** Send a chat message to the AI assistant and get a reply. */
export async function aiChat(params: {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
}): Promise<string> {
  const { content } = await callAiAssist<{ content: string }>({ mode: "chat", ...params });
  return content;
}
