import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  markAsRead: (id: string) => void;
  toggleStar: (id: string) => void;
  archiveEmail: (id: string) => void;
  deleteEmail: (id: string) => void;
  sendEmail: (data: ComposeData, fromEmail: string, fromName: string) => Promise<void>;
  unreadCount: number;
  refreshEmails: () => void;
}

const EmailContext = createContext<EmailContextType>({
  emails: [],
  isLoading: true,
  getEmailsByFolder: () => [],
  getEmailsByCategory: () => [],
  getEmailById: () => undefined,
  markAsRead: () => {},
  toggleStar: () => {},
  archiveEmail: () => {},
  deleteEmail: () => {},
  sendEmail: async () => {},
  unreadCount: 0,
  refreshEmails: () => {},
});

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function buildMockEmails(userEmail: string): Email[] {
  const now = Date.now();
  const min = 60 * 1000;
  const hr = 60 * min;

  return [
    {
      id: "e1",
      from: { name: "Alex Morgan", email: "alex.morgan@afuchat.com" },
      to: [{ name: "Me", email: userEmail }],
      subject: "Q3 Product Roadmap Review",
      body: "Hi,\n\nI wanted to share the updated Q3 product roadmap with you before the all-hands tomorrow. We have some exciting features lined up this quarter.\n\nThe key highlights are:\n\n1. New AI-powered inbox organization\n2. Enhanced collaboration features\n3. Mobile performance improvements\n4. Advanced search with natural language\n\nPlease review and share any feedback before 5pm today.\n\nLooking forward to hearing your thoughts.\n\nBest,\nAlex",
      preview: "I wanted to share the updated Q3 product roadmap before the all-hands tomorrow.",
      timestamp: new Date(now - 20 * min).toISOString(),
      read: false,
      starred: true,
      pinned: false,
      attachments: [{ id: "a1", name: "Q3_Roadmap_2026.pdf", size: 2400000, type: "pdf" }],
      category: "work",
      folder: "inbox",
    },
    {
      id: "e2",
      from: { name: "Sarah Chen", email: "sarah.chen@afuchat.com" },
      to: [{ name: "Me", email: userEmail }],
      subject: "Design Review — Tomorrow 2pm",
      body: "Hey,\n\nJust a reminder that we have the design review scheduled for tomorrow at 2pm. I've uploaded the latest mockups to our shared workspace.\n\nKey areas to focus on:\n• Navigation patterns and flow\n• Color accessibility standards\n• Mobile responsiveness\n• Typography hierarchy\n\nSee you then!",
      preview: "Just a reminder that we have the design review scheduled for tomorrow at 2pm.",
      timestamp: new Date(now - 45 * min).toISOString(),
      read: false,
      starred: false,
      pinned: true,
      attachments: [],
      category: "work",
      folder: "inbox",
    },
    {
      id: "e3",
      from: { name: "AfuChat Team", email: "team@afuchat.com" },
      to: [{ name: "Me", email: userEmail }],
      subject: "Welcome to AfuMail",
      body: "Welcome to AfuMail — a next-generation email experience designed for focus, clarity, and productivity.\n\nYour inbox is now smarter, faster, and more organized than ever.\n\nGet started:\n• Smart inbox automatically sorts your emails\n• AI summarizes long threads instantly\n• Schedule emails for the perfect moment\n• Search naturally — just describe what you're looking for\n\nHappy emailing!\n\nThe AfuChat Team",
      preview: "Welcome to AfuMail — a next-generation email experience designed for focus and clarity.",
      timestamp: new Date(now - 2 * hr).toISOString(),
      read: true,
      starred: false,
      pinned: false,
      attachments: [],
      category: "primary",
      folder: "inbox",
    },
    {
      id: "e4",
      from: { name: "Marcus Liu", email: "marcus.liu@afuchat.com" },
      to: [{ name: "Me", email: userEmail }],
      subject: "Invoice #2847 — June Services",
      body: "Dear Client,\n\nPlease find attached the invoice for services rendered in June 2026.\n\nInvoice Details:\n• Invoice #: 2847\n• Date: June 30, 2026\n• Amount: $3,200.00\n• Due: July 15, 2026\n\nPayment methods accepted: Bank transfer, card.\n\nThank you for your continued business.\n\nMarcus Liu\nFinance Department",
      preview: "Please find attached the invoice for services rendered in June 2026.",
      timestamp: new Date(now - 3 * hr).toISOString(),
      read: false,
      starred: false,
      pinned: false,
      attachments: [{ id: "a2", name: "Invoice_2847.pdf", size: 145000, type: "pdf" }],
      category: "finance",
      folder: "inbox",
    },
    {
      id: "e5",
      from: { name: "Priya Patel", email: "priya.patel@afuchat.com" },
      to: [{ name: "Me", email: userEmail }],
      subject: "Re: Team dinner next Friday",
      body: "Hi,\n\nCount me in for the team dinner! Friday works perfectly.\n\nShould we make a reservation? I know a great place downtown — Café Lumin. They have excellent food and a private dining room for groups.\n\nLet me know and I can book it.\n\nPriya",
      preview: "Count me in for the team dinner! Friday works perfectly. Should we make a reservation?",
      timestamp: new Date(now - 5 * hr).toISOString(),
      read: true,
      starred: true,
      pinned: false,
      attachments: [],
      category: "personal",
      folder: "inbox",
    },
    {
      id: "e6",
      from: { name: "GitHub Notifications", email: "noreply@github.com" },
      to: [{ name: "Me", email: userEmail }],
      subject: "PR Review Requested: feat/smart-inbox-v2",
      body: "Hello,\n\nYou've been requested to review a pull request:\n\nRepository: afuchat/afumail-core\nBranch: feat/smart-inbox-v2\nOpened by: dev-team\n\nChanges include:\n• New ML-based email categorization\n• Improved threading algorithm\n• Performance optimizations\n\nView the pull request to leave your review.",
      preview: "You've been requested to review a pull request in afuchat/afumail-core.",
      timestamp: new Date(now - 8 * hr).toISOString(),
      read: true,
      starred: false,
      pinned: false,
      attachments: [],
      category: "updates",
      folder: "inbox",
    },
    {
      id: "e7",
      from: { name: "James Wilson", email: "j.wilson@partner.com" },
      to: [{ name: "Me", email: userEmail }],
      subject: "Partnership Proposal — Q4 2026",
      body: "Dear Team,\n\nI hope this message finds you well.\n\nWe've been following AfuChat's growth with great interest and believe there's a compelling opportunity for a strategic partnership.\n\nOur proposal focuses on:\n1. Co-marketing initiatives\n2. API integration between our platforms\n3. Joint customer success programs\n\nI'd love to schedule a call to discuss the possibilities further.\n\nBest regards,\nJames Wilson\nPartnership Director",
      preview: "We've been following AfuChat's growth and believe there's an opportunity for partnership.",
      timestamp: new Date(now - 1.2 * 24 * hr).toISOString(),
      read: false,
      starred: false,
      pinned: false,
      attachments: [],
      category: "work",
      folder: "inbox",
    },
    {
      id: "e8",
      from: { name: "Lisa Torres", email: "lisa.torres@afuchat.com" },
      to: [{ name: "Me", email: userEmail }],
      subject: "Flight confirmation — SFO to NYC",
      body: "Hi,\n\nYour travel has been booked and confirmed.\n\nFlight Details:\n• Departure: July 8, 2026, 9:15 AM\n• From: San Francisco (SFO)\n• To: New York (JFK)\n• Duration: 5h 30m\n• Seat: 12A (Window)\n• Confirmation: AFC2847K\n\nPlease check in online 24 hours before departure.\n\nSafe travels!",
      preview: "Your travel has been booked. Departure: July 8, 2026, 9:15 AM from SFO to JFK.",
      timestamp: new Date(now - 2 * 24 * hr).toISOString(),
      read: true,
      starred: true,
      pinned: false,
      attachments: [{ id: "a3", name: "boarding_pass.pdf", size: 98000, type: "pdf" }],
      category: "travel",
      folder: "inbox",
    },
    {
      id: "s1",
      from: { name: "Me", email: userEmail },
      to: [{ name: "Alex Morgan", email: "alex.morgan@afuchat.com" }],
      subject: "Re: Q3 Product Roadmap Review",
      body: "Hi Alex,\n\nThanks for sharing this. I've reviewed the roadmap and have a few thoughts:\n\nThe AI inbox feature looks great — I think this will be a game changer for users managing high volumes of email.\n\nFor the collaboration features, can we discuss the real-time sync mechanism? I want to make sure we handle offline scenarios gracefully.\n\nSee you at the all-hands!\n\nBest",
      preview: "Thanks for sharing this. I've reviewed the roadmap and have a few thoughts.",
      timestamp: new Date(now - 10 * min).toISOString(),
      read: true,
      starred: false,
      pinned: false,
      attachments: [],
      category: "work",
      folder: "sent",
    },
  ];
}

