import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import type { EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { W } from "./webColors";

export type CurrentView = EmailFolder | "profile" | "security" | "sessions";

const MAIL_FOLDERS: { key: EmailFolder; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "inbox",    label: "Inbox",   icon: "inbox" },
  { key: "starred",  label: "Starred", icon: "star" },
  { key: "sent",     label: "Sent",    icon: "send" },
  { key: "drafts",   label: "Drafts",  icon: "file-text" },
  { key: "archived", label: "Archive", icon: "archive" },
  { key: "spam",     label: "Spam",    icon: "alert-octagon" },
  { key: "trash",    label: "Trash",   icon: "trash-2" },
];

const ACCOUNT_ITEMS: { key: CurrentView; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "profile",  label: "Profile",           icon: "user" },
  { key: "security", label: "Security",           icon: "shield" },
  { key: "sessions", label: "Sessions & Devices", icon: "monitor" },
];

interface SidebarRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
}

function SidebarRow({ icon, label, active, onPress, badge }: SidebarRowProps) {
  const [hovered, setHovered] = useState(false);
  const bg = active ? W.sidebarActive : hovered ? W.sidebarHover : "transparent";
  const color = active ? W.accent : hovered ? W.textPrimary : W.sidebarText;
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[styles.row, { backgroundColor: bg }]}
    >
      <Feather name={icon} size={14} color={color} />
      <Text style={[styles.rowLabel, { color, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: active ? W.accentLight : W.bgSecondary }]}>
          <Text style={[styles.badgeText, { color: active ? W.accent : W.textSecondary, fontFamily: "Inter_700Bold" }]}>
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

interface Props {
  currentView: CurrentView;
  onSelectView: (view: CurrentView) => void;
  onCompose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function WebSidebar({ currentView, onSelectView, onCompose, searchQuery, onSearchChange }: Props) {
  const { user, logout } = useAuth();
  const { getEmailsByFolder, unreadCount } = useEmails();
  const [profileHovered, setProfileHovered] = useState(false);
  const [logoutHovered, setLogoutHovered] = useState(false);

  return (
    <View style={styles.root}>
      {/* Brand header */}
      <View style={styles.brand}>
        <View style={styles.brandTop}>
          <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brandName, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>AfuMail</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: W.bgSecondary }]}>
        <Feather name="search" size={13} color={W.sidebarText} />
        <input
          value={searchQuery}
          onChange={(e: any) => onSearchChange(e.target.value)}
          placeholder="Search mail…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: W.textPrimary,
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
          } as any}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => onSearchChange("")} hitSlop={6}>
            <Feather name="x" size={12} color={W.sidebarText} />
          </Pressable>
        )}
      </View>

      {/* Compose */}
      <Pressable
        onPress={onCompose}
        style={({ pressed }) => [styles.composeBtn, { backgroundColor: W.accent, opacity: pressed ? 0.88 : 1 }]}
      >
        <Feather name="edit-2" size={13} color="#fff" />
        <Text style={[styles.composeBtnLabel, { fontFamily: "Inter_600SemiBold" }]}>New Message</Text>
      </Pressable>

      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        {/* MAIL section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_700Bold", color: W.sidebarSection }]}>MAIL</Text>
          {MAIL_FOLDERS.map((f) => {
            const count =
              f.key === "inbox" ? unreadCount :
              f.key === "drafts" ? getEmailsByFolder("drafts").length :
              getEmailsByFolder(f.key).filter((e) => !e.read).length;
            return (
              <SidebarRow
                key={f.key}
                icon={f.icon}
                label={f.label}
                active={currentView === f.key}
                onPress={() => onSelectView(f.key)}
                badge={count}
              />
            );
          })}
        </View>

        {/* ACCOUNT section */}
        <View style={[styles.section, { marginTop: 8 }]}>
          <View style={[styles.sectionDivider, { backgroundColor: W.sidebarBorder }]} />
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_700Bold", color: W.sidebarSection }]}>ACCOUNT</Text>
          {ACCOUNT_ITEMS.map((item) => (
            <SidebarRow
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={currentView === item.key}
              onPress={() => onSelectView(item.key)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer — user identity */}
      <View style={[styles.footer, { borderTopColor: W.sidebarBorder }]}>
        <Pressable
          onPointerEnter={() => setProfileHovered(true)}
          onPointerLeave={() => setProfileHovered(false)}
          onPress={() => onSelectView("profile")}
          style={[styles.profileRow, profileHovered && { backgroundColor: W.sidebarHover }]}
        >
          {user && <Avatar name={user.name} size={32} fontSize={13} />}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]} numberOfLines={1}>
              {user?.name ?? ""}
            </Text>
            <Text style={[styles.profileHandle, { fontFamily: "Inter_400Regular", color: W.sidebarText }]} numberOfLines={1}>
              @{user?.username}
            </Text>
          </View>
          <Pressable
            onPointerEnter={() => setLogoutHovered(true)}
            onPointerLeave={() => setLogoutHovered(false)}
            onPress={logout}
            hitSlop={8}
            style={[styles.logoutBtn, { backgroundColor: logoutHovered ? W.sidebarHover : "transparent" }]}
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
    width: 236,
    backgroundColor: W.sidebarBg,
    flexDirection: "column",
  },
  brand: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  brandTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  logo: { width: 24, height: 24 },
  brandName: { fontSize: 17, letterSpacing: -0.3 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  composeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 14,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  composeBtnLabel: { color: "#fff", fontSize: 13 },
  navList: { flex: 1 },
  section: { paddingHorizontal: 8, marginBottom: 4 },
  sectionDivider: { height: 1, marginBottom: 12, marginTop: 4 },
  sectionLabel: {
    fontSize: 10, letterSpacing: 1.2,
    paddingHorizontal: 10, marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    gap: 10,
    marginBottom: 1,
    overflow: "hidden",
  },
  rowLabel: { flex: 1, fontSize: 13 },
  badge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: "center" },
  badgeText: { fontSize: 10 },
  footer: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  profileInfo: { flex: 1, overflow: "hidden" },
  profileName: { fontSize: 12 },
  profileHandle: { fontSize: 11, marginTop: 1 },
  logoutBtn: { padding: 5, borderRadius: 5 },
});
