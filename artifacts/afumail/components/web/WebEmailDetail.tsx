import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import type { Email, EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { W } from "./WebSidebar";

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

const MOVE_FOLDERS: { label: string; folder: EmailFolder; icon: keyof typeof Feather.glyphMap }[] = [
  { label: "Inbox",   folder: "inbox",    icon: "inbox" },
  { label: "Archive", folder: "archived", icon: "archive" },
  { label: "Spam",    folder: "spam",     icon: "alert-octagon" },
  { label: "Trash",   folder: "trash",    icon: "trash-2" },
];

// Renders HTML email bodies inside a sandboxed iframe (web-only)
function HtmlBody({ html }: { html: string }) {
  const iframeRef = useRef<any>(null);
  const [height, setHeight] = useState(300);

  const doc = `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; font-size: 14px; line-height: 1.6; color: #0F172A; }
      a { color: #2563EB; word-break: break-all; }
      img { max-width: 100%; height: auto; }
      p { margin: 0 0 12px; }
      pre { white-space: pre-wrap; font-family: monospace; background: #F8FAFC; padding: 12px; border-radius: 6px; }
    </style>
  </head><body>${html}</body></html>`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const tryMeasure = () => {
      try {
        const h = iframe.contentDocument?.documentElement?.scrollHeight ?? iframe.contentDocument?.body?.scrollHeight;
        if (h && h > 0) setHeight(h + 24);
      } catch {}
    };
    iframe.onload = () => setTimeout(tryMeasure, 80);
  }, [html]);

  return (
    // @ts-ignore — iframe is a valid DOM element in .web.tsx files
    <iframe
      ref={iframeRef}
      srcDoc={doc}
      sandbox="allow-same-origin"
      scrolling="no"
      style={{
        width: "100%",
        height,
        border: "none",
        display: "block",
      } as any}
    />
  );
}

