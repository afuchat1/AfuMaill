import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { htmlToPlainText } from "@/lib/htmlToPlainText";

// ─── Types ─────────────────────────────────────────────────────────────────

export type EmailCategory =
  | "primary"
  | "work"
  | "personal"
  | "finance"
  | "shopping"
  | "travel"
  | "updates"
  | "social";

export type EmailFolder =
  | "inbox"
  | "sent"
  | "drafts"
  | "archived"
  | "trash"
  | "spam"
  | "starred";

export interface EmailAddress {
  name: string;
  email: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface Email {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  body: string;
  bodyFormat?: "html" | "text";
  preview: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  pinned: boolean;
  attachments: Attachment[];
  category: EmailCategory;
  folder: EmailFolder;
  threadId?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  threadCount?: number;
}

interface ComposeData {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

export interface EmailThread {
  id: string;
  latest: Email;
  messages: Email[];
}

interface EmailContextType {
  emails: Email[];
  isLoading: boolean;
  getEmailsByFolder: (folder: EmailFolder) => Email[];
  getEmailsByCategory: (category: EmailCategory) => Email[];
  getThreadsByFolder: (folder: EmailFolder) => EmailThread[];
  getEmailsInThread: (emailId: string) => Email[];
  getEmailById: (id: string) => Email | undefined;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  archiveEmail: (id: string) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;
  moveToFolder: (id: string, folder: EmailFolder) => Promise<void>;
  sendEmail: (data: ComposeData, fromEmail: string, fromName: string) => Promise<void>;
  unreadCount: number;
  refreshEmails: () => Promise<void>;
}

// ─── Context default ────────────────────────────────────────────────────────

const EmailContext = createContext<EmailContextType>({
  emails: [],
  isLoading: false,
  getEmailsByFolder: () => [],
  getEmailsByCategory: () => [],
  getThreadsByFolder: () => [],
  getEmailsInThread: () => [],
  getEmailById: () => undefined,
  markAsRead: async () => {},
  markAsUnread: async () => {},
  toggleStar: async () => {},
  archiveEmail: async () => {},
  deleteEmail: async () => {},
  moveToFolder: async () => {},
  sendEmail: async () => {},
  unreadCount: 0,
  refreshEmails: async () => {},
});

// ─── DB row → Email mapper ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KNOWN_DOMAIN_BRANDS: Record<string, string> = {
  "afuchat.com": "AfuChat",
  "gmail.com": "Gmail",
  "googlemail.com": "Gmail",
  "outlook.com": "Outlook",
  "hotmail.com": "Outlook",
  "live.com": "Outlook",
  "yahoo.com": "Yahoo",
  "icloud.com": "iCloud",
  "proton.me": "Proton Mail",
  "protonmail.com": "Proton Mail",
};

function domainBrand(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (KNOWN_DOMAIN_BRANDS[domain]) return KNOWN_DOMAIN_BRANDS[domain];

  const parts = domain.split(".").filter(Boolean);
  const label = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  if (!label) return "Unknown sender";
  return label
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isMailboxFallback(name: string, email: string): boolean {
  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  const normalizedName = name.trim().toLowerCase();
  return !normalizedName || normalizedName === localPart || normalizedName === email.toLowerCase();
}

function extractAddressEmail(value: unknown): string {
  const raw = String(value ?? "");
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] ?? raw).trim().toLowerCase();
}

