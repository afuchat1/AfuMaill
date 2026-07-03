import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import type { Email, EmailCategory, EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { W } from "./webColors";

const INBOX_TABS: { label: string; category: EmailCategory | "all" }[] = [
  { label: "Primary",  category: "primary" },
  { label: "Work",     category: "work" },
  { label: "Personal", category: "personal" },
  { label: "Finance",  category: "finance" },
  { label: "Shopping", category: "shopping" },
  { label: "Travel",   category: "travel" },
  { label: "Updates",  category: "updates" },
  { label: "Social",   category: "social" },
];

function formatDate(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface RowProps {
  email: Email;
  selected: boolean;
  onSelect: () => void;
  onStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function EmailRow({ email, selected, onSelect, onStar, onArchive, onDelete }: RowProps) {
  const [hovered, setHovered] = useState(false);
  const bg = selected ? W.bgSelected : hovered ? W.bgHover : W.bg;
  const bold = !email.read;

  return (
    <Pressable
      onPress={onSelect}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[styles.row, { backgroundColor: bg, borderBottomColor: W.border }]}
    >
      {/* Unread dot */}
      <View style={[styles.unreadDot, { backgroundColor: bold ? W.accent : "transparent" }]} />

      {/* Star */}
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); onStar(); }}
        hitSlop={8}
        style={styles.starBtn}
      >
        <Feather
          name="star"
          size={14}
          color={email.starred ? "#D97706" : hovered ? W.textMuted : "transparent"}
        />
      </Pressable>

      {/* Sender avatar */}
      <Avatar name={email.from.name} size={32} fontSize={13} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text
            style={[styles.sender, {
              fontFamily: bold ? "Inter_700Bold" : "Inter_500Medium",
              color: bold ? W.textPrimary : W.textSecondary,
            }]}
            numberOfLines={1}
          >
            {email.from.name}
          </Text>
          <Text style={[styles.date, {
            fontFamily: bold ? "Inter_600SemiBold" : "Inter_400Regular",
            color: bold ? W.textSecondary : W.textMuted,
          }]}>
            {formatDate(email.timestamp)}
          </Text>
        </View>
        <View style={styles.bottomLine}>
          <Text
            style={[styles.subject, {
              fontFamily: bold ? "Inter_600SemiBold" : "Inter_400Regular",
              color: bold ? W.textPrimary : W.textSecondary,
            }]}
            numberOfLines={1}
          >
            {email.subject}
          </Text>
          <Text style={[styles.preview, { fontFamily: "Inter_400Regular", color: W.textMuted }]} numberOfLines={1}>
            {" — "}{email.preview}
          </Text>
        </View>
      </View>

      {/* Hover actions */}
      {hovered && (
        <View style={styles.hoverActions}>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onArchive(); }}
            hitSlop={6}
            style={[styles.hoverBtn, { backgroundColor: W.bgSecondary }]}
          >
            <Feather name="archive" size={13} color={W.textSecondary} />
          </Pressable>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
            hitSlop={6}
            style={[styles.hoverBtn, { backgroundColor: W.bgSecondary }]}
          >
            <Feather name="trash-2" size={13} color={W.destructive} />
          </Pressable>
        </View>
      )}

      {/* Attachment indicator */}
      {email.attachments.length > 0 && !hovered && (
        <Feather name="paperclip" size={12} color={W.textMuted} />
      )}
    </Pressable>
  );
}

interface Props {
  currentFolder: EmailFolder;
  selectedId: string | null;
  onSelectEmail: (id: string) => void;
  searchQuery: string;
}

