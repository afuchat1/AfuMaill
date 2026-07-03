import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import type { EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";

export const W = {
  sidebarBg: "#0F172A",
  sidebarHover: "#1E293B",
  sidebarActive: "#1D3461",
  sidebarBorder: "#1E293B",
  sidebarText: "#94A3B8",
  sidebarTextActive: "#F1F5F9",
  accent: "#2563EB",
  accentHover: "#1D4ED8",
  bg: "#FFFFFF",
  bgSecondary: "#F8FAFC",
  bgHover: "#F1F5F9",
  bgSelected: "#EFF6FF",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  destructive: "#EF4444",
  success: "#10B981",
};

const FOLDERS: { key: EmailFolder; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "inbox",    label: "Inbox",   icon: "inbox" },
  { key: "starred",  label: "Starred", icon: "star" },
  { key: "sent",     label: "Sent",    icon: "send" },
  { key: "drafts",   label: "Drafts",  icon: "file-text" },
  { key: "archived", label: "Archive", icon: "archive" },
  { key: "spam",     label: "Spam",    icon: "alert-octagon" },
  { key: "trash",    label: "Trash",   icon: "trash-2" },
];

interface Props {
  currentFolder: EmailFolder;
  onSelectFolder: (folder: EmailFolder) => void;
  onCompose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

function FolderRow({
  item, active, onPress, count,
}: { item: typeof FOLDERS[0]; active: boolean; onPress: () => void; count: number }) {
  const [hovered, setHovered] = useState(false);
  const bg = active ? W.sidebarActive : hovered ? W.sidebarHover : "transparent";
  const color = active ? W.sidebarTextActive : W.sidebarText;
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[styles.folderRow, { backgroundColor: bg }]}
    >
      <Feather name={item.icon} size={15} color={color} />
      <Text style={[styles.folderLabel, { color, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
        {item.label}
      </Text>
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: active ? W.accent : W.sidebarHover }]}>
          <Text style={[styles.badgeText, { color: active ? "#fff" : W.sidebarText, fontFamily: "Inter_600SemiBold" }]}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function WebSidebar({ currentFolder, onSelectFolder, onCompose, searchQuery, onSearchChange }: Props) {
  const { user, logout } = useAuth();
  const { getEmailsByFolder, unreadCount } = useEmails();
  const [profileHovered, setProfileHovered] = useState(false);
  const [logoutHovered, setLogoutHovered] = useState(false);

  return (
    <View style={styles.root}>
      {/* Brand */}
      <View style={styles.brand}>
        <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.brandName, { fontFamily: "Inter_700Bold" }]}>AfuMail</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={14} color={W.sidebarText} style={styles.searchIcon} />
        <input
          value={searchQuery}
          onChange={(e: any) => onSearchChange(e.target.value)}
          placeholder="Search mail…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#F1F5F9",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            paddingLeft: 0,
          } as any}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => onSearchChange("")} hitSlop={6}>
            <Feather name="x" size={13} color={W.sidebarText} />
          </Pressable>
        )}
      </View>

      {/* Compose */}
      <Pressable
        onPress={onCompose}
        style={({ pressed }) => [styles.composeBtn, { opacity: pressed ? 0.88 : 1 }]}
      >
        <Feather name="edit-2" size={14} color="#fff" />
        <Text style={[styles.composeBtnLabel, { fontFamily: "Inter_600SemiBold" }]}>New Message</Text>
      </Pressable>

      {/* Folders */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>FOLDERS</Text>
      </View>
      <ScrollView style={styles.folderList} showsVerticalScrollIndicator={false}>
        {FOLDERS.map((f) => {
          const emails = getEmailsByFolder(f.key);
          const count =
            f.key === "inbox" ? unreadCount :
            f.key === "drafts" ? emails.length :
            emails.filter((e) => !e.read).length;
          return (
            <FolderRow
              key={f.key}
              item={f}
              active={currentFolder === f.key}
              onPress={() => onSelectFolder(f.key)}
              count={count}
            />
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: W.sidebarBorder }]}>
        <Pressable
          onPointerEnter={() => setProfileHovered(true)}
          onPointerLeave={() => setProfileHovered(false)}
          style={[styles.profileRow, profileHovered && { backgroundColor: W.sidebarHover }]}
        >
          {user && <Avatar name={user.name} size={30} fontSize={12} />}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {user?.name ?? ""}
            </Text>
            <Text style={[styles.profileEmail, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {user?.username}@afuchat.com
            </Text>
          </View>
          <Pressable
            onPointerEnter={() => setLogoutHovered(true)}
            onPointerLeave={() => setLogoutHovered(false)}
            onPress={logout}
            hitSlop={6}
            style={{ padding: 4, borderRadius: 4, backgroundColor: logoutHovered ? W.sidebarActive : "transparent" }}
          >
            <Feather name="log-out" size={14} color={W.sidebarText} />
          </Pressable>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 240,
    backgroundColor: W.sidebarBg,
    flexDirection: "column",
    borderRightColor: W.sidebarBorder,
    borderRightWidth: 1,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  logo: { width: 22, height: 22 },
  brandName: { fontSize: 16, color: "#F1F5F9", letterSpacing: -0.3 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: W.sidebarHover,
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  searchIcon: {},
  composeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 16,
    backgroundColor: W.accent,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  composeBtnLabel: { color: "#fff", fontSize: 13 },
  sectionHeader: { paddingHorizontal: 18, marginBottom: 4 },
  sectionLabel: { fontSize: 10, color: W.sidebarText, letterSpacing: 1 },
  folderList: { flex: 1, paddingHorizontal: 8 },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    marginBottom: 1,
  },
  folderLabel: { flex: 1, fontSize: 13 },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: { fontSize: 11 },
  footer: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 12, color: "#F1F5F9" },
  profileEmail: { fontSize: 11, color: W.sidebarText, marginTop: 1 },
});
