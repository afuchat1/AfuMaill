import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

function formatFullDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ATTACHMENT_ICONS: Record<string, string> = {
  pdf: "file-text",
  doc: "file-text",
  docx: "file-text",
  xls: "bar-chart-2",
  xlsx: "bar-chart-2",
  png: "image",
  jpg: "image",
  jpeg: "image",
  mp4: "video",
  mp3: "music",
  zip: "archive",
};

const MOVE_FOLDERS: { label: string; folder: EmailFolder; icon: string }[] = [
  { label: "Inbox", folder: "inbox", icon: "inbox" },
  { label: "Archive", folder: "archived", icon: "archive" },
  { label: "Spam", folder: "spam", icon: "alert-octagon" },
  { label: "Trash", folder: "trash", icon: "trash-2" },
];

export default function EmailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getEmailById, toggleStar, archiveEmail, deleteEmail, markAsRead, markAsUnread, moveToFolder } = useEmails();

  const email = getEmailById(id ?? "");

  const [actionsVisible, setActionsVisible] = useState(false);
  const [moveVisible, setMoveVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (email && !email.read) markAsRead(email.id);
  }, [email?.id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  if (!email) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center" }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  function handleReply() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/email/compose", params: { to: email!.from.email, subject: `Re: ${email!.subject}` } });
  }

  function handleReplyAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const allRecipients = [email!.from.email, ...(email!.cc?.map((c) => c.email) ?? [])].join(", ");
    router.push({ pathname: "/email/compose", params: { to: allRecipients, subject: `Re: ${email!.subject}` } });
  }

  function handleForward() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const quoted = `\n\n---------- Forwarded Message ----------\nFrom: ${email!.from.name} <${email!.from.email}>\nDate: ${formatFullDate(email!.timestamp)}\nSubject: ${email!.subject}\n\n${email!.body}`;
    router.push({ pathname: "/email/compose", params: { subject: `Fwd: ${email!.subject}`, body: quoted } });
  }

  async function handleStar() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleStar(email!.id);
    showToast(email!.starred ? "Removed from Starred" : "Added to Starred");
  }

  async function handleArchive() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await archiveEmail(email!.id);
    showToast("Archived");
    router.back();
  }

  async function handleDelete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteEmail(email!.id);
    showToast(email!.folder === "trash" ? "Permanently deleted" : "Moved to Trash");
    router.back();
  }

  async function handleMarkUnread() {
    await markAsUnread(email!.id);
    setActionsVisible(false);
    showToast("Marked as unread");
    setTimeout(() => router.back(), 700);
  }

  async function handleMoveToFolder(folder: EmailFolder) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await moveToFolder(email!.id, folder);
    setMoveVisible(false);
    setActionsVisible(false);
    const label = MOVE_FOLDERS.find((f) => f.folder === folder)?.label ?? folder;
    showToast(`Moved to ${label}`);
    setTimeout(() => router.back(), 700);
  }

  async function handleShare() {
    setActionsVisible(false);
    try {
      await Share.share({
        title: email!.subject,
        message: `${email!.subject}\n\nFrom: ${email!.from.name} <${email!.from.email}>\n\n${email!.body}`,
      });
    } catch {}
  }

  const isWeb = Platform.OS === "web";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Toast */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: colors.foreground }]}>
          <Feather name="check" size={14} color={colors.background} />
          <Text style={[styles.toastText, { color: colors.background, fontFamily: "Inter_500Medium" }]}>{toast}</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable onPress={handleStar} hitSlop={8}>
            <Feather name={email.starred ? "star" : "star"} size={20} color={email.starred ? "#F59E0B" : colors.mutedForeground} fill={email.starred ? "#F59E0B" : "none"} />
          </Pressable>
          <Pressable onPress={handleArchive} hitSlop={8}>
            <Feather name="archive" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Feather name="trash-2" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActionsVisible(true); }} hitSlop={8}>
            <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* Subject */}
        <View style={styles.subjectSection}>
          <Text style={[styles.subject, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {email.subject}
          </Text>
          <View style={styles.badgeRow}>
            {email.category && (
              <View style={[styles.categoryBadge, { backgroundColor: colors.accent + "18" }]}>
                <Text style={[styles.categoryText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                  {email.category.charAt(0).toUpperCase() + email.category.slice(1)}
                </Text>
              </View>
            )}
            {!email.read && (
              <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
            )}
          </View>
        </View>

        {/* Sender info */}
        <View style={[styles.senderSection, { borderBottomColor: colors.border }]}>
          <Avatar name={email.from.name} size={44} fontSize={15} />
          <View style={styles.senderInfo}>
            <View style={styles.senderTopRow}>
              <Text style={[styles.senderName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {email.from.name}
              </Text>
              <Text style={[styles.timestamp, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {formatFullDate(email.timestamp)}
              </Text>
            </View>
            <Text style={[styles.senderEmail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {email.from.email}
            </Text>
            <Text style={[styles.recipientLine, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              To: {email.to.map((t) => t.name || t.email).join(", ")}
            </Text>
            {email.cc && email.cc.length > 0 && (
              <Text style={[styles.recipientLine, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Cc: {email.cc.map((c) => c.name || c.email).join(", ")}
              </Text>
            )}
          </View>
        </View>

        {/* Body */}
        <View style={styles.bodySection}>
          <Text style={[styles.body, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
            {email.body}
          </Text>
        </View>

        {/* Attachments */}
        {email.attachments.length > 0 && (
          <View style={[styles.attachmentsSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.attachTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              {email.attachments.length} Attachment{email.attachments.length > 1 ? "s" : ""}
            </Text>
            {email.attachments.map((att) => {
              const fileExt = att.name.split(".").pop()?.toLowerCase() ?? "";
              const icon = ATTACHMENT_ICONS[fileExt] ?? "file";
              return (
                <Pressable
                  key={att.id}
                  style={({ pressed }) => [styles.attachmentCard, { backgroundColor: pressed ? colors.secondary : colors.muted, borderColor: colors.border }]}
                >
                  <View style={[styles.attachIconWrap, { backgroundColor: colors.accent + "18" }]}>
                    <Feather name={icon as any} size={18} color={colors.accent} />
                  </View>
                  <View style={styles.attachInfo}>
                    <Text style={[styles.attachName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                      {att.name}
                    </Text>
                    <Text style={[styles.attachSize, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {formatFileSize(att.size)}
                    </Text>
                  </View>
                  <Pressable style={[styles.downloadBtn, { backgroundColor: colors.accent + "18" }]}>
                    <Feather name="download" size={14} color={colors.accent} />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Reply bar */}
      <View style={[styles.replyBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={handleReply}
          style={({ pressed }) => [styles.replyButton, { backgroundColor: pressed ? colors.accent + "22" : colors.muted, borderColor: colors.border }]}
        >
          <Feather name="corner-up-left" size={15} color={colors.foreground} />
          <Text style={[styles.replyBtnText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Reply</Text>
        </Pressable>

        <Pressable
          onPress={handleReplyAll}
          style={({ pressed }) => [styles.replyButton, { backgroundColor: pressed ? colors.accent + "22" : colors.muted, borderColor: colors.border }]}
        >
          <Feather name="corner-up-left" size={15} color={colors.foreground} />
          <Text style={[styles.replyBtnText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Reply All</Text>
        </Pressable>

        <Pressable
          onPress={handleForward}
          style={({ pressed }) => [styles.replyButton, { backgroundColor: pressed ? colors.accent + "22" : colors.muted, borderColor: colors.border }]}
        >
          <Feather name="corner-up-right" size={15} color={colors.foreground} />
          <Text style={[styles.replyBtnText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Forward</Text>
        </Pressable>
      </View>

      {/* ── More Actions Sheet ── */}
      <BottomSheet visible={actionsVisible} onClose={() => setActionsVisible(false)}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>More Actions</Text>

          {[
            { icon: "mail", label: "Mark as Unread", onPress: handleMarkUnread },
            { icon: "folder", label: "Move to Folder", onPress: () => { setActionsVisible(false); setTimeout(() => setMoveVisible(true), 320); } },
            { icon: "corner-up-right", label: "Forward", onPress: () => { setActionsVisible(false); handleForward(); } },
            { icon: "share-2", label: "Share Email", onPress: handleShare },
            { icon: "alert-octagon", label: "Report as Spam", onPress: () => handleMoveToFolder("spam"), danger: true },
          ].map((action, idx) => (
            <Pressable
              key={idx}
              onPress={action.onPress}
              style={({ pressed }) => [styles.sheetRow, { backgroundColor: pressed ? colors.secondary : "transparent" }]}
            >
              <View style={[styles.sheetIconWrap, { backgroundColor: ("danger" in action && action.danger) ? colors.destructive + "18" : colors.secondary }]}>
                <Feather name={action.icon as any} size={16} color={("danger" in action && action.danger) ? colors.destructive : colors.foreground} />
              </View>
              <Text style={[styles.sheetLabel, { color: ("danger" in action && action.danger) ? colors.destructive : colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {action.label}
              </Text>
              <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
            </Pressable>
          ))}

          <Pressable
            onPress={() => setActionsVisible(false)}
            style={[styles.sheetCancel, { backgroundColor: colors.secondary, marginTop: 4 }]}
          >
            <Text style={[styles.sheetCancelText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Cancel</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* ── Move to Folder Sheet ── */}
      <BottomSheet visible={moveVisible} onClose={() => setMoveVisible(false)}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Move to Folder</Text>

          {MOVE_FOLDERS.filter((f) => f.folder !== email.folder).map((f) => (
            <Pressable
              key={f.folder}
              onPress={() => handleMoveToFolder(f.folder)}
              style={({ pressed }) => [styles.sheetRow, { backgroundColor: pressed ? colors.secondary : "transparent" }]}
            >
              <View style={[styles.sheetIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name={f.icon as any} size={16} color={colors.foreground} />
              </View>
              <Text style={[styles.sheetLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {f.label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={() => setMoveVisible(false)}
            style={[styles.sheetCancel, { backgroundColor: colors.secondary, marginTop: 4 }]}
          >
            <Text style={[styles.sheetCancelText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Cancel</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 22 },
  scroll: { flex: 1 },
  subjectSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, gap: 8 },
  subject: { fontSize: 22, lineHeight: 30, letterSpacing: -0.3 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  categoryText: { fontSize: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  senderSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  senderInfo: { flex: 1, gap: 3 },
  senderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  senderName: { fontSize: 15, flex: 1 },
  timestamp: { fontSize: 12, flexShrink: 0 },
  senderEmail: { fontSize: 13 },
  recipientLine: { fontSize: 12, marginTop: 1 },
  bodySection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  body: { fontSize: 16, lineHeight: 27, letterSpacing: 0.1 },
  attachmentsSection: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 10, paddingBottom: 8 },
  attachTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  attachIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  attachInfo: { flex: 1, gap: 2 },
  attachName: { fontSize: 14 },
  attachSize: { fontSize: 12 },
  downloadBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  replyBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  replyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    gap: 5,
  },
  replyBtnText: { fontSize: 13 },
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 999,
  },
  toastText: { fontSize: 13 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 32,
    gap: 2,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, letterSpacing: -0.3, marginBottom: 12 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 14,
  },
  sheetIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sheetLabel: { flex: 1, fontSize: 15 },
  sheetCancel: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  sheetCancelText: { fontSize: 15 },
});
