import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import type { Email, EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { W } from "./webColors";

function formatFull(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function HtmlBody({ html }: { html: string }) {
  const iframeRef = useRef<any>(null);
  const [height, setHeight] = useState(300);

  const doc = `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;font-size:15px;line-height:1.7;color:#111827;background:#FFFFFF}
      a{color:#2563EB;word-break:break-all}
      img{max-width:100%;height:auto;border-radius:4px}
      p{margin:0 0 14px}
      pre,code{white-space:pre-wrap;font-family:monospace;background:#F0F2F5;padding:12px;border-radius:6px;font-size:13px}
      blockquote{border-left:3px solid #E8EAED;margin:0;padding-left:16px;color:#4B5563}
    </style>
  </head><body>${html}</body></html>`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const measure = () => {
      try {
        const h = iframe.contentDocument?.documentElement?.scrollHeight
          ?? iframe.contentDocument?.body?.scrollHeight;
        if (h && h > 0) setHeight(h + 24);
      } catch {}
    };
    iframe.onload = () => setTimeout(measure, 100);
  }, [html]);

  return (
    // @ts-ignore
    <iframe
      ref={iframeRef}
      srcDoc={doc}
      sandbox="allow-same-origin"
      scrolling="no"
      style={{ width: "100%", height, border: "none", display: "block" } as any}
    />
  );
}

// ── Toolbar button — shows label only on desktop ───────────────────────────────

