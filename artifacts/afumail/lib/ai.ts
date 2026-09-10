import { htmlToPlainText } from "@/lib/htmlToPlainText";
import { supabase } from "@/lib/supabase";

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

  if (!data || typeof data !== "object") {
    throw new Error("The AI assistant returned an empty response.");
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
  const response = await callAiAssist<{ replies?: unknown }>({
    mode: "reply",
    ...params,
    emailBody: htmlToPlainText(params.emailBody),
  });
  if (!Array.isArray(response.replies)) {
    throw new Error("The AI assistant returned invalid reply suggestions.");
  }
  const replies = response.replies.filter((reply): reply is string => typeof reply === "string" && reply.trim().length > 0);
  if (replies.length === 0) {
    throw new Error("No reply suggestions were generated. Try again.");
  }
  return replies;
}

/** Summarize an opened email in a few concise sentences. */
export async function aiSummarize(params: {
  emailBody: string;
  emailSubject?: string;
}): Promise<string> {
  const response = await callAiAssist<{ content?: unknown }>({
    mode: "summarize",
    emailSubject: params.emailSubject,
    emailBody: htmlToPlainText(params.emailBody),
  });
  if (typeof response.content !== "string" || !response.content.trim()) {
    throw new Error("The AI assistant returned an empty summary.");
  }
  return response.content.trim();
}
