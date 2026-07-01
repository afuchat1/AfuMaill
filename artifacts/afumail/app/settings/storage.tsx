import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { SwipeBackView } from "@/components/SwipeBackView";
import { useColors } from "@/hooks/useColors";
import { getEmailStats } from "@/lib/supabase";

const FOLDER_LABELS: Record<string, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  starred: "Starred",
  archive: "Archive",
  spam: "Spam",
  trash: "Trash",
};

const FOLDER_ICONS: Record<string, string> = {
  inbox: "inbox",
  sent: "send",
  drafts: "file-text",
  starred: "star",
  archive: "archive",
  spam: "alert-octagon",
  trash: "trash-2",
};

export default function StorageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [stats, setStats] = useState<{ total: number; byFolder: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getEmailStats(user.id).then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, [user]);

  const totalLimit = 500;
  const usedPct = stats ? Math.min((stats.total / totalLimit) * 100, 100) : 0;

  return (
    <SwipeBackView>
      {(goBack) => (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Storage
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          {/* Summary card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {stats?.total ?? 0} emails stored
            </Text>
            <Text style={[styles.summarySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              of {totalLimit} email limit
            </Text>

            <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${usedPct}%` as any,
                    backgroundColor: usedPct > 80 ? colors.destructive : colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.pctText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {usedPct.toFixed(1)}% used
            </Text>
          </View>

          {/* Per-folder breakdown */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            BY FOLDER
          </Text>
          <View style={[styles.folderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {Object.entries(FOLDER_LABELS).map(([key, label], idx, arr) => {
              const count = stats?.byFolder[key] ?? 0;
              const pct = stats?.total ? (count / stats.total) * 100 : 0;
              return (
                <View key={key}>
                  <View style={styles.folderRow}>
                    <View style={[styles.folderIcon, { backgroundColor: colors.secondary }]}>
                      <Feather name={FOLDER_ICONS[key] as any} size={14} color={colors.foreground} />
                    </View>
                    <Text style={[styles.folderLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                      {label}
                    </Text>
                    <Text style={[styles.folderCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {count}
                    </Text>
                    <View style={[styles.miniBarBg, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.miniBarFill,
                          { width: `${pct}%` as any, backgroundColor: colors.accent },
                        ]}
                      />
                    </View>
                  </View>
                  {idx < arr.length - 1 && (
                    <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 50 }]} />
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
      )}
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, letterSpacing: -0.3 },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  summaryTitle: { fontSize: 22, letterSpacing: -0.3 },
  summarySubtitle: { fontSize: 13 },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  pctText: { fontSize: 12 },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  folderCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  folderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  folderLabel: { flex: 1, fontSize: 14 },
  folderCount: { fontSize: 13, width: 28, textAlign: "right" },
  miniBarBg: {
    height: 4,
    width: 60,
    borderRadius: 2,
    overflow: "hidden",
  },
  miniBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  sep: { height: StyleSheet.hairlineWidth },
});
