import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import type { Email, EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
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

// Sandboxed iframe for HTML email bodies (web-only)
function HtmlBody({ html }: { html: string }) {
  const iframeRef = useRef<any>(null);
  const [height, setHeight] = useState(300);

  const doc = `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;font-size:14px;line-height:1.65;color:#1C1208;background:#FAF7F2}
      a{color:#2563EB;word-break:break-all}
      img{max-width:100%;height:auto;border-radius:4px}
      p{margin:0 0 12px}
      pre,code{white-space:pre-wrap;font-family:monospace;background:#F3EDE3;padding:12px;border-radius:6px;font-size:13px}
      blockquote{border-left:3px solid #DDD4C4;margin:0;padding-left:16px;color:#5C4E3A}
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
    // @ts-ignore — iframe is a valid DOM element in .web.tsx files
    <iframe
      ref={iframeRef}
      srcDoc={doc}
      sandbox="allow-same-origin"
      scrolling="no"
      style={{ width: "100%", height, border: "none", display: "block" } as any}
    />
  );
}

function ToolbarBtn({
  icon, label, onPress, danger,
}: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
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
      <Feather name={icon} size={14} color={danger ? W.destructive : W.textSecondary} />
      <Text style={[styles.toolbarBtnLabel, { fontFamily: "Inter_500Medium", color: danger ? W.destructive : W.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ReplyChip({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        styles.replyChip,
        { backgroundColor: hovered ? W.bgHover : W.bgCard, borderColor: W.border },
      ]}
    >
      <Feather name={icon} size={13} color={W.textPrimary} />
      <Text style={[styles.replyChipLabel, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]}>{label}</Text>
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
    return (
      <View style={[styles.placeholder, { backgroundColor: W.bg }]}>
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

  return (
    <View style={[styles.root, { backgroundColor: W.bg }]}>
      {/* Toast */}
      {toast && (
        <View style={styles.toast}>
          <Feather name="check" size={13} color="#fff" />
          <Text style={[styles.toastText, { fontFamily: "Inter_500Medium" }]}>{toast}</Text>
        </View>
      )}

      {/* Toolbar */}
      <View style={[styles.topBar, { borderBottomColor: W.border, backgroundColor: W.bg }]}>
        <Pressable onPress={onClose} hitSlop={8} style={[styles.backBtn, { backgroundColor: W.bgSecondary }]}>
          <Feather name="arrow-left" size={15} color={W.textSecondary} />
        </Pressable>
        <View style={styles.toolbarActions}>
          <ToolbarBtn icon={email.starred ? "star" : "star"} label={email.starred ? "Unstar" : "Star"} onPress={handleStar} />
          <ToolbarBtn icon={email.folder === "archived" ? "inbox" : "archive"} label={email.folder === "archived" ? "Move to Inbox" : "Archive"} onPress={handleArchive} />
          <ToolbarBtn icon="mail" label="Mark unread" onPress={handleMarkUnread} />
          <ToolbarBtn icon="trash-2" label="Delete" onPress={handleDelete} danger />
          <View>
            <ToolbarBtn icon="more-horizontal" label="More" onPress={() => setShowMore((v) => !v)} />
            {showMore && (
              <View style={[styles.dropdown, { backgroundColor: W.bgCard, borderColor: W.border }]}>
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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Subject */}
        <Text style={[styles.subject, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>
          {email.subject}
        </Text>

        {/* Category */}
        {email.category && (
          <View style={[styles.catBadge, { backgroundColor: (CATEGORY_COLORS[email.category] ?? W.accent) + "18" }]}>
            <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[email.category] ?? W.accent }]} />
            <Text style={[styles.catLabel, { fontFamily: "Inter_600SemiBold", color: CATEGORY_COLORS[email.category] ?? W.accent }]}>
              {email.category.charAt(0).toUpperCase() + email.category.slice(1)}
            </Text>
          </View>
        )}

        {/* Sender card */}
        <View style={[styles.senderCard, { backgroundColor: W.bgCard, borderColor: W.border }]}>
          <Avatar name={email.from.name} size={42} fontSize={16} />
          <View style={styles.senderMeta}>
            <View style={styles.senderTopRow}>
              <Text style={[styles.senderName, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>
                {email.from.name}
              </Text>
              <Text style={[styles.timestamp, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
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

        {/* Body content */}
        <View style={[styles.bodyWrap, { backgroundColor: W.bgCard, borderColor: W.border }]}>
          {isHtml ? (
            <HtmlBody html={email.body} />
          ) : (
            <Text selectable style={[styles.bodyText, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}>
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
              <View key={att.id} style={[styles.attachCard, { backgroundColor: W.bgCard, borderColor: W.border }]}>
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
                <Pressable style={[styles.downloadBtn, { backgroundColor: W.bgSecondary }]}>
                  <Feather name="download" size={13} color={W.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Reply bar */}
      <View style={[styles.replyBar, { borderTopColor: W.border, backgroundColor: W.bg }]}>
        <ReplyChip icon="corner-up-left" label="Reply" onPress={handleReply} />
        <ReplyChip icon="users" label="Reply All" onPress={handleReplyAll} />
        <ReplyChip icon="corner-up-right" label="Forward" onPress={handleForward} />
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
    paddingHorizontal: 20, paddingVertical: 9,
    borderBottomWidth: 1, gap: 12,
  },
  backBtn: { padding: 7, borderRadius: 7 },
  toolbarActions: { flexDirection: "row", alignItems: "center", gap: 2, flex: 1 },
  toolbarBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
  },
  toolbarBtnLabel: { fontSize: 12 },
  dropdown: {
    position: "absolute", top: 34, right: 0, width: 190,
    borderWidth: 1, borderRadius: 8, zIndex: 100,
    shadowColor: "#1C1208", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, overflow: "hidden",
  },
  dropdownItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemLabel: { fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 28, paddingBottom: 32 },
  subject: { fontSize: 22, lineHeight: 30, letterSpacing: -0.4, marginBottom: 12 },
  catBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 18,
  },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catLabel: { fontSize: 12 },
  senderCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    padding: 16, borderWidth: 1, borderRadius: 10, marginBottom: 16,
  },
  senderMeta: { flex: 1, gap: 3 },
  senderTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  senderName: { fontSize: 15, flex: 1 },
  timestamp: { fontSize: 12, flexShrink: 0 },
  senderEmail: { fontSize: 13 },
  recipientRow: { fontSize: 12, marginTop: 1 },
  bodyWrap: { padding: 20, borderWidth: 1, borderRadius: 10, marginBottom: 16 },
  bodyText: { fontSize: 15, lineHeight: 27 },
  attachSection: { gap: 8 },
  attachHeader: { fontSize: 10, letterSpacing: 1.2, marginBottom: 4 },
  attachCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderWidth: 1, borderRadius: 8,
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
  replyChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  replyChipLabel: { fontSize: 13 },
  toast: {
    position: "absolute", bottom: 80, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 20, backgroundColor: W.textPrimary, zIndex: 999,
  },
  toastText: { color: "#fff", fontSize: 13 },
});