function ToolbarBtn({
  icon, label, onPress, danger, iconOnly,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  iconOnly?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        styles.toolbarBtn,
        { backgroundColor: hovered ? (danger ? W.destructiveLight : W.bgSecondary) : "transparent" },
      ]}
    >
      <Feather name={icon} size={iconOnly ? 18 : 14} color={danger ? W.destructive : W.textSecondary} />
      {!iconOnly && (
        <Text style={[styles.toolbarBtnLabel, {
          fontFamily: "Inter_500Medium",
          color: danger ? W.destructive : W.textSecondary,
        }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function ReplyChip({ icon, label, onPress, isMobile }: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  isMobile?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        isMobile ? styles.replyChipMobile : styles.replyChip,
        { backgroundColor: hovered ? W.bgHover : W.bgSecondary },
        isMobile && { flex: 1 },
      ]}
    >
      <Feather name={icon} size={isMobile ? 16 : 13} color={W.textPrimary} />
      <Text style={[styles.replyChipLabel, {
        fontFamily: "Inter_600SemiBold",
        color: W.textPrimary,
        fontSize: isMobile ? 14 : 13,
      }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const MOVE_FOLDERS: { label: string; folder: EmailFolder; icon: keyof typeof Feather.glyphMap }[] = [
  { label: "Inbox",   folder: "inbox",    icon: "inbox" },
  { label: "Archive", folder: "archived", icon: "archive" },
  { label: "Spam",    folder: "spam",     icon: "alert-octagon" },
  { label: "Trash",   folder: "trash",    icon: "trash-2" },
];

interface Props {
  emailId: string | null;
  onClose: () => void;
  onCompose: (config: { to?: string; subject?: string; body?: string }) => void;
}

export default function WebEmailDetail({ emailId, onClose, onCompose }: Props) {
  const { getEmailById, toggleStar, archiveEmail, deleteEmail, markAsRead, markAsUnread, moveToFolder } = useEmails();
  const { isMobile } = useBreakpoint();
  const [toast, setToast] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const email = emailId ? getEmailById(emailId) : null;

  useEffect(() => {
    if (email && !email.read) markAsRead(email.id);
  }, [email?.id]);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  if (!email) {
    // On mobile this state is never visible (detail only shown when email selected)
    // On desktop show the empty state placeholder
    if (isMobile) return null;
    return (
      <View style={[styles.placeholder, { backgroundColor: W.bgCard }]}>
        <View style={[styles.placeholderIcon, { backgroundColor: W.bgSecondary }]}>
          <Feather name="mail" size={32} color={W.textMuted} />
        </View>
        <Text style={[styles.placeholderTitle, { fontFamily: "Inter_700Bold", color: W.textSecondary }]}>
          Select a message
        </Text>
        <Text style={[styles.placeholderSub, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
          Click any email to read it here
        </Text>
      </View>
    );
  }

  const isHtml = /^\s*</.test(email.body ?? "");

  function handleReply() {
    onCompose({ to: email!.from.email, subject: `Re: ${email!.subject}` });
  }
  function handleReplyAll() {
    const all = [email!.from.email, ...(email!.cc?.map((c) => c.email) ?? [])].join(", ");
    onCompose({ to: all, subject: `Re: ${email!.subject}` });
  }
  function handleForward() {
    const quoted = `\n\n———— Forwarded message ————\nFrom: ${email!.from.name} <${email!.from.email}>\nDate: ${formatFull(email!.timestamp)}\nSubject: ${email!.subject}\n\n${email!.body}`;
    onCompose({ subject: `Fwd: ${email!.subject}`, body: quoted });
  }
  async function handleArchive() {
    await archiveEmail(email!.id);
    notify("Archived");
    onClose();
  }
  async function handleDelete() {
    await deleteEmail(email!.id);
    notify(email!.folder === "trash" ? "Permanently deleted" : "Moved to Trash");
    onClose();
  }
  async function handleStar() {
    await toggleStar(email!.id);
    notify(email!.starred ? "Removed from Starred" : "Added to Starred");
  }
  async function handleMarkUnread() {
    await markAsUnread(email!.id);
    onClose();
  }
  async function handleMove(folder: EmailFolder) {
    await moveToFolder(email!.id, folder);
    notify(`Moved to ${folder}`);
    setShowMore(false);
    onClose();
  }

  const CATEGORY_COLORS: Record<string, string> = {
    primary: "#2563EB", work: "#059669", personal: "#D97706",
    finance: "#7C3AED", shopping: "#EC4899", travel: "#0891B2",
    updates: "#64748B", social: "#F97316",
  };

  const scrollPadding = isMobile ? 16 : 28;

  return (
    <View style={[styles.root, { backgroundColor: W.bgCard }]}>
      {toast && (
        <View style={styles.toast}>
          <Feather name="check" size={13} color="#fff" />
          <Text style={[styles.toastText, { fontFamily: "Inter_500Medium" }]}>{toast}</Text>
        </View>
      )}

      {/* Toolbar */}
      <View style={[styles.topBar, isMobile && styles.topBarMobile, { backgroundColor: W.bgCard }]}>
        {/* Back / close button */}
        <Pressable onPress={onClose} hitSlop={8} style={[styles.backBtn, { backgroundColor: W.bgSecondary }]}>
          <Feather name="arrow-left" size={isMobile ? 18 : 15} color={W.textSecondary} />
        </Pressable>

        <View style={styles.toolbarActions}>
          <ToolbarBtn
            icon={email.starred ? "star" : "star"}
            label={email.starred ? "Unstar" : "Star"}
            onPress={handleStar}
            iconOnly={isMobile}
          />
          <ToolbarBtn
            icon={email.folder === "archived" ? "inbox" : "archive"}
            label={email.folder === "archived" ? "Move to Inbox" : "Archive"}
            onPress={handleArchive}
            iconOnly={isMobile}
          />
          {!isMobile && (
            <ToolbarBtn icon="mail" label="Mark unread" onPress={handleMarkUnread} />
          )}
          <ToolbarBtn
            icon="trash-2"
            label="Delete"
            onPress={handleDelete}
            danger
            iconOnly={isMobile}
          />
          <View>
            <ToolbarBtn
              icon="more-horizontal"
              label="More"
              onPress={() => setShowMore((v) => !v)}
              iconOnly={isMobile}
            />
            {showMore && (
              <View style={[styles.dropdown, { backgroundColor: W.bgCard }]}>
                {isMobile && (
                  <Pressable
                    onPress={() => { handleMarkUnread(); setShowMore(false); }}
                    style={({ pressed }) => [styles.dropdownItem, { backgroundColor: pressed ? W.bgHover : "transparent" }]}
                  >
                    <Feather name="mail" size={13} color={W.textSecondary} />
                    <Text style={[styles.dropdownItemLabel, { fontFamily: "Inter_500Medium", color: W.textPrimary }]}>
                      Mark as unread
                    </Text>
                  </Pressable>
                )}
                {MOVE_FOLDERS.filter((f) => f.folder !== email.folder).map((f) => (
                  <Pressable
                    key={f.folder}
                    onPress={() => handleMove(f.folder)}
                    style={({ pressed }) => [styles.dropdownItem, { backgroundColor: pressed ? W.bgHover : "transparent" }]}
                  >
                    <Feather name={f.icon} size={13} color={W.textSecondary} />
                    <Text style={[styles.dropdownItemLabel, { fontFamily: "Inter_500Medium", color: W.textPrimary }]}>
                      Move to {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Body */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { padding: scrollPadding, paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subject, { fontFamily: "Inter_700Bold", color: W.textPrimary, fontSize: isMobile ? 19 : 22 }]}>
          {email.subject}
        </Text>

        {email.category && (
          <View style={[styles.catBadge, { backgroundColor: (CATEGORY_COLORS[email.category] ?? W.accent) + "18" }]}>
            <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[email.category] ?? W.accent }]} />
            <Text style={[styles.catLabel, { fontFamily: "Inter_600SemiBold", color: CATEGORY_COLORS[email.category] ?? W.accent }]}>
              {email.category.charAt(0).toUpperCase() + email.category.slice(1)}
            </Text>
          </View>
        )}

        {/* Sender card */}
        <View style={[styles.senderCard, isMobile && styles.senderCardMobile, { backgroundColor: W.bgSecondary }]}>
          <Avatar name={email.from.name} size={isMobile ? 36 : 42} fontSize={isMobile ? 14 : 16} />
          <View style={styles.senderMeta}>
            <View style={styles.senderTopRow}>
              <Text style={[styles.senderName, { fontFamily: "Inter_700Bold", color: W.textPrimary, fontSize: isMobile ? 14 : 15 }]}>
                {email.from.name}
              </Text>
              <Text style={[styles.timestamp, { fontFamily: "Inter_400Regular", color: W.textMuted, fontSize: isMobile ? 11 : 12 }]}>
                {formatFull(email.timestamp)}
              </Text>
            </View>
            <Text style={[styles.senderEmail, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>
              &lt;{email.from.email}&gt;
            </Text>
            <Text style={[styles.recipientRow, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
              To: {email.to.map((t) => t.name || t.email).join(", ")}
            </Text>
            {email.cc && email.cc.length > 0 && (
              <Text style={[styles.recipientRow, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
                Cc: {email.cc.map((c) => c.name || c.email).join(", ")}
              </Text>
            )}
          </View>
        </View>

        {/* Email body */}
        <View style={[styles.bodyWrap, { backgroundColor: W.bgCard, padding: isMobile ? 14 : 20 }]}>
          {isHtml ? (
            <HtmlBody html={email.body} />
          ) : (
            <Text selectable style={[styles.bodyText, { fontFamily: "Inter_400Regular", color: W.textPrimary, fontSize: isMobile ? 15 : 15 }]}>
              {email.body}
            </Text>
          )}
        </View>

        {/* Attachments */}
        {email.attachments.length > 0 && (
          <View style={styles.attachSection}>
            <Text style={[styles.attachHeader, { fontFamily: "Inter_600SemiBold", color: W.textMuted }]}>
              {email.attachments.length} ATTACHMENT{email.attachments.length !== 1 ? "S" : ""}
            </Text>
            {email.attachments.map((att) => (
              <View key={att.id} style={[styles.attachCard, { backgroundColor: W.bgSecondary }]}>
                <View style={[styles.attachIconWrap, { backgroundColor: W.accentLight }]}>
                  <Feather name="file-text" size={16} color={W.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.attachName, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]} numberOfLines={1}>
                    {att.name}
                  </Text>
                  <Text style={[styles.attachSize, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
                    {formatSize(att.size)}
                  </Text>
                </View>
                <Pressable style={[styles.downloadBtn, { backgroundColor: W.bgHover }]}>
                  <Feather name="download" size={13} color={W.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Reply bar */}
      <View style={[
        styles.replyBar,
        isMobile && styles.replyBarMobile,
        { borderTopColor: W.borderLight, backgroundColor: W.bgCard },
      ]}>
        <ReplyChip icon="corner-up-left" label="Reply"    onPress={handleReply}    isMobile={isMobile} />
        <ReplyChip icon="users"          label="Reply All" onPress={handleReplyAll} isMobile={isMobile} />
        <ReplyChip icon="corner-up-right" label="Forward" onPress={handleForward}  isMobile={isMobile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "column" },
  placeholder: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 14,
  },
  placeholderIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  placeholderTitle: { fontSize: 18 },
  placeholderSub: { fontSize: 14 },
  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 10,
    gap: 12,
  },
  topBarMobile: {
    paddingHorizontal: 12, paddingVertical: 10,
  },
  backBtn: { padding: 7, borderRadius: 7 },
  toolbarActions: { flexDirection: "row", alignItems: "center", gap: 2, flex: 1 },
  toolbarBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6,
  },
  toolbarBtnLabel: { fontSize: 12 },
  dropdown: {
    position: "absolute", top: 38, right: 0, width: 200,
    borderRadius: 10, zIndex: 100,
    shadowColor: "#111827", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, overflow: "hidden",
  },
  dropdownItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemLabel: { fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: {},
  subject: { lineHeight: 30, letterSpacing: -0.4, marginBottom: 12 },
  catBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 18,
  },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catLabel: { fontSize: 12 },
  senderCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    padding: 16, borderRadius: 12, marginBottom: 16,
  },
  senderCardMobile: {
    gap: 10, padding: 12,
  },
  senderMeta: { flex: 1, gap: 3 },
  senderTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  senderName: { flex: 1 },
  timestamp: { flexShrink: 0 },
  senderEmail: { fontSize: 13 },
  recipientRow: { fontSize: 12, marginTop: 1 },
  bodyWrap: { borderRadius: 12, marginBottom: 16 },
  bodyText: { lineHeight: 27 },
  attachSection: { gap: 8 },
  attachHeader: { fontSize: 10, letterSpacing: 1.2, marginBottom: 4 },
  attachCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 10,
  },
  attachIconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  attachName: { fontSize: 13 },
  attachSize: { fontSize: 11, marginTop: 2 },
  downloadBtn: { padding: 7, borderRadius: 6 },
  replyBar: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 28, paddingVertical: 14,
    borderTopWidth: 1,
  },
  replyBarMobile: {
    paddingHorizontal: 12, paddingVertical: 12, gap: 8,
  },
  replyChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  replyChipMobile: {
    flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center",
    paddingHorizontal: 8, paddingVertical: 12,
    borderRadius: 12,
  },
  replyChipLabel: {},
  toast: {
    position: "absolute", bottom: 80, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 20, backgroundColor: W.textPrimary, zIndex: 999,
  },
  toastText: { color: "#fff", fontSize: 13 },
});
