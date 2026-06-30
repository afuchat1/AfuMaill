import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { EmailRow } from "@/components/EmailRow";
import { useAuth } from "@/context/AuthContext";
import type { EmailCategory, EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

const INBOX_TABS: { label: string; category: EmailCategory | "all" }[] = [
  { label: "Primary", category: "primary" },
  { label: "Work", category: "work" },
  { label: "Personal", category: "personal" },
  { label: "Finance", category: "finance" },
  { label: "Shopping", category: "shopping" },
  { label: "Travel", category: "travel" },
  { label: "Updates", category: "updates" },
  { label: "Social", category: "social" },
];

const SIDE_FOLDERS: { label: string; folder: EmailFolder; icon: string }[] = [
  { label: "Inbox", folder: "inbox", icon: "inbox" },
  { label: "Starred", folder: "starred", icon: "star" },
  { label: "Sent", folder: "sent", icon: "send" },
  { label: "Drafts", folder: "drafts", icon: "file-text" },
  { label: "Archive", folder: "archived", icon: "archive" },
  { label: "Spam", folder: "spam", icon: "alert-triangle" },
  { label: "Trash", folder: "trash", icon: "trash-2" },
];

interface Props {
  onSidebarChange?: (open: boolean) => void;
  onGoToSettings?: () => void;
  onTabsScrollStateChange?: (isScrolling: boolean) => void;
}

export default function InboxPage({ onSidebarChange, onGoToSettings, onTabsScrollStateChange }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { emails, getEmailsByFolder, getEmailsByCategory, unreadCount, isLoading, refreshEmails } = useEmails();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const [activeTab, setActiveTab] = useState<EmailCategory | "all">("primary");
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>("inbox");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const tabScrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifyTabsScrolling = useCallback((active: boolean) => {
    if (tabScrollEndTimer.current) clearTimeout(tabScrollEndTimer.current);
    if (active) {
      onTabsScrollStateChange?.(true);
    } else {
      tabScrollEndTimer.current = setTimeout(() => onTabsScrollStateChange?.(false), 80);
    }
  }, [onTabsScrollStateChange]);

  function openSidebar() {
    setSidebarOpen(true);
    onSidebarChange?.(true);
  }

  function closeSidebar() {
    setSidebarOpen(false);
    onSidebarChange?.(false);
  }

  const displayedEmails =
    currentFolder === "inbox"
      ? activeTab === "all"
        ? getEmailsByFolder("inbox")
        : getEmailsByCategory(activeTab as EmailCategory)
      : getEmailsByFolder(currentFolder);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshEmails();
    setRefreshing(false);
  }

  function openFolder(folder: EmailFolder) {
    setCurrentFolder(folder);
    closeSidebar();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const folderLabel =
    currentFolder === "inbox"
      ? "Inbox"
      : SIDE_FOLDERS.find((f) => f.folder === currentFolder)?.label ?? "Inbox";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <Pressable style={styles.overlay} onPress={closeSidebar} />
      )}

      {/* Sidebar drawer */}
      {sidebarOpen && (
        <View
          style={[
            styles.sidebar,
            {
              backgroundColor: colors.card,
              borderRightColor: colors.border,
              paddingTop: topPad + 8,
            },
          ]}
        >
          <View style={styles.sidebarHeader}>
            <Text style={[styles.sidebarBrand, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              AfuMail
            </Text>
            <Pressable onPress={closeSidebar}>
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
          </View>
          {SIDE_FOLDERS.map((f) => {
            const active = currentFolder === f.folder;
            return (
              <Pressable
                key={f.folder}
                onPress={() => openFolder(f.folder)}
                style={[styles.sidebarRow, active && { backgroundColor: colors.secondary }]}
              >
                <Feather name={f.icon as any} size={21} color={active ? colors.accent : colors.foreground} />
                <Text
                  style={[
                    styles.sidebarLabel,
                    { color: active ? colors.foreground : colors.foreground, fontFamily: "Inter_700Bold" },
                  ]}
                >
                  {f.label}
                </Text>
                {f.folder === "inbox" && unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.badgeText, { fontFamily: "Inter_600SemiBold" }]}>{unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Main content */}
      <View style={[styles.main, { paddingTop: topPad }]}>
        {/* Top header */}
        <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={openSidebar} hitSlop={8}>
            <View style={styles.hamburger}>
              <View style={[styles.hamburgerLine, { backgroundColor: colors.foreground }]} />
              <View style={[styles.hamburgerLine, { width: 18, backgroundColor: colors.foreground }]} />
              <View style={[styles.hamburgerLine, { width: 22, backgroundColor: colors.foreground }]} />
              {unreadCount > 0 && (
                <View style={[styles.menuBadge, { backgroundColor: colors.accent }]} />
              )}
            </View>
          </Pressable>

          <Text style={[styles.folderTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {folderLabel}
          </Text>

          <View style={styles.headerRight}>
            {user && (
              <Pressable onPress={() => onGoToSettings?.()}>
                <Avatar name={user.name} size={32} fontSize={12} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Smart tabs (only for inbox) */}
        {currentFolder === "inbox" && (
          <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsList}
              nestedScrollEnabled
              directionalLockEnabled
              onScrollBeginDrag={() => notifyTabsScrolling(true)}
              onScrollEndDrag={() => notifyTabsScrolling(false)}
              onMomentumScrollEnd={() => notifyTabsScrolling(false)}
            >
              {INBOX_TABS.map((tab) => {
                const active = activeTab === tab.category;
                const tabEmails =
                  tab.category === "all"
                    ? getEmailsByFolder("inbox")
                    : getEmailsByCategory(tab.category as EmailCategory);
                const unread = tabEmails.filter((e) => !e.read).length;

                return (
                  <Pressable
                    key={tab.category}
                    onPress={() => { setActiveTab(tab.category); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: active ? colors.foreground : colors.mutedForeground, fontFamily: active ? "Inter_700Bold" : "Inter_400Regular" },
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {unread > 0 && (
                      <View style={[styles.tabBadge, { backgroundColor: active ? colors.primary : colors.muted }]}>
                        <Text style={[styles.tabBadgeText, { color: active ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                          {unread}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Email list */}
        {displayedEmails.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              All clear
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              No emails in this folder
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedEmails}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => <EmailRow email={item} />}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 10 },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    zIndex: 20,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  sidebarBrand: { fontSize: 22, letterSpacing: -0.5 },
  sidebarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 10,
    gap: 14,
    marginBottom: 2,
  },
  sidebarLabel: { flex: 1, fontSize: 16 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, minWidth: 22, alignItems: "center" },
  badgeText: { fontSize: 11, color: "#FFFFFF" },
  main: { flex: 1 },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hamburger: { gap: 5, width: 22, position: "relative" },
  hamburgerLine: { height: 2, width: 22, borderRadius: 1 },
  menuBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#FAF8F5",
  },
  folderTitle: { flex: 1, fontSize: 22, letterSpacing: -0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  tabsContainer: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabsList: { paddingHorizontal: 16, gap: 0 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 20,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 14 },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: "center" },
  tabBadgeText: { fontSize: 10 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 100 },
  emptyTitle: { fontSize: 20, marginTop: 8 },
  emptySubtitle: { fontSize: 15 },
});
