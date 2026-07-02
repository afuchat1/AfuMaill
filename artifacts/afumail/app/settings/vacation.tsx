import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { SwipeBackView } from "@/components/SwipeBackView";
import { getProfile, saveVacationReply } from "@/lib/supabase";

export default function VacationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id)
      .then((p) => {
        setEnabled(p?.vacation_reply_enabled ?? false);
        setMessage(p?.vacation_reply_message ?? "");
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load vacation reply:", err);
        setLoading(false);
      });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await saveVacationReply(user.id, enabled, message);
      setSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.warn("Failed to save vacation reply:", err);
    }
    setSaving(false);
  }

  return (
    <SwipeBackView>
      {(goBack) => (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Vacation Reply
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={saving || loading}
          style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : saved ? (
            <Feather name="check" size={16} color="#fff" />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
              Save
            </Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Enable Vacation Reply
              </Text>
              <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Automatically reply to incoming emails while you're away.
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={(v) => { setEnabled(v); setSaved(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          {enabled && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                AUTO-REPLY MESSAGE
              </Text>
              <View style={[styles.inputCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.textArea, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                  value={message}
                  onChangeText={(t) => { setMessage(t); setSaved(false); }}
                  placeholder={"e.g.\n\nThanks for your email! I'm currently out of office and will reply when I return."}
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </>
          )}
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
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
  saveBtnText: { fontSize: 14 },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  label: { fontSize: 15 },
  sub: { fontSize: 13, lineHeight: 18 },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  inputCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  textArea: {
    fontSize: 15,
    lineHeight: 24,
    padding: 16,
    minHeight: 200,
  },
});
