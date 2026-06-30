import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  PanResponder,
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
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

import CalendarScreen from "./calendar";
import SearchScreen from "./search";
import SettingsScreen from "./settings";

const NAV = [
  { key: "inbox",    label: "Mail",     icon: "inbox",    page: 0 },
  { key: "search",   label: "Search",   icon: "search",   page: 1 },
  { key: "compose",  label: "Compose",  icon: "edit-2",   page: -1 },
  { key: "calendar", label: "Calendar", icon: "calendar", page: 2 },
  { key: "settings", label: "Settings", icon: "settings", page: 3 },
] as const;

export default function MainScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { width, height } = useWindowDimensions();
  const { unreadCount } = useEmails();

  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabsScrolling, setTabsScrolling] = useState(false);
  // Tracks whether inbox category tabs have been scrolled to their rightmost end.
  // While false on inbox page, the pager is locked so left swipes scroll tabs instead.
  const [tabsAtEnd, setTabsAtEnd] = useState(false);

  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const NAV_HEIGHT = isWeb ? 84 : 60 + insets.bottom;
  const pageHeight = height - NAV_HEIGHT;

  // Ref to call InboxPage's openSidebar imperatively
  const drawerOpenFn = useRef<(() => void) | null>(null);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  // Left-edge swipe → open drawer (only works on inbox page)
  const edgePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        currentPageRef.current === 0 &&
        gs.dx > 20 &&
        gs.dx > Math.abs(gs.dy) * 1.5,
      onPanResponderGrant: () => {
        drawerOpenFn.current?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    })
  ).current;

  function goToPage(index: number, animated = true) {
    scrollRef.current?.scrollTo({ x: index * width, animated });
    setCurrentPage(index);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Left-edge drawer swipe zone (inbox page only) ── */}
      {currentPage === 0 && !sidebarOpen && (
        <View
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 28, zIndex: 100 }}
          {...edgePan.panHandlers}
        />
      )}

      {/* ── Horizontal pager ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={!sidebarOpen && !tabsScrolling && (tabsAtEnd || currentPage !== 0)}
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
        {/* Page 0 — Inbox */}
        <View style={{ width, height: pageHeight }}>
          <InboxPage
            onSidebarChange={setSidebarOpen}
            onGoToSettings={() => goToPage(3)}
            onTabsScrollStateChange={setTabsScrolling}
            registerOpenDrawer={(fn) => { drawerOpenFn.current = fn; }}
            onTabsAtEndChange={setTabsAtEnd}
          />
        </View>

        {/* Page 1 — Search */}
        <View style={{ width, height: pageHeight }}>
          <SearchScreen />
        </View>

        {/* Page 2 — Calendar */}
        <View style={{ width, height: pageHeight }}>
          <CalendarScreen />
        </View>

        {/* Page 3 — Settings */}
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
