import { Feather } from "@expo/vector-icons";
import { BlurView, type BlurViewProps } from "expo-blur";
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmailDetailPanel from "@/components/EmailDetailPanel";
import InboxPage from "@/components/pages/InboxPage";
import SidebarPage from "@/components/pages/SidebarPage";
import type { EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

import CalendarScreen from "./calendar";
import SearchScreen from "./search";
import SettingsScreen from "./settings";

const Blur = BlurView as unknown as React.ComponentType<{ intensity?: number; tint?: string; style?: object; children?: React.ReactNode }>;

const NAV = [
  { key: "inbox",    label: "Mail",     icon: "inbox",    page: 1 },
  { key: "search",   label: "Search",   icon: "search",   page: 2 },
  { key: "compose",  label: "Compose",  icon: "edit-2",   page: -1 },
  { key: "calendar", label: "Calendar", icon: "calendar", page: 3 },
  { key: "settings", label: "Settings", icon: "settings", page: 4 },
] as const;

const INDICATOR_SPRING = { damping: 22, stiffness: 280, mass: 0.7 };
const PAGE_TO_NAV_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 4 };

// Same spring used for the drawer (pager pages)
const DRAWER_SPRING = { damping: 28, stiffness: 300, mass: 0.9 };
const PANEL_EDGE_SLOP = 30;

