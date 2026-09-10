import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SwipeBackView } from "@/components/SwipeBackView";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

type Factor = { id: string; status: string; factor_type: string };

export default function TwoFactorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const verified = factors.filter((f) => f.status === "verified");
  const isActive = verified.length > 0;

  async function startEnroll() {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "AfuMail" });
    if (error || !data) {
      Alert.alert("Error", error?.message ?? "Could not start enrollment.");
      setEnrolling(false);
      return;
    }
    setQrUri(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setEnrolling(false);
  }

  async function verifyCode() {
    if (!factorId || code.length < 6) return;
    setVerifying(true);
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      Alert.alert("Error", challengeError?.message ?? "Challenge failed.");
      setVerifying(false);
      return;
    }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code });
    if (error) {
      Alert.alert("Invalid code", error.message);
      setVerifying(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setQrUri(null);
    setSecret(null);
    setFactorId(null);
    setCode("");
    setVerifying(false);
    load();
  }

  async function unenroll(id: string) {
    Alert.alert("Disable 2FA?", "You will no longer need a code to sign in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disable", style: "destructive", onPress: async () => {
          setUnenrolling(true);
          await supabase.auth.mfa.unenroll({ factorId: id });
          setUnenrolling(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          load();
        },
      },
    ]);
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
          Two-Factor Auth
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {/* Status card */}
          <View style={[styles.statusCard, {
            backgroundColor: isActive ? (colors.success + "15") : colors.card,
            borderColor: isActive ? colors.success : colors.border,
          }]}>
            <Feather name={isActive ? "shield" : "shield-off"} size={24} color={isActive ? colors.success : colors.mutedForeground} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.statusTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {isActive ? "2FA is Active" : "2FA is Disabled"}
              </Text>
              <Text style={[styles.statusDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {isActive
                  ? "Your account is protected with an authenticator app."
                  : "Add an extra layer of security to your account."}
              </Text>
            </View>
          </View>

          {/* Active factor */}
          {isActive && verified.map((f) => (
            <View key={f.id} style={[styles.factorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="smartphone" size={18} color={colors.foreground} />
              <Text style={[styles.factorLabel, { color: colors.foreground, fontFamily: "Inter_500Medium", flex: 1 }]}>
                Authenticator App (TOTP)
              </Text>
              <Pressable
                onPress={() => unenroll(f.id)}
                disabled={unenrolling}
                style={[styles.removeBtn, { borderColor: colors.destructive }]}
              >
                <Text style={[{ fontSize: 13, fontFamily: "Inter_500Medium" }, { color: colors.destructive }]}>
                  {unenrolling ? "Removing..." : "Remove"}
                </Text>
              </Pressable>
            </View>
          ))}

          {/* Enroll flow */}
          {!isActive && !qrUri && (
            <Pressable
              onPress={startEnroll}
              disabled={enrolling}
               style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? colors.secondary : colors.primary, opacity: enrolling ? 0.7 : 1 }]}
            >
              {enrolling
                ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                : <><Feather name="shield" size={16} color={colors.primaryForeground} /><Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>Set Up Authenticator App</Text></>
              }
            </Pressable>
          )}

          {qrUri && (
            <View style={{ gap: 14 }}>
              <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the six digit code below.
              </Text>

              <View style={[styles.qrBox, { backgroundColor: "#fff", borderColor: colors.border }]}>
                <Text style={{ color: "#333", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" }}>
                  Open your authenticator app and manually enter this secret:
                </Text>
                <Text style={{ color: "#111", fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center", letterSpacing: 2, marginTop: 6 }}>
                  {secret}
                </Text>
              </View>

              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[{ flex: 1, fontSize: 20, letterSpacing: 6, textAlign: "center", color: colors.foreground, fontFamily: "Inter_600SemiBold", paddingVertical: 14 }]}
                  placeholder="000000"
                  placeholderTextColor={colors.mutedForeground}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <Pressable
                onPress={verifyCode}
                disabled={verifying || code.length < 6}
                 style={({ pressed }) => [styles.primaryBtn, { backgroundColor: code.length < 6 ? colors.muted : pressed ? colors.secondary : colors.primary }]}
              >
                {verifying
                  ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                  : <Text style={[styles.primaryBtnText, { color: code.length < 6 ? colors.mutedForeground : colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>Verify & Enable</Text>
                }
              </Pressable>
            </View>
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
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  statusTitle: { fontSize: 15 },
  statusDesc: { fontSize: 13, lineHeight: 18 },
  factorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  factorLabel: { fontSize: 14 },
  removeBtn: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 12,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    borderRadius: 100,
    minHeight: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: { fontSize: 15 },
  hint: { fontSize: 13, lineHeight: 20 },
  qrBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 100,
    overflow: "hidden",
  },
});
