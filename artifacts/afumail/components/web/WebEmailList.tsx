import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import type { Email, EmailCategory, EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { W } from "./WebSidebar";

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
  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
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
      {/* Unread indicator */}
      <View style={[styles.unreadBar, { backgroundColor: bold ? W.accent : "transparent" }]} />

      {/* Star */}
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); onStar(); }}
        hitSlop={6}
        style={styles.starBtn}
      >
        <Feather
          name="star"
          size={14}
          color={email.starred ? "#F59E0B" : hovered ? W.textMuted : "transparent"}
        />
      </Pressable>

      {/* Avatar */}
      <Avatar name={email.from.name} size={32} fontSize={13} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[styles.sender, { fontFamily: bold ? "Inter_700Bold" : "Inter_400Regular", color: bold ? W.textPrimary : W.textSecondary }]}
            numberOfLines={1}
          >
            {email.from.name}
          </Text>
          <Text style={[styles.date, { fontFamily: bold ? "Inter_600SemiBold" : "Inter_400Regular", color: bold ? W.textSecondary : W.textMuted }]}>
            {formatDate(email.timestamp)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.subject, { fontFamily: bold ? "Inter_600SemiBold" : "Inter_400Regular", color: bold ? W.textPrimary : W.textSecondary }]}
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
            style={styles.actionBtn}
          >
            <Feather name="archive" size={14} color={W.textSecondary} />
          </Pressable>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
            hitSlop={6}
            style={styles.actionBtn}
          >
            <Feather name="trash-2" size={14} color={W.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Attachments indicator */}
      {email.attachments.length > 0 && !hovered && (
        <Feather name="paperclip" size={13} color={W.textMuted} style={styles.clipIcon} />
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
      ? activeTab === "all"
        ? getEmailsByFolder("inbox")
        : getEmailsByCategory(activeTab as EmailCategory)
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

  return (
    <View style={styles.root}>
      {/* Toolbar strip */}
      <View style={[styles.listToolbar, { borderBottomColor: W.border }]}>
        <Pressable onPress={handleRefresh} hitSlop={6} style={styles.refreshBtn}>
          <Feather name="refresh-cw" size={14} color={W.textSecondary} />
        </Pressable>
        <Text style={[styles.listTitle, { fontFamily: "Inter_600SemiBold", color: W.textSecondary }]}>
          {emails.length} {emails.length === 1 ? "message" : "messages"}
        </Text>
      </View>

      {/* Category tabs (inbox only) */}
      {currentFolder === "inbox" && !searchQuery && (
        <View style={[styles.tabs, { borderBottomColor: W.border }]}>
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

      {/* Email rows */}
      {isLoading && emails.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>Loading…</Text>
        </View>
      ) : emails.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={40} color={W.textMuted} />
          <Text style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold", color: W.textSecondary }]}>
            {searchQuery ? "No results found" : "All clear"}
          </Text>
          <Text style={[styles.emptyText, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
            {searchQuery ? `No emails match "${searchQuery}"` : "Nothing here"}
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
  root: {
    width: 340,
    backgroundColor: W.bg,
    borderRightColor: W.border,
    borderRightWidth: 1,
    flexDirection: "column",
  },
  listToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  refreshBtn: { padding: 4, borderRadius: 4 },
  listTitle: { fontSize: 12 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tabLabel: { fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 56,
  },
  unreadBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginLeft: 2,
  },
  starBtn: { padding: 2 },
  content: { flex: 1, gap: 3 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sender: { fontSize: 13, flex: 1 },
  date: { fontSize: 11, flexShrink: 0 },
  bottomRow: { flexDirection: "row", alignItems: "center" },
  subject: { fontSize: 12, flexShrink: 0, maxWidth: 140 },
  preview: { fontSize: 12, flex: 1 },
  hoverActions: { flexDirection: "row", gap: 4 },
  actionBtn: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: W.bgHover,
  },
  clipIcon: { marginRight: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 16 },
  emptyText: { fontSize: 13 },
});
