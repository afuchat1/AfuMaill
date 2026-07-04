import { Feather } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import type { EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import type { CurrentView } from "./WebSidebar";
import { W } from "./webColors";

const ALL_FOLDERS: { key: EmailFolder; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "inbox",    label: "Inbox",   icon: "inbox" },
  { key: "starred",  label: "Starred", icon: "star" },
  { key: "sent",     label: "Sent",    icon: "send" },
  { key: "drafts",   label: "Drafts",  icon: "file-text" },
  { key: "archived", label: "Archive", icon: "archive" },
  { key: "spam",     label: "Spam",    icon: "alert-octagon" },
  { key: "trash",    label: "Trash",   icon: "trash-2" },
];

const ACCOUNT_ITEMS: { key: CurrentView; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "profile",  label: "Profile",            icon: "user" },
  { key: "security", label: "Security",            icon: "shield" },
  { key: "sessions", label: "Sessions & Devices",  icon: "monitor" },
];

interface Props {
  currentView: CurrentView;
  onSelectView: (view: CurrentView) => void;
  onClose: () => void;
}

export default function MobileDrawer({ currentView, onSelectView, onClose }: Props) {
  const { user } = useAuth();
  const { getEmailsByFolder, unreadCount } = useEmails();

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Dim backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Drawer panel */}
      <View style={[styles.panel, { backgroundColor: W.bgCard }]}>
        {/* Header */}
        <View style={[styles.drawerHeader, { borderBottomColor: W.border }]}>
          <View style={styles.brand}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.brandName, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>
              AfuMail
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={[styles.closeBtn, { backgroundColor: W.bgSecondary }]}>
            <Feather name="x" size={18} color={W.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {/* MAIL section */}
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_700Bold", color: W.sidebarSection }]}>
            MAIL
          </Text>
          {ALL_FOLDERS.map((f) => {
            const count =
              f.key === "inbox"   ? unreadCount :
              f.key === "drafts"  ? getEmailsByFolder("drafts").length :
              getEmailsByFolder(f.key).filter((e) => !e.read).length;
            const active = currentView === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => onSelectView(f.key)}
                style={[styles.row, { backgroundColor: active ? W.sidebarActive : "transparent" }]}
              >
                <View style={[styles.rowIcon, { backgroundColor: active ? W.accent + "18" : W.bgSecondary }]}>
                  <Feather name={f.icon} size={18} color={active ? W.accent : W.textSecondary} />
                </View>
                <Text style={[styles.rowLabel, {
                  fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                  color: active ? W.textPrimary : W.textSecondary,
                  flex: 1,
                }]}>
                  {f.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.rowBadge, { backgroundColor: active ? W.accent : W.bgSecondary }]}>
                    <Text style={[styles.rowBadgeText, { fontFamily: "Inter_700Bold", color: active ? "#fff" : W.textSecondary }]}>
                      {count > 99 ? "99+" : count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}

          {/* ACCOUNT section */}
          <View style={[styles.divider, { backgroundColor: W.border }]} />
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_700Bold", color: W.sidebarSection }]}>
            ACCOUNT
          </Text>
          {ACCOUNT_ITEMS.map((item) => {
            const active = currentView === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => onSelectView(item.key)}
                style={[styles.row, { backgroundColor: active ? W.sidebarActive : "transparent" }]}
              >
                <View style={[styles.rowIcon, { backgroundColor: active ? W.accent + "18" : W.bgSecondary }]}>
                  <Feather name={item.icon} size={18} color={active ? W.accent : W.textSecondary} />
                </View>
                <Text style={[styles.rowLabel, {
                  fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                  color: active ? W.textPrimary : W.textSecondary,
                }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* User footer */}
        {user && (
          <View style={[styles.footer, { borderTopColor: W.border }]}>
            <Avatar name={user.name} size={40} fontSize={16} />
            <View style={{ flex: 1, overflow: "hidden" }}>
              <Text style={[styles.userName, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={[styles.userEmail, { fontFamily: "Inter_400Regular", color: W.textMuted }]} numberOfLines={1}>
                @{user.username}@afuchat.com
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 300,
    flexDirection: "column",
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 28, height: 28 },
  brandName: { fontSize: 18, letterSpacing: -0.3 },
  closeBtn: { padding: 7, borderRadius: 8 },
  list: { flex: 1 },
  listContent: { paddingTop: 14, paddingBottom: 12 },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
  },
  divider: { height: 1, marginHorizontal: 16, marginVertical: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 12,
    marginBottom: 2,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowLabel: { fontSize: 15 },
  rowBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  rowBadgeText: { fontSize: 11 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  userName: { fontSize: 14 },
  userEmail: { fontSize: 12, marginTop: 2 },
});
