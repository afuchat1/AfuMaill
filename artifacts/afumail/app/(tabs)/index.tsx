import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import InboxPage from "@/components/pages/InboxPage";
import SidebarPage from "@/components/pages/SidebarPage";
import type { EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

import CalendarScreen from "./calendar";
import SearchScreen from "./search";
import SettingsScreen from "./settings";

// Page 0 = Sidebar, 1 = Inbox, 2 = Search, 3 = Calendar, 4 = Settings
const NAV = [
  { key: "inbox",    label: "Mail",     icon: "inbox",    page: 1 },
  { key: "search",   label: "Search",   icon: "search",   page: 2 },
  { key: "compose",  label: "Compose",  icon: "edit-2",   page: -1 },
  { key: "calendar", label: "Calendar", icon: "calendar", page: 3 },
  { key: "settings", label: "Settings", icon: "settings", page: 4 },
] as const;

export default function MainScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { width, height } = useWindowDimensions();
  const { unreadCount } = useEmails();

  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(1); // start on inbox
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>("inbox");
  const [tabsScrolling, setTabsScrolling] = useState(false);
  // When false on inbox, pager is locked so left swipes scroll tabs instead.
  const [tabsAtEnd, setTabsAtEnd] = useState(false);

  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const NAV_HEIGHT = isWeb ? 84 : 60 + insets.bottom;
  const pageHeight = height - NAV_HEIGHT;

  // Scroll to page 1 (inbox) on first render — avoids flashing sidebar
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: width, y: 0, animated: false });
    }, 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToPage(index: number, animated = true) {
    scrollRef.current?.scrollTo({ x: index * width, animated });
    setCurrentPage(index);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Horizontal pager ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        // Pager is locked while on inbox with tabs not yet scrolled to end.
        // Left swipes are handled by InboxPage's PanResponder (scroll tabs or open sidebar).
        // Programmatic goToPage() calls always work regardless of scrollEnabled.
        scrollEnabled={!tabsScrolling && (tabsAtEnd || currentPage !== 1)}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        decelerationRate="fast"
        bounces={false}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          setCurrentPage(Math.round(x / width));
        }}
        style={{ flex: 1 }}
      >
        {/* Page 0 — Sidebar */}
        <View style={{ width, height: pageHeight }}>
          <SidebarPage
            currentFolder={currentFolder}
            onSelectFolder={(folder) => {
              setCurrentFolder(folder);
              goToPage(1);
            }}
            onClose={() => goToPage(1)}
          />
        </View>

        {/* Page 1 — Inbox */}
        <View style={{ width, height: pageHeight }}>
          <InboxPage
            currentFolder={currentFolder}
            onGoToSettings={() => goToPage(4)}
            onTabsScrollStateChange={setTabsScrolling}
            onTabsAtEndChange={setTabsAtEnd}
            onOpenSidebar={() => goToPage(0)}
          />
        </View>

        {/* Page 2 — Search */}
        <View style={{ width, height: pageHeight }}>
          <SearchScreen />
        </View>

        {/* Page 3 — Calendar */}
        <View style={{ width, height: pageHeight }}>
          <CalendarScreen />
        </View>

        {/* Page 4 — Settings */}
        <View style={{ width, height: pageHeight }}>
          <SettingsScreen />
        </View>
      </ScrollView>

      {/* ── Bottom nav bar ── */}
      <View
        style={[
          styles.navBar,
          {
            height: NAV_HEIGHT,
            borderTopColor: colors.border,
            backgroundColor: isIOS ? "transparent" : colors.card,
          },
        ]}
      >
        {isIOS && (
          <BlurView
            intensity={95}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View style={[styles.navInner, { paddingBottom: insets.bottom }]}>
          {NAV.map((item) => {
            const isCompose = item.key === "compose";
            const active = !isCompose && currentPage === item.page;

            if (isCompose) {
              return (
                <Pressable
                  key="compose"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/email/compose");
                  }}
                  style={styles.navItem}
                >
                  <View style={[styles.composeFab, { backgroundColor: colors.primary }]}>
                    <Feather name="edit-2" size={18} color={colors.primaryForeground} />
                  </View>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  goToPage(item.page);
                }}
                style={styles.navItem}
              >
                <View style={{ position: "relative" }}>
                  <Feather
                    name={item.icon as any}
                    size={22}
                    color={active ? colors.primary : colors.mutedForeground}
                  />
                  {item.key === "inbox" && unreadCount > 0 && (
                    <View
                      style={[
                        styles.unreadDot,
                        { backgroundColor: colors.accent, borderColor: colors.card },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: active ? colors.primary : colors.mutedForeground,
                      fontFamily: "Inter_700Bold",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    position: "relative",
    overflow: "hidden",
  },
  navInner: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  navLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  composeFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  unreadDot: {
    position: "absolute",
    top: -3,
    right: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