function ActionBtn({ icon, label, onPress, danger }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        styles.actionBtn,
        { backgroundColor: hovered ? (danger ? "#FEF2F2" : W.bgHover) : "transparent" },
      ]}
    >
      <Feather name={icon} size={15} color={danger ? W.destructive : W.textSecondary} />
      <Text style={[styles.actionBtnLabel, { fontFamily: "Inter_500Medium", color: danger ? W.destructive : W.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ReplyBtn({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[styles.replyBtn, { backgroundColor: hovered ? W.bgHover : W.bgSecondary, borderColor: W.border }]}
    >
      <Feather name={icon} size={14} color={W.textPrimary} />
      <Text style={[styles.replyBtnLabel, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

interface Props {
  emailId: string | null;
  onClose: () => void;
  onCompose: (config: { to?: string; subject?: string; body?: string }) => void;
}

export default function WebEmailDetail({ emailId, onClose, onCompose }: Props) {
  const {
    getEmailById, toggleStar, archiveEmail, deleteEmail,
    markAsRead, markAsUnread, moveToFolder,
  } = useEmails();

  const [toast, setToast] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const email = emailId ? getEmailById(emailId) : null;

  useEffect(() => {
    if (email && !email.read) markAsRead(email.id);
  }, [email?.id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  if (!email) {
    return (
      <View style={[styles.placeholder, { backgroundColor: W.bgSecondary }]}>
        <Feather name="mail" size={48} color={W.textMuted} />
        <Text style={[styles.placeholderTitle, { fontFamily: "Inter_600SemiBold", color: W.textSecondary }]}>
          Select an email
        </Text>
        <Text style={[styles.placeholderSub, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
          Choose a message from the list to read it here
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
    const quoted = `\n\n---------- Forwarded Message ----------\nFrom: ${email!.from.name} <${email!.from.email}>\nDate: ${formatFull(email!.timestamp)}\nSubject: ${email!.subject}\n\n${email!.body}`;
    onCompose({ subject: `Fwd: ${email!.subject}`, body: quoted });
  }
  async function handleArchive() {
    await archiveEmail(email!.id);
    showToast("Archived");
    onClose();
  }
  async function handleDelete() {
    await deleteEmail(email!.id);
    showToast(email!.folder === "trash" ? "Permanently deleted" : "Moved to Trash");
    onClose();
  }
  async function handleStar() {
    await toggleStar(email!.id);
    showToast(email!.starred ? "Removed from starred" : "Added to starred");
  }
  async function handleMarkUnread() {
    await markAsUnread(email!.id);
    onClose();
  }
  async function handleMove(folder: EmailFolder) {
    await moveToFolder(email!.id, folder);
    showToast(`Moved to ${folder}`);
    setShowMore(false);
    onClose();
  }

  return (
    <View style={[styles.root, { backgroundColor: W.bg }]}>
      {/* Toast */}
      {toast && (
        <View style={styles.toast}>
          <Feather name="check" size={13} color="#fff" />
          <Text style={[styles.toastText, { fontFamily: "Inter_500Medium" }]}>{toast}</Text>
        </View>
      )}

      {/* Top toolbar */}
      <View style={[styles.toolbar, { borderBottomColor: W.border }]}>
        <Pressable onPress={onClose} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={16} color={W.textSecondary} />
        </Pressable>
        <View style={styles.toolbarActions}>
          <ActionBtn icon="star" label={email.starred ? "Unstar" : "Star"} onPress={handleStar} />
          <ActionBtn icon={email.folder === "archived" ? "inbox" : "archive"} label={email.folder === "archived" ? "Unarchive" : "Archive"} onPress={handleArchive} />
          <ActionBtn icon="trash-2" label="Delete" onPress={handleDelete} danger />
          <ActionBtn icon="mail" label="Mark unread" onPress={handleMarkUnread} />
          <View>
            <ActionBtn icon="more-horizontal" label="More" onPress={() => setShowMore((v) => !v)} />
            {showMore && (
              <View style={[styles.dropdown, { backgroundColor: W.bg, borderColor: W.border }]}>
                {MOVE_FOLDERS.filter((f) => f.folder !== email.folder).map((f) => (
                  <Pressable
                    key={f.folder}
                    onPress={() => handleMove(f.folder)}
                    style={({ pressed }) => [styles.dropdownRow, { backgroundColor: pressed ? W.bgHover : "transparent" }]}
                  >
                    <Feather name={f.icon} size={14} color={W.textSecondary} />
                    <Text style={[styles.dropdownLabel, { fontFamily: "Inter_500Medium", color: W.textPrimary }]}>
                      Move to {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Scrollable body */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Subject */}
        <Text style={[styles.subject, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>
          {email.subject}
        </Text>

        {/* Category badge */}
        {email.category && (
          <View style={[styles.categoryBadge, { backgroundColor: W.bgSelected }]}>
            <Text style={[styles.categoryLabel, { fontFamily: "Inter_500Medium", color: W.accent }]}>
              {email.category.charAt(0).toUpperCase() + email.category.slice(1)}
            </Text>
          </View>
        )}

        {/* Sender card */}
        <View style={[styles.senderCard, { borderColor: W.border }]}>
          <Avatar name={email.from.name} size={40} fontSize={15} />
          <View style={styles.senderInfo}>
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
            <Text style={[styles.recipientLine, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
              To: {email.to.map((t) => t.name || t.email).join(", ")}
            </Text>
            {email.cc && email.cc.length > 0 && (
              <Text style={[styles.recipientLine, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
                Cc: {email.cc.map((c) => c.name || c.email).join(", ")}
              </Text>
            )}
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
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
          <View style={[styles.attachments, { borderTopColor: W.border }]}>
            <Text style={[styles.attachTitle, { fontFamily: "Inter_600SemiBold", color: W.textMuted }]}>
              {email.attachments.length} Attachment{email.attachments.length !== 1 ? "s" : ""}
            </Text>
            {email.attachments.map((att) => (
              <View key={att.id} style={[styles.attachCard, { backgroundColor: W.bgSecondary, borderColor: W.border }]}>
                <Feather name="file-text" size={16} color={W.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.attachName, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]} numberOfLines={1}>
                    {att.name}
                  </Text>
                  <Text style={[styles.attachSize, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
                    {formatSize(att.size)}
                  </Text>
                </View>
                <Feather name="download" size={14} color={W.textSecondary} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Reply bar */}
      <View style={[styles.replyBar, { borderTopColor: W.border, backgroundColor: W.bg }]}>
        <ReplyBtn icon="corner-up-left" label="Reply" onPress={handleReply} />
        <ReplyBtn icon="corner-up-left" label="Reply All" onPress={handleReplyAll} />
        <ReplyBtn icon="corner-up-right" label="Forward" onPress={handleForward} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "column" },
  placeholder: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 12,
  },
  placeholderTitle: { fontSize: 18 },
  placeholderSub: { fontSize: 14 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { padding: 6, borderRadius: 6 },
  toolbarActions: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
  },
  actionBtnLabel: { fontSize: 12 },
  dropdown: {
    position: "absolute",
    top: 34,
    right: 0,
    width: 180,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  dropdownRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  dropdownLabel: { fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 40 },
  subject: { fontSize: 22, lineHeight: 30, letterSpacing: -0.4, marginBottom: 10 },
  categoryBadge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 16,
  },
  categoryLabel: { fontSize: 12 },
  senderCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 24,
  },
  senderInfo: { flex: 1, gap: 3 },
  senderTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  senderName: { fontSize: 15, flex: 1 },
  timestamp: { fontSize: 12, flexShrink: 0 },
  senderEmail: { fontSize: 13 },
  recipientLine: { fontSize: 12, marginTop: 1 },
  body: { marginBottom: 24 },
  bodyText: { fontSize: 15, lineHeight: 26 },
  attachments: { borderTopWidth: 1, paddingTop: 20, gap: 8 },
  attachTitle: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  attachCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderWidth: 1, borderRadius: 8,
  },
  attachName: { fontSize: 13 },
  attachSize: { fontSize: 11, marginTop: 2 },
  replyBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  replyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  replyBtnLabel: { fontSize: 13 },
  toast: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#0F172A",
    zIndex: 999,
  },
  toastText: { color: "#fff", fontSize: 13 },
});
