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
  const folder = String(row.folder ?? "inbox").toLowerCase() as EmailFolder;
  const category = String(row.category ?? "primary").toLowerCase() as EmailCategory;

  return {
    id: row.id as string,
    from: { name: (row.from_name ?? row.from_email ?? "") as string, email: row.from_email as string },
    to: (row.to_emails ?? []) as EmailAddress[],
    cc: (row.cc_emails as EmailAddress[] | undefined)?.length
      ? (row.cc_emails as EmailAddress[])
      : undefined,
    subject: (row.subject ?? "(No Subject)") as string,
    body: (row.body ?? "") as string,
    preview: (row.preview ?? row.body ?? "") as string,
    timestamp: (row.timestamp ?? row.created_at ?? new Date().toISOString()) as string,
    read: Boolean(row.read),
    starred: Boolean(row.starred),
    pinned: Boolean(row.pinned),
    attachments: (row.attachments ?? []) as Attachment[],
    category,
    folder,
  };
}

// ─── Welcome email seed ─────────────────────────────────────────────────────

async function seedWelcomeEmail(ownerId: string, userEmail: string) {
  const { error } = await supabase.from("emails").insert({
    owner_id: ownerId,
    from_name: "AfuChat Team",
    from_email: "team@afuchat.com",
    to_emails: [{ name: "Me", email: userEmail }],
    cc_emails: [],
    subject: "Welcome to AfuMail 👋",
    body: "Welcome to AfuMail — a next-generation email experience designed for focus, clarity, and productivity.\n\nYour inbox is now smarter, faster, and more organised than ever.\n\nGet started:\n• Smart inbox automatically sorts your emails by category\n• Compose and send messages to anyone\n• Star important messages to find them instantly\n• Use Search to find anything in your inbox\n\nHappy emailing!\n\nThe AfuChat Team",
    preview: "Welcome to AfuMail — your inbox is now smarter, faster, and more organised than ever.",
    timestamp: new Date().toISOString(),
    read: false,
    starred: false,
    pinned: false,
    attachments: [],
    category: "primary",
    folder: "inbox",
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
        .select("*")
        .eq("owner_id", user.id)
        .order("timestamp", { ascending: false });

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
          .select("*")
          .eq("owner_id", user.id)
          .order("timestamp", { ascending: false });
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
          filter: `owner_id=eq.${user.id}`,
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
        const { error } = await supabase.from("emails").update({ read: true }).eq("id", id);
        if (error) console.warn("markAsRead error:", error.message);
      } catch (err) {
        console.warn("markAsRead exception:", err);
      }
    },
    []
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
        const { error } = await supabase.from("emails").update({ starred: next }).eq("id", id);
        if (error) console.warn("toggleStar error:", error.message);
      } catch (err) {
        console.warn("toggleStar exception:", err);
      }
    },
    [emails]
  );

  const markAsUnread = useCallback(async (id: string) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, read: false } : e)));
    try {
      const { error } = await supabase.from("emails").update({ read: false }).eq("id", id);
      if (error) console.warn("markAsUnread error:", error.message);
    } catch (err) {
      console.warn("markAsUnread exception:", err);
    }
  }, []);

  const moveToFolder = useCallback(async (id: string, folder: EmailFolder) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, folder } : e)));
    try {
      const { error } = await supabase.from("emails").update({ folder }).eq("id", id);
      if (error) console.warn("moveToFolder error:", error.message);
    } catch (err) {
      console.warn("moveToFolder exception:", err);
    }
  }, []);

  const archiveEmail = useCallback(
    async (id: string) => {
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, folder: "archived" } : e))
      );
      try {
        const { error } = await supabase.from("emails").update({ folder: "archived" }).eq("id", id);
        if (error) console.warn("archiveEmail error:", error.message);
      } catch (err) {
        console.warn("archiveEmail exception:", err);
      }
    },
    []
  );

  const deleteEmail = useCallback(
    async (id: string) => {
      const email = emails.find((e) => e.id === id);
      try {
        // If already in trash, permanently delete
        if (email?.folder === "trash") {
          setEmails((prev) => prev.filter((e) => e.id !== id));
          const { error } = await supabase.from("emails").delete().eq("id", id);
          if (error) console.warn("deleteEmail error:", error.message);
        } else {
          setEmails((prev) =>
            prev.map((e) => (e.id === id ? { ...e, folder: "trash" } : e))
          );
          const { error } = await supabase.from("emails").update({ folder: "trash" }).eq("id", id);
          if (error) console.warn("deleteEmail error:", error.message);
        }
      } catch (err) {
        console.warn("deleteEmail exception:", err);
      }
    },
    [emails]
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

      // Save a copy to the sent folder in Supabase
      try {
        const { data: inserted, error } = await supabase
          .from("emails")
          .insert({
            owner_id: user.id,
            from_name: fromName,
            from_email: fromEmail,
            to_emails: toAddresses,
            cc_emails: ccAddresses,
            subject: data.subject || "(No Subject)",
            body: data.body,
            preview,
            timestamp: new Date().toISOString(),
            read: true,
            starred: false,
            pinned: false,
            attachments: [],
            category: "primary",
            folder: "sent",
          })
          .select()
          .single();

        if (error) {
          console.warn("sendEmail Supabase error:", error.message);
        } else if (inserted) {
          setEmails((prev) => [rowToEmail(inserted), ...prev]);
        }
      } catch (err) {
        console.warn("sendEmail Supabase exception:", err);
      }
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
