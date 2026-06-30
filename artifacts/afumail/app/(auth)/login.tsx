import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useState } from "react";
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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  async function handleContinue() {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    setError("");
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await login(email.trim(), password);
    if (!success) {
      setError("Invalid credentials. Please try again.");
    }
    setIsLoading(false);
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={[styles.brandName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              AfuMail
            </Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(""); }}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
            </View>

            {!!error && (
              <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                {error}
              </Text>
            )}

            <Pressable
              onPress={handleContinue}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: pressed ? "#333333" : colors.primary,
                  opacity: isLoading ? 0.7 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                  {mode === "login" ? "Continue" : "Create Account"}
                </Text>
              )}
            </Pressable>

            {mode === "login" && (
              <Pressable style={styles.linkButton}>
                <Text style={[styles.linkText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Forgot password?
                </Text>
              </Pressable>
            )}
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              or
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          {/* Social */}
          <View style={styles.socialSection}>
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                {
                  backgroundColor: pressed ? colors.secondary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.socialButtonText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                Continue with Google
              </Text>
            </Pressable>

            {Platform.OS === "ios" && (
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  {
                    backgroundColor: pressed ? colors.secondary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.socialButtonText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  Continue with Apple
                </Text>
              </Pressable>
            )}
          </View>

          {/* Toggle mode */}
          <Pressable
            onPress={() => setMode(mode === "login" ? "register" : "login")}
            style={styles.toggleButton}
          >
            <Text style={[styles.toggleText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <Text style={[styles.toggleLink, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                {mode === "login" ? "Create one" : "Sign in"}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 24,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 48,
    gap: 10,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  brandName: {
    fontSize: 30,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
  },
  form: {
    gap: 12,
    marginBottom: 28,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: -4,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    fontSize: 16,
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 13,
  },
  socialSection: {
    gap: 10,
    marginBottom: 28,
  },
  socialButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  socialButtonText: {
    fontSize: 15,
  },
  toggleButton: {
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
  },
  toggleLink: {
    fontSize: 14,
  },
});
