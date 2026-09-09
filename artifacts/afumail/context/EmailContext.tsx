import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

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
}

export interface Email {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  body: string;
  preview: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  pinned: boolean;
  attachments: Attachment[];
  category: EmailCategory;
  folder: EmailFolder;
}

interface ComposeData {
  to: string;
  cc?: string;
  subject: string;
  body: string;
}

interface EmailContextType {
  emails: Email[];
  isLoading: boolean;
  getEmailsByFolder: (folder: EmailFolder) => Email[];
  getEmailsByCategory: (category: EmailCategory) => Email[];
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
function rowToEmail(row: any): Email {
  const folderRow = Array.isArray(row.folders) ? row.folders[0] : row.folders;
  const rawFolder = String(folderRow?.type ?? (row.deleted_at ? "trash" : "inbox")).toLowerCase();
  const folder = (rawFolder === "custom" ? "archived" : rawFolder) as EmailFolder;
  const category = String(row.category ?? "primary").toLowerCase() as EmailCategory;
  const parseAddress = (value: unknown): EmailAddress => {
    const raw = String(value ?? "");
    const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
    return match
      ? { name: match[1]?.trim() || match[2], email: match[2]?.trim() ?? "" }
      : { name: raw.split("@")[0] ?? raw, email: raw };
  };
  const addresses = (value: unknown): EmailAddress[] =>
    Array.isArray(value) ? value.map(parseAddress).filter((item) => item.email) : [];
  const body = String(row.body_html ?? row.body_text ?? "");

  return {
    id: row.id as string,
    from: parseAddress(row.from_address),
    to: addresses(row.to_addresses),
    cc: addresses(row.cc_addresses).length ? addresses(row.cc_addresses) : undefined,
    subject: (row.subject ?? "(No Subject)") as string,
    body,
    preview: (row.preview ?? row.body_text ?? body) as string,
    timestamp: (row.sent_at ?? row.received_at ?? row.created_at ?? new Date().toISOString()) as string,
    read: Boolean(row.is_read),
    starred: Boolean(row.is_starred),
    pinned: Boolean(row.is_important),
    attachments: (row.attachments ?? []) as Attachment[],
    category,
    folder,
  };
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
    body_text: "Welcome to AfuMail — a next-generation email experience designed for focus, clarity, and productivity.\n\nYour inbox is now smarter, faster, and more organised than ever.\n\nGet started:\n• Smart inbox automatically sorts your emails by category\n• Compose and send messages to anyone\n• Star important messages to find them instantly\n• Use Search to find anything in your inbox\n\nHappy emailing!\n\nThe AfuChat Team",
    preview: "Welcome to AfuMail — your inbox is now smarter, faster, and more organised than ever.",
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
        setEmails([]);
        setIsLoading(false);
        return;
      }

      const loaded = (data ?? []).map(rowToEmail);

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
        setEmails((seeded ?? []).map(rowToEmail));
      } else {
        setEmails(loaded);
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
    (folder: EmailFolder) =>
      emails
        .filter((e) => {
          if (folder === "starred") return e.starred;
          return e.folder === folder;
        })
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
    [emails]
  );

  const getEmailsByCategory = useCallback(
    (category: EmailCategory) =>
      emails
        .filter((e) => e.folder === "inbox" && e.category === category)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
    [emails]
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
