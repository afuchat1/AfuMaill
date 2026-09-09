import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
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
  { label: "Primary",  category: "primary" },
  { label: "Work",     category: "work" },
  { label: "Personal", category: "personal" },
  { label: "Finance",  category: "finance" },
  { label: "Shopping", category: "shopping" },
  { label: "Travel",   category: "travel" },
  { label: "Updates",  category: "updates" },
  { label: "Social",   category: "social" },
];

const FOLDER_LABELS: Partial<Record<EmailFolder, string>> = {
  inbox:    "Inbox",
  starred:  "Starred",
  sent:     "Sent",
  drafts:   "Drafts",
  archived: "Archive",
  spam:     "Spam",
  trash:    "Trash",
};

interface Props {
  currentFolder: EmailFolder;
  onGoToSettings?: () => void;
  onTabsScrollStateChange?: (isScrolling: boolean) => void;
  onTabsAtStartChange?: (atStart: boolean) => void;
  onTabsAtEndChange?: (atEnd: boolean) => void;
  onOpenSidebar?: () => void;
  onOpenEmail?: (id: string) => void;
}

export default function InboxPage({
  currentFolder,
  onGoToSettings,
  onTabsScrollStateChange,
  onTabsAtStartChange,
  onTabsAtEndChange,
  onOpenSidebar,
  onOpenEmail,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getEmailsByFolder, getEmailsByCategory, unreadCount, refreshEmails } = useEmails();
  const [activeTab, setActiveTab] = useState<EmailCategory | "all">("primary");
  const [refreshing, setRefreshing] = useState(false);
  const tabScrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset tab selection when entering inbox folder
  useEffect(() => {
    if (currentFolder === "inbox") setActiveTab("primary");
  }, [currentFolder]);

  // ── Tabs scroll tracking ──────────────────────────────────────────────────
  const tabsScrollViewRef = useRef<ScrollView>(null);
  const tabsScrollXRef    = useRef(0);
  const tabsMaxScrollRef  = useRef(0);
  const tabsAtEndRef      = useRef(false);
  const tabsAtStartRef    = useRef(true); // starts at leftmost position

  const onTabsAtEndChangeRef   = useRef(onTabsAtEndChange);
  const onTabsAtStartChangeRef = useRef(onTabsAtStartChange);
  useEffect(() => { onTabsAtEndChangeRef.current   = onTabsAtEndChange;   }, [onTabsAtEndChange]);
  useEffect(() => { onTabsAtStartChangeRef.current = onTabsAtStartChange; }, [onTabsAtStartChange]);

  // Report initial positions on mount
  useEffect(() => {
    onTabsAtStartChangeRef.current?.(true);
    onTabsAtEndChangeRef.current?.(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onOpenSidebarRef = useRef(onOpenSidebar);
  useEffect(() => { onOpenSidebarRef.current = onOpenSidebar; }, [onOpenSidebar]);

  const notifyTabsScrolling = useCallback((active: boolean) => {
    if (tabScrollEndTimer.current) clearTimeout(tabScrollEndTimer.current);
    if (active) {
      onTabsScrollStateChange?.(true);
    } else {
      tabScrollEndTimer.current = setTimeout(() => onTabsScrollStateChange?.(false), 80);
    }
  }, [onTabsScrollStateChange]);

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

  const folderLabel = FOLDER_LABELS[currentFolder] ?? "Inbox";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.main, { paddingTop: insets.top }]}>

        {/* ── Header ── */}
        <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => onOpenSidebarRef.current?.()} hitSlop={8}>
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

        {/* ── Category tabs (inbox only) ── */}
        {currentFolder === "inbox" && (
          <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
            <ScrollView
              ref={tabsScrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsList}
              nestedScrollEnabled
              directionalLockEnabled
              scrollEventThrottle={16}
              onScroll={(e) => {
                const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                tabsScrollXRef.current   = contentOffset.x;
                tabsMaxScrollRef.current = Math.max(0, contentSize.width - layoutMeasurement.width);

                const atEnd =
                  tabsMaxScrollRef.current <= 0 ||
                  contentOffset.x >= tabsMaxScrollRef.current - 4;
                const atStart = contentOffset.x <= 4;

                if (atEnd !== tabsAtEndRef.current) {
                  tabsAtEndRef.current = atEnd;
                  onTabsAtEndChangeRef.current?.(atEnd);
                }
                if (atStart !== tabsAtStartRef.current) {
                  tabsAtStartRef.current = atStart;
                  onTabsAtStartChangeRef.current?.(atStart);
                }
              }}
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
                    onPress={() => {
                      setActiveTab(tab.category);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.tab,
                      active && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color: active ? colors.foreground : colors.mutedForeground,
                          fontFamily: active ? "Inter_700Bold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {unread > 0 && (
                      <View
                        style={[
                          styles.tabBadge,
                          { backgroundColor: active ? colors.primary : colors.muted },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            {
                              color: active ? colors.primaryForeground : colors.mutedForeground,
                              fontFamily: "Inter_600SemiBold",
                            },
                          ]}
                        >
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

        {/* ── Email list ── */}
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
            renderItem={({ item }) => <EmailRow email={item} currentFolder={currentFolder} onOpenEmail={onOpenEmail} />}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent}
              />
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  main: { flex: 1 },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hamburger: { width: 28, height: 22, justifyContent: "space-between", paddingVertical: 1 },
  hamburgerLine: { height: 2, width: 24, borderRadius: 2 },
  menuBadge: { position: "absolute", top: 0, right: 0, width: 8, height: 8, borderRadius: 4 },
  folderTitle: { fontSize: 20, letterSpacing: -0.3 },
  headerRight: { width: 40, alignItems: "flex-end" },
  tabsContainer: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabsList: { paddingHorizontal: 12, gap: 4 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabText: { fontSize: 14 },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
  },
  tabBadgeText: { fontSize: 10 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 18 },
  emptySubtitle: { fontSize: 14 },
});
