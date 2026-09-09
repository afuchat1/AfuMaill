export interface MailtoDraft {
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
}

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function readQueryValue(query: string, key: string): string | undefined {
  const values = query
    .split("&")
    .filter(Boolean)
    .flatMap((part) => {
      const separator = part.indexOf("=");
      const rawKey = separator >= 0 ? part.slice(0, separator) : part;
      const rawValue = separator >= 0 ? part.slice(separator + 1) : "";
      return decodePart(rawKey).toLowerCase() === key ? [decodePart(rawValue)] : [];
    });

  return values.length > 0 ? values.join(", ") : undefined;
}

/**
 * Converts a standard mailto URL into the fields understood by the compose
 * screen. Mail clients commonly pass comma-separated recipients and encoded
 * subject/body query parameters.
 */
export function parseMailtoUrl(url: string): MailtoDraft | null {
  if (!/^mailto:/i.test(url)) return null;

  const remainder = url.slice(url.indexOf(":") + 1);
  const queryStart = remainder.indexOf("?");
  const rawRecipients = queryStart >= 0 ? remainder.slice(0, queryStart) : remainder;
  const query = queryStart >= 0 ? remainder.slice(queryStart + 1) : "";
  const recipients = rawRecipients
    .split(",")
    .map((recipient) => decodePart(recipient.trim()))
    .filter(Boolean)
    .join(", ");

  const draft: MailtoDraft = {
    to: recipients || undefined,
    cc: readQueryValue(query, "cc"),
    subject: readQueryValue(query, "subject"),
    body: readQueryValue(query, "body"),
  };

  return draft.to || draft.cc || draft.subject || draft.body ? draft : null;
}