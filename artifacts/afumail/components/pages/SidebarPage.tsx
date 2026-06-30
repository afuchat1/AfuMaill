import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

const FOLDERS: { label: string; folder: EmailFolder; icon: string }[] = [
  { label: "Inbox",   folder: "inbox",    icon: "inbox" },
  { label: "Starred", folder: "starred",  icon: "star" },
  { label: "Sent",    folder: "sent",     icon: "send" },
  { label: "Drafts",  folder: "drafts",   icon: "file-text" },
  { label: "Archive", folder: "archived", icon: "archive" },
  { label: "Spam",    folder: "spam",     icon: "alert-triangle" },
  { label: "Trash",   folder: "trash",    icon: "trash-2" },
];

interface Props {
  currentFolder: EmailFolder;
  onSelectFolder: (folder: EmailFolder) => void;
  onClose: () => void;
}

export default function SidebarPage({ currentFolder, onSelectFolder, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useEmails();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad + 8 }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.brand, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          AfuMail
        </Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {FOLDERS.map((item) => {
          const active = currentFolder === item.folder;
          return (
            <Pressable
              key={item.folder}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectFolder(item.folder);
              }}
              style={[styles.row, active && { backgroundColor: colors.secondary }]}
            >
              <Feather name={item.icon as any} size={21} color={colors.foreground} />
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {item.label}
              </Text>
              {item.folder === "inbox" && unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.badgeText, { fontFamily: "Inter_600SemiBold" }]}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { fontSize: 22, letterSpacing: -0.5 },
  list: { flex: 1 },
  listContent: { paddingVertical: 8, paddingHorizontal: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 2,
  },
  label: { flex: 1, fontSize: 16 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  badgeText: { fontSize: 11, color: "#FFFFFF" },
});
