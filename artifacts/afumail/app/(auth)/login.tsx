import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
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
import { isUsernameAvailable, registerUser, signInUser } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

type Mode = "login" | "register";
type RegisterStep = 1 | 2 | 3;

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._]/g, "");
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<RegisterStep>(1);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Register fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");

  const lastNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // ─── Login ────────────────────────────────────────────────
  async function handleLogin() {
    const raw = loginEmail.trim();
    if (!raw || !loginPassword.trim()) {
      setLoginError("Please fill in all fields.");
      return;
    }
    // Accept bare username or full email
    const email = raw.includes("@") ? raw : `${raw}@afuchat.com`;

    setLoginLoading(true);
    setLoginError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await signInUser(email, loginPassword);
    if (error) {
      setLoginError("Incorrect username or password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      await refreshUser();
    }
    setLoginLoading(false);
  }

  // ─── Register step 1 → 2 ─────────────────────────────────
  function handleStep1Next() {
    if (!firstName.trim() || !lastName.trim()) {
      setRegisterError("Please enter your first and last name.");
      return;
    }
    setRegisterError("");
    const suggestion = slugify(`${firstName} ${lastName}`);
    setUsername(suggestion);
    setUsernameAvailable(null);
    setStep(2);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ─── Username availability check ─────────────────────────
  async function handleCheckUsername() {
    const u = username.trim().toLowerCase();
    if (!u) {
      setRegisterError("Please enter a username.");
      return;
    }
    if (!/^[a-z0-9._]+$/.test(u)) {
      setRegisterError("Username can only contain letters, numbers, dots, and underscores.");
      return;
    }
    setRegisterError("");
    setCheckingUsername(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const available = await isUsernameAvailable(u);
    setUsernameAvailable(available);
    setCheckingUsername(false);

    if (!available) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  // ─── Register step 2 → 3 ─────────────────────────────────
  function handleStep2Next() {
    if (usernameAvailable !== true) {
      setRegisterError("Please confirm your username is available first.");
      return;
    }
    setRegisterError("");
    setStep(3);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ─── Register step 3 → done ───────────────────────────────
  async function handleRegister() {
    if (!password.trim()) {
      setRegisterError("Please create a password.");
      return;
    }
    if (password.length < 6) {
      setRegisterError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setRegisterError("Passwords don't match.");
      return;
    }

    setRegisterError("");
    setRegisterLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const email = `${username.trim().toLowerCase()}@afuchat.com`;
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const { error } = await registerUser(email, password, username.trim().toLowerCase(), fullName);

    if (error) {
      setRegisterError(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setRegisterLoading(false);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await refreshUser();
    setRegisterLoading(false);
  }

  function switchToLogin() {
    setMode("login");
    setStep(1);
    setRegisterError("");
    setLoginError("");
  }

  function switchToRegister() {
    setMode("register");
    setStep(1);
    setRegisterError("");
    setLoginError("");
  }

  function goBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    setRegisterError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: insets.bottom + 24 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
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
          </View>

          {/* ── LOGIN MODE ───────────────────────────────── */}
          {mode === "login" && (
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                Welcome back
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Sign in with your @afuchat.com account
              </Text>

              <View style={styles.fields}>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                    placeholder="Username or email"
                    placeholderTextColor={colors.mutedForeground}
                    value={loginEmail}
                    onChangeText={(t) => { setLoginEmail(t); setLoginError(""); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>

                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                    placeholder="Password"
                    placeholderTextColor={colors.mutedForeground}
                    value={loginPassword}
                    onChangeText={(t) => { setLoginPassword(t); setLoginError(""); }}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                </View>

                {!!loginError && (
                  <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                    {loginError}
                  </Text>
                )}

                <Pressable
                  onPress={handleLogin}
                  disabled={loginLoading}
                  style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? "#333" : colors.primary, opacity: loginLoading ? 0.7 : 1 }]}
                >
                  {loginLoading
                    ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                    : <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>Sign In</Text>
                  }
                </Pressable>
              </View>

              <Pressable style={styles.switchRow} onPress={switchToRegister}>
                <Text style={[styles.switchText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  No account?{" "}
                  <Text style={[styles.switchLink, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                    Create one
                  </Text>
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── REGISTER MODE ───────────────────────────── */}
          {mode === "register" && (
            <View style={styles.card}>
              {/* Back button */}
              {step > 1 && (
                <View style={styles.stepRow}>
                  <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
                    <Feather name="arrow-left" size={18} color={colors.foreground} />
                  </Pressable>
                </View>
              )}

              {/* ── STEP 1: Name ──────────────────────────── */}
              {step === 1 && (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    What's your name?
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    This is how you'll appear to others.
                  </Text>

                  <View style={styles.fields}>
                    <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                        placeholder="First name"
                        placeholderTextColor={colors.mutedForeground}
                        value={firstName}
                        onChangeText={(t) => { setFirstName(t); setRegisterError(""); }}
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="next"
                        onSubmitEditing={() => lastNameRef.current?.focus()}
                      />
                    </View>

                    <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <TextInput
                        ref={lastNameRef}
                        style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                        placeholder="Last name"
                        placeholderTextColor={colors.mutedForeground}
                        value={lastName}
                        onChangeText={(t) => { setLastName(t); setRegisterError(""); }}
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleStep1Next}
                      />
                    </View>

                    {!!registerError && (
                      <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                        {registerError}
                      </Text>
                    )}

                    <Pressable
                      onPress={handleStep1Next}
                      style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? "#333" : colors.primary }]}
                    >
                      <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                        Next
                      </Text>
                      <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
                    </Pressable>
                  </View>
                </>
              )}

              {/* ── STEP 2: Username ──────────────────────── */}
              {step === 2 && (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    Choose your username
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Your email will be{" "}
                    <Text style={{ color: colors.accent, fontFamily: "Inter_500Medium" }}>
                      {(username.trim().toLowerCase() || "username")}@afuchat.com
                    </Text>
                  </Text>

                  <View style={styles.fields}>
                    {/* Username input row */}
                    <View style={[styles.usernameRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <TextInput
                        style={[styles.usernameInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                        placeholder="username"
                        placeholderTextColor={colors.mutedForeground}
                        value={username}
                        onChangeText={(t) => {
                          setUsername(slugify(t));
                          setUsernameAvailable(null);
                          setRegisterError("");
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                      />
                      <Text style={[styles.domainSuffix, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        @afuchat.com
                      </Text>
                    </View>

                    {/* Availability status */}
                    {usernameAvailable === true && (
                      <View style={styles.availRow}>
                        <Feather name="check-circle" size={15} color={colors.success} />
                        <Text style={[styles.availText, { color: colors.success, fontFamily: "Inter_500Medium" }]}>
                          Available
                        </Text>
                      </View>
                    )}
                    {usernameAvailable === false && (
                      <View style={styles.availRow}>
                        <Feather name="x-circle" size={15} color={colors.destructive} />
                        <Text style={[styles.availText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>
                          Already taken — try another
                        </Text>
                      </View>
                    )}

                    {!!registerError && (
                      <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                        {registerError}
                      </Text>
                    )}

                    {/* Check availability */}
                    <Pressable
                      onPress={handleCheckUsername}
                      disabled={checkingUsername}
                      style={({ pressed }) => [
                        styles.secondaryBtn,
                        {
                          borderColor: colors.border,
                          backgroundColor: pressed ? colors.secondary : colors.card,
                          opacity: checkingUsername ? 0.7 : 1,
                        },
                      ]}
                    >
                      {checkingUsername
                        ? <ActivityIndicator color={colors.foreground} size="small" />
                        : <Text style={[styles.secondaryBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                            Check availability
                          </Text>
                      }
                    </Pressable>

                    <Pressable
                      onPress={handleStep2Next}
                      disabled={usernameAvailable !== true}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        {
                          backgroundColor: usernameAvailable === true
                            ? pressed ? "#333" : colors.primary
                            : colors.muted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.primaryBtnText,
                          {
                            color: usernameAvailable === true ? colors.primaryForeground : colors.mutedForeground,
                            fontFamily: "Inter_600SemiBold",
                          },
                        ]}
                      >
                        Next
                      </Text>
                      <Feather
                        name="arrow-right"
                        size={16}
                        color={usernameAvailable === true ? colors.primaryForeground : colors.mutedForeground}
                      />
                    </Pressable>
                  </View>
                </>
              )}

              {/* ── STEP 3: Password ──────────────────────── */}
              {step === 3 && (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    Create a password
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Signing in as{" "}
                    <Text style={{ color: colors.accent, fontFamily: "Inter_500Medium" }}>
                      {username.toLowerCase()}@afuchat.com
                    </Text>
                  </Text>

                  <View style={styles.fields}>
                    <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                        placeholder="Password (min. 6 characters)"
                        placeholderTextColor={colors.mutedForeground}
                        value={password}
                        onChangeText={(t) => { setPassword(t); setRegisterError(""); }}
                        secureTextEntry
                        returnKeyType="next"
                        onSubmitEditing={() => confirmRef.current?.focus()}
                      />
                    </View>

                    <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <TextInput
                        ref={confirmRef}
                        style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                        placeholder="Confirm password"
                        placeholderTextColor={colors.mutedForeground}
                        value={confirmPassword}
                        onChangeText={(t) => { setConfirmPassword(t); setRegisterError(""); }}
                        secureTextEntry
                        returnKeyType="done"
                        onSubmitEditing={handleRegister}
                      />
                    </View>

                    {!!registerError && (
                      <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                        {registerError}
                      </Text>
                    )}

                    <Pressable
                      onPress={handleRegister}
                      disabled={registerLoading}
                      style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? "#333" : colors.primary, opacity: registerLoading ? 0.7 : 1 }]}
                    >
                      {registerLoading
                        ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                        : <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                            Create Account
                          </Text>
                      }
                    </Pressable>
                  </View>
                </>
              )}

              <Pressable style={styles.switchRow} onPress={switchToLogin}>
                <Text style={[styles.switchText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Already have an account?{" "}
                  <Text style={[styles.switchLink, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                    Sign in
                  </Text>
                </Text>
              </Pressable>
            </View>
          )}
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
  logoSection: {
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  logo: { width: 72, height: 72, borderRadius: 18 },
  brandName: { fontSize: 28, letterSpacing: -0.5 },
  card: {
    gap: 20,
  },
  cardTitle: { fontSize: 26, letterSpacing: -0.5 },
  cardSubtitle: { fontSize: 15, lineHeight: 22, marginTop: -12 },
  fields: { gap: 12 },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingRight: 12,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  domainSuffix: { fontSize: 14, flexShrink: 0 },
  availRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 2,
    marginTop: -4,
  },
  availText: { fontSize: 13 },
  errorText: {
    fontSize: 13,
    marginTop: -4,
    paddingLeft: 2,
  },
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
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 15 },
  switchRow: { alignItems: "center" },
  switchText: { fontSize: 14 },
  switchLink: { fontSize: 14 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  stepDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