export default function MainScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { width, height } = useWindowDimensions();
  const { unreadCount } = useEmails();

  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>("inbox");
  const [tabsScrolling, setTabsScrolling] = useState(false);
  const [tabsAtStart, setTabsAtStart] = useState(true);
  const [tabsAtEnd, setTabsAtEnd] = useState(false);

  // ── Email detail drawer ──────────────────────────────────────────────────
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [mountedEmailId,  setMountedEmailId]  = useState<string | null>(null); // stays mounted during spring-out

  // panelX: email panel position (width = off-screen right, 0 = fully open)
  // bgX:    main pager position (0 = normal, -width = fully pushed left)
  // They track at 1:1 ratio — exactly like two pages in the horizontal pager.
  const panelX = useSharedValue(width);
  const bgX    = useSharedValue(0);

  function openEmail(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMountedEmailId(id);
    setSelectedEmailId(id);
    panelX.value = width; // ensure starts off-screen
    bgX.value    = 0;
    panelX.value = withSpring(0, DRAWER_SPRING);
    bgX.value    = withSpring(-width, DRAWER_SPRING);
  }

  function closeEmail() {
    setSelectedEmailId(null);
    panelX.value = withSpring(width, DRAWER_SPRING, () => {
      runOnJS(setMountedEmailId)(null);
    });
    bgX.value = withSpring(0, DRAWER_SPRING);
  }

  // Pan gesture on the email panel — left-edge only, vertical scrolls pass through
  // Use shared values throughout so worklets (UI thread) can access them on all platforms
  const isClosing   = useSharedValue(false);
  const panFromEdge = useSharedValue(false);
  const panInitX    = useSharedValue(0);
  const panInitY    = useSharedValue(0);

  const emailPan = Gesture.Pan()
    .manualActivation(true)
    .onBegin((e) => {
      isClosing.value  = false;
      panFromEdge.value = e.x <= PANEL_EDGE_SLOP;
      panInitX.value   = e.x;
      panInitY.value   = e.y;
    })
    .onTouchesMove((e, stateManager) => {
      const touch = e.changedTouches[0];
      if (!touch) return;

      if (!panFromEdge.value) {
        stateManager.fail();
        return;
      }

      const dx = touch.x - panInitX.value;
      const dy = touch.y - panInitY.value;

      if (Math.abs(dy) > Math.abs(dx) + 3) {
        stateManager.fail();
        return;
      }

      if (dx > 8) {
        stateManager.activate();
      }
    })
    .onUpdate((e) => {
      const x = Math.max(0, e.translationX);
      panelX.value = x;
      bgX.value    = x - width;
    })
    .onEnd((e) => {
      const committed = e.translationX > width * 0.32 || e.velocityX > 500;

      if (committed && !isClosing.value) {
        isClosing.value = true;
        panelX.value = withSpring(width, DRAWER_SPRING, () => {
          runOnJS(setMountedEmailId)(null);
        });
        bgX.value = withSpring(0, DRAWER_SPRING);
        runOnJS(setSelectedEmailId)(null);
      } else {
        panelX.value = withSpring(0, DRAWER_SPRING);
        bgX.value    = withSpring(-width, DRAWER_SPRING);
      }
    })
    .onFinalize(() => {
      if (!isClosing.value) {
        panelX.value = withSpring(0, DRAWER_SPRING);
        bgX.value    = withSpring(-width, DRAWER_SPRING);
      }
    });

  const isIOS = Platform.OS === "ios";
  const NAV_HEIGHT = 60 + insets.bottom;
  const pageHeight = height - NAV_HEIGHT;

  const itemWidth = width / NAV.length;
  const indicatorX = useSharedValue(0 * itemWidth + itemWidth / 2);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: width, y: 0, animated: false });
    }, 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const navIdx = PAGE_TO_NAV_IDX[currentPage] ?? 0;
    indicatorX.value = withSpring(navIdx * itemWidth + itemWidth / 2, INDICATOR_SPRING);
  }, [currentPage, itemWidth]);

  function goToPage(index: number, animated = true) {
    scrollRef.current?.scrollTo({ x: index * width, animated });
    setCurrentPage(index);
  }

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value - 12 }],
  }));

  // Background pager animates left as email slides in — 1:1 drawer ratio
  const bgTransformStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bgX.value }],
  }));

  // Email panel slides in from the right
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panelX.value }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Main background (pager + nav bar) — moves left as email opens ── */}
      <Animated.View style={[{ flex: 1 }, bgTransformStyle]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={
            !tabsScrolling && (
              currentPage !== 1 ||
              (tabsAtStart && tabsAtEnd) ||
              tabsAtStart ||
              tabsAtEnd
            )
          }
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={false}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const page = Math.round(x / width);
            setCurrentPage(page);
          }}
          style={{ flex: 1, height: pageHeight }}
        >
          <View style={{ width, height: pageHeight }}>
            <SidebarPage
              currentFolder={currentFolder}
              onSelectFolder={(folder) => { setCurrentFolder(folder); goToPage(1); }}
              onClose={() => goToPage(1)}
            />
          </View>
          <View style={{ width, height: pageHeight }}>
            <InboxPage
              currentFolder={currentFolder}
              onGoToSettings={() => goToPage(4)}
              onTabsScrollStateChange={setTabsScrolling}
              onTabsAtStartChange={setTabsAtStart}
              onTabsAtEndChange={setTabsAtEnd}
              onOpenSidebar={() => goToPage(0)}
              onOpenEmail={openEmail}
            />
          </View>
          <View style={{ width, height: pageHeight }}>
            <SearchScreen />
          </View>
          <View style={{ width, height: pageHeight }}>
            <CalendarScreen />
          </View>
          <View style={{ width, height: pageHeight }}>
            <SettingsScreen />
          </View>
        </ScrollView>

        {/* Bottom nav bar — slides with the pager */}
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
            <Blur
              intensity={95}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={[styles.navInner, { paddingBottom: insets.bottom }]}>
            <Animated.View
              style={[styles.indicator, { backgroundColor: colors.primary, pointerEvents: "none" }, indicatorStyle]}
            />
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
                        style={[styles.unreadDot, { backgroundColor: colors.accent, borderColor: colors.card }]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.navLabel,
                      {
                        color: active ? colors.primary : colors.mutedForeground,
                        fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
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
      </Animated.View>

      {/* ── Email detail overlay — slides in from the right at 1:1 ratio ── */}
      {mountedEmailId && (
        <GestureDetector gesture={emailPan}>
          <Animated.View style={[StyleSheet.absoluteFill, panelStyle]}>
            <EmailDetailPanel
              emailId={mountedEmailId}
              onClose={closeEmail}
            />
          </Animated.View>
        </GestureDetector>
      )}
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
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: 24,
    height: 3,
    borderRadius: 1.5,
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
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.18)",
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
