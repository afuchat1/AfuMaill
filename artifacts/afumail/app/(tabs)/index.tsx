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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import InboxPage from "@/components/pages/InboxPage";
import SidebarPage from "@/components/pages/SidebarPage";
import type { EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

import CalendarScreen from "./calendar";
import SearchScreen from "./search";
import SettingsScreen from "./settings";

const NAV = [
  { key: "inbox",    label: "Mail",     icon: "inbox",    page: 1 },
  { key: "search",   label: "Search",   icon: "search",   page: 2 },
  { key: "compose",  label: "Compose",  icon: "edit-2",   page: -1 },
  { key: "calendar", label: "Calendar", icon: "calendar", page: 3 },
  { key: "settings", label: "Settings", icon: "settings", page: 4 },
] as const;

const INDICATOR_SPRING = { damping: 22, stiffness: 280, mass: 0.7 };
const PAGE_TO_NAV_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 4 };

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
  const [tabsAtEnd, setTabsAtEnd] = useState(false);

  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const NAV_HEIGHT = isWeb ? 84 : 60 + insets.bottom;
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={!tabsScrolling && (tabsAtEnd || currentPage !== 1)}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        bounces={false}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const page = Math.round(x / width);
          setCurrentPage(page);
        }}
        style={{ flex: 1 }}
      >
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

        <View style={{ width, height: pageHeight }}>
          <InboxPage
            currentFolder={currentFolder}
            onGoToSettings={() => goToPage(4)}
            onTabsScrollStateChange={setTabsScrolling}
            onTabsAtEndChange={setTabsAtEnd}
            onOpenSidebar={() => goToPage(0)}
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

      {/* Bottom nav bar */}
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
          {/* Sliding active indicator */}
          <Animated.View
            style={[
              styles.indicator,
              { backgroundColor: colors.primary },
              indicatorStyle,
            ]}
            pointerEvents="none"
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
