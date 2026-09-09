import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { setNewPassword } from "@/lib/supabase";

export default function SetNewPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { clearPasswordRecovery } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const confirmRef = useRef<TextInput>(null);

  async function handleSetPassword() {
    if (!password.trim()) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error: err } = await setNewPassword(password);
    if (err) {
      setError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        clearPasswordRecovery();
        router.replace("/(tabs)");
      }, 1500);
    }
    setLoading(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconSection}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accent + "15" }]}>
              <Feather name="lock" size={32} color={colors.accent} />
            </View>
          </View>

          <View style={styles.card}>
            {success ? (
              <>
                <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
                  <Feather name="check-circle" size={36} color={colors.success} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  Password updated
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Your password has been changed. Taking you to your inbox…
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  Set new password
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Choose a strong password for your AfuMail account.
                </Text>

                <View style={styles.fields}>
                  <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                      placeholder="New password (min. 6 characters)"
                      placeholderTextColor={colors.mutedForeground}
                      value={password}
                      onChangeText={(t) => { setPassword(t); setError(""); }}
                      secureTextEntry
                      autoFocus
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                    />
                  </View>

                  <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
                    <TextInput
                      ref={confirmRef}
                      style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                      placeholder="Confirm new password"
                      placeholderTextColor={colors.mutedForeground}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleSetPassword}
                    />
                  </View>

                  {!!error && (
                    <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                      {error}
                    </Text>
                  )}

                  <Pressable
                    onPress={handleSetPassword}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: pressed ? "#333" : colors.primary, opacity: loading ? 0.7 : 1 },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.primaryForeground} size="small" />
                    ) : (
                      <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                        Update Password
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: "center",
    gap: 24,
  },
  iconSection: {
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  card: { gap: 20 },
  cardTitle: { fontSize: 26, letterSpacing: -0.5 },
  cardSubtitle: { fontSize: 15, lineHeight: 22, marginTop: -12 },
  fields: { gap: 12 },
  inputWrap: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: { fontSize: 16, padding: 0 },
  errorText: { fontSize: 14, textAlign: "center" },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 16 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
});
