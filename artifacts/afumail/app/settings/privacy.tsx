import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SwipeBackView } from "@/components/SwipeBackView";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { usePreferences } from "@/context/PreferencesContext";

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { preferences, updatePreference } = usePreferences();

  const externalImages = preferences.externalImages;

  async function toggleExternalImages() {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !externalImages;
    try {
      await updatePreference("externalImages", next);
    } catch (err) {
      console.warn("Failed to save privacy preference:", err);
    }
  }

  const rows = [
    {
      key: "externalImages" as const,
      label: "Load External Images",
      icon: "image",
      description: "Automatically load images from external sources in emails.",
      value: externalImages,
    },
  ];

  return (
    <SwipeBackView>
      {(goBack) => (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Privacy Controls
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {rows.map((row, idx) => (
            <View key={row.key}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                  <Feather name={row.icon as any} size={15} color={colors.foreground} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                    {row.label}
                  </Text>
                  <Text style={[styles.rowDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {row.description}
                  </Text>
                </View>
              <Switch
                value={row.value}
                onValueChange={toggleExternalImages}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {idx < rows.length - 1 && (
                <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 52 }]} />
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.note, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          AfuMail does not sell or share your email data with third parties. These settings control only in-app behaviour.
        </Text>
      </ScrollView>
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
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 15 },
  rowDesc: { fontSize: 12, lineHeight: 18 },
  sep: { height: StyleSheet.hairlineWidth },
  note: { fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
});