export function EmailProvider({ children }: { children: React.ReactNode }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("me@afuchat.com");

  const loadEmails = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("afumail_emails");
      const storedUser = await AsyncStorage.getItem("afumail_user");
      let email = "me@afuchat.com";
      if (storedUser) {
        const u = JSON.parse(storedUser);
        email = u.email ?? email;
        setUserEmail(email);
      }
      if (stored) {
        setEmails(JSON.parse(stored));
      } else {
        const mock = buildMockEmails(email);
        setEmails(mock);
        await AsyncStorage.setItem("afumail_emails", JSON.stringify(mock));
      }
    } catch (_) {}
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const saveEmails = useCallback(async (updated: Email[]) => {
    setEmails(updated);
    await AsyncStorage.setItem("afumail_emails", JSON.stringify(updated));
  }, []);

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

  const markAsRead = useCallback(
    (id: string) => {
      const updated = emails.map((e) =>
        e.id === id ? { ...e, read: true } : e
      );
      saveEmails(updated);
    },
    [emails, saveEmails]
  );

  const toggleStar = useCallback(
    (id: string) => {
      const updated = emails.map((e) =>
        e.id === id ? { ...e, starred: !e.starred } : e
      );
      saveEmails(updated);
    },
    [emails, saveEmails]
  );

  const archiveEmail = useCallback(
    (id: string) => {
      const updated = emails.map((e) =>
        e.id === id ? { ...e, folder: "archived" as EmailFolder } : e
      );
      saveEmails(updated);
    },
    [emails, saveEmails]
  );

  const deleteEmail = useCallback(
    (id: string) => {
      const updated = emails.map((e) =>
        e.id === id ? { ...e, folder: "trash" as EmailFolder } : e
      );
      saveEmails(updated);
    },
    [emails, saveEmails]
  );

  const sendEmail = useCallback(
    async (data: ComposeData, fromEmail: string, fromName: string) => {
      const recipients = data.to
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
        .map((r) => ({ name: r.includes("@") ? r.split("@")[0] ?? r : r, email: r }));

      const newEmail: Email = {
        id: generateId(),
        from: { name: fromName, email: fromEmail },
        to: recipients,
        cc: data.cc
          ? data.cc
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean)
              .map((r) => ({ name: r, email: r }))
          : undefined,
        subject: data.subject || "(No Subject)",
        body: data.body,
        preview: data.body.slice(0, 120),
        timestamp: new Date().toISOString(),
        read: true,
        starred: false,
        pinned: false,
        attachments: [],
        category: "primary",
        folder: "sent",
      };
      const updated = [newEmail, ...emails];
      await saveEmails(updated);
    },
    [emails, saveEmails]
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
        toggleStar,
        archiveEmail,
        deleteEmail,
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