function rowToEmail(row: any, senderNames: Record<string, string> = {}): Email {
  const folderRow = Array.isArray(row.folders) ? row.folders[0] : row.folders;
  const rawFolder = String(folderRow?.type ?? (row.deleted_at ? "trash" : "inbox")).toLowerCase();
  const folder = (rawFolder === "custom" ? "archived" : rawFolder) as EmailFolder;
  const category = String(row.category ?? "primary").toLowerCase() as EmailCategory;
  const parseAddress = (value: unknown, resolveSenderName = false): EmailAddress => {
    const raw = String(value ?? "");
    const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
    const email = (match?.[2] ?? raw).trim().toLowerCase();
    const rawName = match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    const name = resolveSenderName
      ? senderNames[email]?.trim()
        || (!isMailboxFallback(rawName, email) ? rawName : domainBrand(email))
      : rawName || email.split("@")[0] || email;

    return { name, email };
  };
  const addresses = (value: unknown): EmailAddress[] =>
    Array.isArray(value) ? value.map((item) => parseAddress(item)).filter((item) => item.email) : [];
  const htmlBody = typeof row.body_html === "string" ? row.body_html.trim() : "";
  const textBody = typeof row.body_text === "string" ? row.body_text : "";
  const normalizeBody = (value: string) => value.replace(/\s+/g, " ").trim();
  const htmlIsOnlyPlainText =
    Boolean(htmlBody && textBody.trim()) &&
    normalizeBody(htmlToPlainText(htmlBody)) === normalizeBody(textBody);
  const body = htmlBody && !htmlIsOnlyPlainText ? htmlBody : textBody || htmlBody;

  const from = parseAddress(row.from_address, true);
  const to = addresses(row.to_addresses);
  const cc = addresses(row.cc_addresses);
  const fallbackThreadId = `legacy:${normalizedSubject((row.subject ?? "(No Subject)") as string)}:${[
    from.email,
    ...to.map((address) => address.email),
    ...cc.map((address) => address.email),
  ]
    .filter(Boolean)
    .sort()
    .join(",")}`;

  return {
    id: row.id as string,
    from,
    to,
    cc: cc.length ? cc : undefined,
    subject: (row.subject ?? "(No Subject)") as string,
    body,
    bodyFormat: htmlBody && !htmlIsOnlyPlainText ? "html" : "text",
    preview: (row.preview ?? row.body_text ?? body) as string,
    timestamp: (row.sent_at ?? row.received_at ?? row.created_at ?? new Date().toISOString()) as string,
    read: Boolean(row.is_read),
    starred: Boolean(row.is_starred),
    pinned: Boolean(row.is_important),
    attachments: (row.attachments ?? []) as Attachment[],
    category,
    folder,
    threadId: typeof row.thread_id === "string" && row.thread_id.trim()
      ? row.thread_id
      : fallbackThreadId,
    messageId: typeof row.message_id === "string" ? row.message_id : undefined,
    inReplyTo: typeof row.in_reply_to === "string" ? row.in_reply_to : undefined,
    references: typeof row.references_header === "string" ? row.references_header : undefined,
  };
}