export default function WebEmailList({ currentFolder, selectedId, onSelectEmail, searchQuery }: Props) {
  const { getEmailsByFolder, getEmailsByCategory, toggleStar, archiveEmail, deleteEmail, isLoading, refreshEmails } = useEmails();
  const [activeTab, setActiveTab] = useState<EmailCategory | "all">("primary");
  const [refreshing, setRefreshing] = useState(false);

  let emails =
    currentFolder === "inbox"
      ? (activeTab === "all" ? getEmailsByFolder("inbox") : getEmailsByCategory(activeTab as EmailCategory))
      : getEmailsByFolder(currentFolder);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    emails = emails.filter(
      (e) =>
        e.subject.toLowerCase().includes(q) ||
        e.from.name.toLowerCase().includes(q) ||
        e.from.email.toLowerCase().includes(q) ||
        e.preview.toLowerCase().includes(q)
    );
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshEmails();
    setRefreshing(false);
  }

  const FOLDER_LABELS: Record<EmailFolder, string> = {
    inbox: "Inbox", starred: "Starred", sent: "Sent", drafts: "Drafts",
    archived: "Archive", spam: "Spam", trash: "Trash",
  };

  return (
    <View style={[styles.root, { backgroundColor: W.bg }]}>
      {/* List toolbar */}
      <View style={[styles.toolbar, { borderBottomColor: W.border, backgroundColor: W.bg }]}>
        <Text style={[styles.folderTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>
          {FOLDER_LABELS[currentFolder] ?? "Inbox"}
        </Text>
        <View style={styles.toolbarRight}>
          <Text style={[styles.count, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
            {emails.length} {emails.length === 1 ? "message" : "messages"}
          </Text>
          <Pressable onPress={handleRefresh} hitSlop={8} style={[styles.refreshBtn, { backgroundColor: W.bgSecondary }]}>
            <Feather name="refresh-cw" size={13} color={W.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Category tabs (inbox only) */}
      {currentFolder === "inbox" && !searchQuery && (
        <View style={[styles.tabs, { borderBottomColor: W.border, backgroundColor: W.bg }]}>
          {INBOX_TABS.map((tab) => {
            const active = activeTab === tab.category;
            return (
              <Pressable
                key={tab.category}
                onPress={() => setActiveTab(tab.category)}
                style={[styles.tab, active && { borderBottomColor: W.accent, borderBottomWidth: 2 }]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? W.accent : W.textSecondary, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Email list */}
      {isLoading && emails.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>Loading…</Text>
        </View>
      ) : emails.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: W.bgSecondary }]}>
            <Feather name="inbox" size={28} color={W.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { fontFamily: "Inter_700Bold", color: W.textSecondary }]}>
            {searchQuery ? "No results" : "All clear"}
          </Text>
          <Text style={[styles.emptyText, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
            {searchQuery ? `Nothing matches "${searchQuery}"` : "No messages here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={emails}
          keyExtractor={(e) => e.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EmailRow
              email={item}
              selected={item.id === selectedId}
              onSelect={() => onSelectEmail(item.id)}
              onStar={() => toggleStar(item.id)}
              onArchive={() => archiveEmail(item.id)}
              onDelete={() => deleteEmail(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: 340, flexDirection: "column", borderRightColor: W.border, borderRightWidth: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  folderTitle: { fontSize: 15 },
  toolbarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  count: { fontSize: 12 },
  refreshBtn: { padding: 6, borderRadius: 6 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  tab: { paddingHorizontal: 10, paddingVertical: 9 },
  tabLabel: { fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 58,
  },
  unreadDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 6, flexShrink: 0 },
  starBtn: { padding: 2, flexShrink: 0 },
  content: { flex: 1, gap: 4 },
  topLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  sender: { fontSize: 13, flex: 1 },
  date: { fontSize: 11, flexShrink: 0 },
  bottomLine: { flexDirection: "row", alignItems: "center" },
  subject: { fontSize: 12, flexShrink: 0, maxWidth: 130 },
  preview: { fontSize: 12, flex: 1 },
  hoverActions: { flexDirection: "row", gap: 4 },
  hoverBtn: { padding: 6, borderRadius: 6 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15 },
  emptyText: { fontSize: 13 },
});
