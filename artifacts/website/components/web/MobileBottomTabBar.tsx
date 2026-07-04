import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CurrentView } from "./WebSidebar";
import { W } from "./webColors";

interface Props {
  currentView: CurrentView;
  onSelectView: (view: CurrentView) => void;
  onCompose: () => void;
  onOpenMenu: () => void;
  unreadCount: number;
}

const ACCOUNT_VIEWS: CurrentView[] = ["profile", "security", "sessions"];

export default function MobileBottomTabBar({
  currentView, onSelectView, onCompose, onOpenMenu, unreadCount,
}: Props) {
  const inboxActive   = currentView === "inbox";
  const starredActive = currentView === "starred";
  const accountActive = ACCOUNT_VIEWS.includes(currentView);

  return (
    <View style={[styles.bar, { backgroundColor: W.bgCard, borderTopColor: W.border }]}>

      {/* Inbox */}
      <Pressable onPress={() => onSelectView("inbox")} style={styles.tab}>
        <View style={styles.iconWrap}>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: W.accent }]}>
              <Text style={[styles.badgeText, { fontFamily: "Inter_700Bold" }]}>
                {unreadCount > 99 ? "99+" : String(unreadCount)}
              </Text>
            </View>
          )}
          <Feather name="inbox" size={22} color={inboxActive ? W.accent : W.textMuted} />
        </View>
        <Text style={[styles.tabLabel, {
          color: inboxActive ? W.accent : W.textMuted,
          fontFamily: inboxActive ? "Inter_600SemiBold" : "Inter_400Regular",
        }]}>
          Inbox
        </Text>
      </Pressable>

      {/* Starred */}
      <Pressable onPress={() => onSelectView("starred")} style={styles.tab}>
        <Feather name="star" size={22} color={starredActive ? W.accent : W.textMuted} />
        <Text style={[styles.tabLabel, {
          color: starredActive ? W.accent : W.textMuted,
          fontFamily: starredActive ? "Inter_600SemiBold" : "Inter_400Regular",
        }]}>
          Starred
        </Text>
      </Pressable>

      {/* Compose FAB (center, elevated) */}
      <View style={styles.fabCol}>
        <Pressable
          onPress={onCompose}
          style={[styles.fab, { backgroundColor: W.accent }]}
          accessibilityLabel="Compose new message"
        >
          <Feather name="edit-2" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Account */}
      <Pressable onPress={() => onSelectView("profile")} style={styles.tab}>
        <Feather name="user" size={22} color={accountActive ? W.accent : W.textMuted} />
        <Text style={[styles.tabLabel, {
          color: accountActive ? W.accent : W.textMuted,
          fontFamily: accountActive ? "Inter_600SemiBold" : "Inter_400Regular",
        }]}>
          Account
        </Text>
      </Pressable>

      {/* More → opens drawer */}
      <Pressable onPress={onOpenMenu} style={styles.tab}>
        <Feather name="menu" size={22} color={W.textMuted} />
        <Text style={[styles.tabLabel, { color: W.textMuted, fontFamily: "Inter_400Regular" }]}>
          More
        </Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    height: 72,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2,
    gap: 3,
  },
  iconWrap: { position: "relative", alignItems: "center" },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: "center",
    zIndex: 1,
  },
  badgeText: { color: "#fff", fontSize: 9 },
  tabLabel: { fontSize: 10 },
  fabCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 0,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