function normalizedSubject(subject: string): string {
  return subject
    .replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function threadKey(email: Email): string {
  if (email.threadId) return `thread:${email.threadId}`;
  const participants = [
    email.from.email,
    ...email.to.map((address) => address.email),
    ...(email.cc ?? []).map((address) => address.email),
  ]
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(",");
  return `legacy:${normalizedSubject(email.subject)}:${participants}`;
}

function buildThreads(source: Email[]): EmailThread[] {
  const groups = new Map<string, Email[]>();
  for (const email of source) {
    const key = threadKey(email);
    const group = groups.get(key);
    if (group) group.push(email);
    else groups.set(key, [email]);
  }

  return Array.from(groups.entries())
    .map(([id, messages]) => {
      const sorted = [...messages].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      return { id, latest: sorted[0]!, messages: sorted };
    })
    .sort(
      (a, b) =>
        new Date(b.latest.timestamp).getTime() - new Date(a.latest.timestamp).getTime(),
    );
}

async function getSenderNameMap(rows: any[]): Promise<Record<string, string>> {
  const emails = Array.from(
    new Set(
      rows
        .map((row) => extractAddressEmail(row.from_address))
        .filter((email) => email.endsWith("@afuchat.com")),
    ),
  );
  if (emails.length === 0) return {};

  const { data, error } = await supabase.rpc("get_afuchat_sender_display_names", {
    _emails: emails,
  });
  if (error) {
    console.warn("Sender display name lookup error:", error.message);
    return {};
  }

  return (data ?? []).reduce((map: Record<string, string>, row: { email?: string; display_name?: string }) => {
    const email = row.email?.trim().toLowerCase();
    const displayName = row.display_name?.trim();
    if (email && displayName) map[email] = displayName;
    return map;
  }, {});
}

// ─── Welcome email seed ─────────────────────────────────────────────────────

async function seedWelcomeEmail(ownerId: string, userEmail: string) {
  const [{ data: address }, { data: folder }] = await Promise.all([
    supabase
      .from("email_addresses")
      .select("id")
      .eq("user_id", ownerId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("folders").select("id").eq("user_id", ownerId).eq("type", "inbox").maybeSingle(),
  ]);
  if (!address || !folder) {
    console.warn("seedWelcomeEmail could not find the primary address or inbox folder.");
    return;
  }
  const { error } = await supabase.from("emails").insert({
    user_id: ownerId,
    email_address_id: address.id,
    folder_id: folder.id,
    from_address: "team@afuchat.com",
    to_addresses: [userEmail],
    cc_addresses: [],
    bcc_addresses: [],
    subject: "Welcome to AfuMail 👋",
    body_text: "Welcome to AfuMail. It is a next generation email experience designed for focus, clarity, and productivity.\n\nYour inbox is now smarter, faster, and more organised than ever.\n\nGet started:\n• Smart inbox automatically sorts your emails by category\n• Compose and send messages to anyone\n• Star important messages to find them instantly\n• Use Search to find anything in your inbox\n\nHappy emailing!\n\nThe AfuChat Team",
    preview: "Welcome to AfuMail. Your inbox is now smarter, faster, and more organised than ever.",
    received_at: new Date().toISOString(),
    is_read: false,
    is_starred: false,
    is_important: false,
    is_draft: false,
    attachments: [],
    category: "primary",
  });
  if (error) {
    console.warn("seedWelcomeEmail error:", error.message);
  }
}

// ─── Provider ───────────────────────────────────────────────────────────────

const EMAIL_CACHE_PREFIX = "afumail:emails:";
const EMAIL_CACHE_VERSION = 2;

function emailCacheKey(userId: string): string {
  return `${EMAIL_CACHE_PREFIX}${userId}`;
}

async function readCachedEmails(userId: string): Promise<Email[] | null> {
  try {
    const raw = await AsyncStorage.getItem(emailCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; emails?: unknown };
    if (parsed.version !== EMAIL_CACHE_VERSION || !Array.isArray(parsed.emails)) {
      return null;
    }
    return parsed.emails as Email[];
  } catch {
    return null;
  }
}

async function writeCachedEmails(userId: string, emails: Email[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      emailCacheKey(userId),
      JSON.stringify({
        version: EMAIL_CACHE_VERSION,
        cachedAt: new Date().toISOString(),
        emails,
      }),
    );
  } catch (error) {
    console.warn("email cache write error:", error);
  }
}

export function EmailProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEmails = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("emails")
        .select("*, folders!emails_folder_id_fkey(type), email_addresses!emails_email_address_id_fkey(full_email)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("loadEmails error:", error.message, error.details ?? "");
        setIsLoading(false);
        return;
      }

      const rows = data ?? [];
      const senderNames = await getSenderNameMap(rows);
      const loaded = rows.map((row) => rowToEmail(row, senderNames));

      // Seed welcome email for brand-new accounts
      if (loaded.length === 0) {
        await seedWelcomeEmail(user.id, user.email);
        const { data: seeded, error: seedLoadError } = await supabase
          .from("emails")
          .select("*, folders!emails_folder_id_fkey(type), email_addresses!emails_email_address_id_fkey(full_email)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (seedLoadError) {
          console.warn("loadEmails after seed error:", seedLoadError.message);
        }
        const seededRows = seeded ?? [];
        const senderNames = await getSenderNameMap(seededRows);
        const seededEmails = seededRows.map((row) => rowToEmail(row, senderNames));
        setEmails(seededEmails);
        void writeCachedEmails(user.id, seededEmails);
      } else {
        setEmails(loaded);
        void writeCachedEmails(user.id, loaded);
      }
    } catch (err) {
      console.warn("loadEmails exception:", err);
    }
    setIsLoading(false);
  }, [user?.id, user?.email]);

  // Load + subscribe whenever auth user changes
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setEmails([]);
      return;
    }

    let active = true;

    readCachedEmails(user.id).then((cachedEmails) => {
      if (active && cachedEmails) setEmails(cachedEmails);
    });
    loadEmails();

    // Real-time subscription for live inbox updates
    const channel = supabase
      .channel(`emails_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emails",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadEmails();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, loadEmails]);

  // ─── Actions ────────────────────────────────────────────────

  const markAsRead = useCallback(
    async (id: string) => {
      // Optimistic update
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, read: true } : e))
      );
      try {
        const { error } = await supabase.from("emails").update({ is_read: true }).eq("id", id).eq("user_id", user?.id ?? "");
        if (error) console.warn("markAsRead error:", error.message);
      } catch (err) {
        console.warn("markAsRead exception:", err);
      }
    },
    [user?.id]
  );

  const toggleStar = useCallback(
    async (id: string) => {
      const email = emails.find((e) => e.id === id);
      if (!email) return;
      const next = !email.starred;
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, starred: next } : e))
      );
      try {
        const { error } = await supabase.from("emails").update({ is_starred: next }).eq("id", id).eq("user_id", user?.id ?? "");
        if (error) console.warn("toggleStar error:", error.message);
      } catch (err) {
        console.warn("toggleStar exception:", err);
      }
    },
    [emails, user?.id]
  );

  const markAsUnread = useCallback(async (id: string) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, read: false } : e)));
    try {
      const { error } = await supabase.from("emails").update({ is_read: false }).eq("id", id).eq("user_id", user?.id ?? "");
      if (error) console.warn("markAsUnread error:", error.message);
    } catch (err) {
      console.warn("markAsUnread exception:", err);
    }
  }, [user?.id]);

  const moveToFolder = useCallback(async (id: string, folder: EmailFolder) => {
    if (!user?.id) return;
    const { data: folderRow, error: folderError } = await supabase
      .from("folders")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", folder === "archived" ? "custom" : folder)
      .maybeSingle();
    if (folderError || !folderRow) {
      console.warn("moveToFolder folder lookup error:", folderError?.message ?? `Missing ${folder} folder`);
      return;
    }
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, folder } : e)));
    try {
      const { error } = await supabase
        .from("emails")
        .update({ folder_id: folderRow.id, deleted_at: folder === "trash" ? new Date().toISOString() : null })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) console.warn("moveToFolder error:", error.message);
    } catch (err) {
      console.warn("moveToFolder exception:", err);
    }
  }, [user?.id]);

  const archiveEmail = useCallback(
    async (id: string) => {
      await moveToFolder(id, "archived");
    },
    [moveToFolder]
  );

  const deleteEmail = useCallback(
    async (id: string) => {
      const email = emails.find((e) => e.id === id);
      try {
        // If already in trash, permanently delete
        if (email?.folder === "trash") {
          setEmails((prev) => prev.filter((e) => e.id !== id));
          const { error } = await supabase.from("emails").delete().eq("id", id).eq("user_id", user?.id ?? "");
          if (error) console.warn("deleteEmail error:", error.message);
        } else {
          setEmails((prev) =>
            prev.map((e) => (e.id === id ? { ...e, folder: "trash" } : e))
          );
          await moveToFolder(id, "trash");
        }
      } catch (err) {
        console.warn("deleteEmail exception:", err);
      }
    },
    [emails, moveToFolder, user?.id]
  );

  const sendEmail = useCallback(
    async (data: ComposeData, fromEmail: string, fromName: string) => {
      if (!user?.id) return;

      const toAddresses: EmailAddress[] = data.to
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
        .map((r) => ({
          name: r.includes("@") ? r.split("@")[0] ?? r : r,
          email: r,
        }));

      const ccAddresses: EmailAddress[] = data.cc
        ? data.cc
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean)
            .map((r) => ({ name: r.includes("@") ? r.split("@")[0] ?? r : r, email: r }))
        : [];

      const preview = data.body.slice(0, 140).replace(/\n/g, " ");

      // Send via Resend through the Supabase Edge Function (real external delivery)
      const { error: fnError } = await supabase.functions.invoke("send-email", {
        body: {
          to: toAddresses.map((a) => a.email),
          cc: ccAddresses.map((a) => a.email),
          subject: data.subject || "(No Subject)",
          body: data.body,
          threadId: data.threadId,
          inReplyTo: data.inReplyTo,
          references: data.references,
          fromEmail,
          fromName,
        },
      });

      if (fnError) {
        console.warn("sendEmail Edge Function error:", fnError.message);
        throw new Error(fnError.message);
      }

      await loadEmails();
    },
    [user?.id]
  );

  // ─── Selectors ──────────────────────────────────────────────

  const getEmailsByFolder = useCallback(
    (folder: EmailFolder) => {
      const source = emails.filter((e) => (folder === "starred" ? e.starred : e.folder === folder));
      return buildThreads(source).map(({ latest, messages }) => ({
        ...latest,
        threadCount: messages.length,
      }));
    },
    [emails]
  );

  const getEmailsByCategory = useCallback(
    (category: EmailCategory) => {
      const source = emails.filter((e) => e.folder === "inbox" && e.category === category);
      return buildThreads(source).map(({ latest, messages }) => ({
        ...latest,
        threadCount: messages.length,
      }));
    },
    [emails]
  );

  const getThreadsByFolder = useCallback(
    (folder: EmailFolder) =>
      buildThreads(emails.filter((e) => (folder === "starred" ? e.starred : e.folder === folder))),
    [emails],
  );

  const getEmailsInThread = useCallback(
    (emailId: string) => {
      const selected = emails.find((email) => email.id === emailId);
      if (!selected) return [];
      const key = threadKey(selected);
      return emails
        .filter((email) => threadKey(email) === key)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    },
    [emails],
  );

  const getEmailById = useCallback(
    (id: string) => emails.find((e) => e.id === id),
    [emails]
  );

  const unreadCount = emails.filter(
    (e) => e.folder === "inbox" && !e.read
  ).length;

  return (
    <EmailContext.Provider
      value={{
        emails,
        isLoading,
        getEmailsByFolder,
        getEmailsByCategory,
        getThreadsByFolder,
        getEmailsInThread,
        getEmailById,
        markAsRead,
        markAsUnread,
        toggleStar,
        archiveEmail,
        deleteEmail,
        moveToFolder,
        sendEmail,
        unreadCount,
        refreshEmails: loadEmails,
      }}
    >
      {children}
    </EmailContext.Provider>
  );
}

export const useEmails = () => useContext(EmailContext);
