import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { SwipeBackView } from "@/components/SwipeBackView";
import { getProfile, saveSignature } from "@/lib/supabase";

export default function SignatureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then((p) => {
      setSignature(p?.signature ?? "");
      setLoading(false);
    });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    await saveSignature(user.id, signature);
    setSaving(false);
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SwipeBackView>
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Signature
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

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Your signature appears at the bottom of every email you send.
        </Text>

        <View style={[styles.inputCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ padding: 20 }} />
          ) : (
            <TextInput
              style={[styles.textArea, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              value={signature}
              onChangeText={(t) => { setSignature(t); setSaved(false); }}
              placeholder={"e.g.\n\nBest regards,\nYour Name\nafuchat.com"}
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />
          )}
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Leave blank to send emails without a signature.
        </Text>
      </ScrollView>
    </View>
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
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
  saveBtnText: { fontSize: 14 },
  hint: { fontSize: 13, lineHeight: 20 },
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
