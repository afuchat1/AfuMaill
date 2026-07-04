import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { W } from "./webColors";

interface Props {
  title?: string;
  /** Show back arrow instead of hamburger. Triggers when navigating into a sub-view. */
  onBack?: () => void;
  /** Show hamburger to open the nav drawer. */
  onOpenDrawer?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  /** Whether the search bar is currently expanded. */
  showSearch?: boolean;
  /** Called when the search icon is pressed. */
  onToggleSearch?: () => void;
}

export default function MobileHeader({
  title,
  onBack,
  onOpenDrawer,
  searchQuery = "",
  onSearchChange,
  showSearch,
  onToggleSearch,
}: Props) {
  return (
    <View style={[styles.header, { backgroundColor: W.bgCard, borderBottomColor: W.border }]}>
      {/* Left control */}
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={W.textPrimary} />
        </Pressable>
      ) : onOpenDrawer ? (
        <Pressable onPress={onOpenDrawer} hitSlop={12} style={styles.iconBtn}>
          <Feather name="menu" size={22} color={W.textPrimary} />
        </Pressable>
      ) : (
        <View style={styles.iconBtn} />
      )}

      {/* Center: title or inline search */}
      {showSearch && onSearchChange ? (
        <View style={[styles.searchBox, { backgroundColor: W.bgSecondary }]}>
          <Feather name="search" size={14} color={W.textMuted} />
          <TextInput
            style={[styles.searchInput, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search mail…"
            placeholderTextColor={W.textMuted}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => onSearchChange("")} hitSlop={8}>
              <Feather name="x" size={14} color={W.textMuted} />
            </Pressable>
          )}
        </View>
      ) : (
        <Text
          style={[styles.title, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}

      {/* Right control */}
      {onToggleSearch ? (
        <Pressable onPress={onToggleSearch} hitSlop={12} style={styles.iconBtn}>
          <Feather
            name={showSearch ? "x" : "search"}
            size={20}
            color={showSearch ? W.accent : W.textSecondary}
          />
        </Pressable>
      ) : (
        <View style={styles.iconBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 18,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
