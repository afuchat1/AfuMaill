import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { confirmPasswordReset, isExistingAfuChatAddress, isUsernameAvailable, normalizeAfuChatEmail, registerUser, savePhoneNumber, sendPasswordReset, signInUser, verifyPasswordResetCode } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

type Mode = "login" | "register" | "forgot";
type RegisterStep = 1 | 2 | 3 | 4 | 5;
type ForgotStep = "email" | "code" | "password";

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

  // Forgot password fields
  const [forgotProfileEmail, setForgotProfileEmail] = useState("");
  const [forgotDeliveryEmail, setForgotDeliveryEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotCodeSent, setForgotCodeSent] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Register fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [accountRecoveryEmail, setAccountRecoveryEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");

  // Step 4 — phone number
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

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
      setLoginError(error);
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

  // ─── Register step 4 → step 5 ────────────────────────────
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

    const { error, userId } = await registerUser(
      email,
      password,
      username.trim().toLowerCase(),
      fullName,
      accountRecoveryEmail.trim().toLowerCase()
    );

    if (error) {
      setRegisterError(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setRegisterLoading(false);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewUserId(userId ?? null);
    setRegisterLoading(false);
    setStep(5);
  }

  // ─── Step 5: phone number → finish ────────────────────────
  async function handleFinishWithPhone(skip: boolean) {
    setPhoneLoading(true);
    if (!skip && phoneNumber.trim() && newUserId) {
      await savePhoneNumber(newUserId, phoneNumber.trim());
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await refreshUser();
    setPhoneLoading(false);
  }

  // ─── Forgot password ─────────────────────────────────────────
  async function handleForgotPassword() {
    const email = forgotProfileEmail.trim().toLowerCase();
    if (!email) {
      setForgotError("Please enter the email on your AfuMail profile.");
      return;
    }
    if (!normalizeAfuChatEmail(email)) {
      setForgotError("Enter the AfuChat email on your profile.");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error, profileEmail, deliveryEmail } = await sendPasswordReset(email);
    if (error) {
      setForgotError(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setForgotProfileEmail(profileEmail ?? email);
      setForgotDeliveryEmail(deliveryEmail ?? "");
      setForgotCodeSent(true);
      setForgotStep("code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setForgotLoading(false);
  }

  async function handleVerifyResetCode() {
    if (!/^\d{6}$/.test(forgotCode.trim())) {
      setForgotError("Enter the six digit verification code from your email.");
      return;
    }

    setForgotLoading(true);
    setForgotError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await verifyPasswordResetCode(forgotProfileEmail, forgotCode);
    if (error) {
      setForgotError(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setForgotStep("password");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setForgotLoading(false);
  }

  async function handleConfirmPasswordReset() {
    if (forgotNewPassword.length < 6) {
      setForgotError("Password must be at least 6 characters.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords don't match.");
      return;
    }

    setForgotLoading(true);
    setForgotError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await confirmPasswordReset(
      forgotProfileEmail,
      forgotCode,
      forgotNewPassword,
    );
    if (error) {
      setForgotError(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setForgotSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setForgotLoading(false);
  }

  function switchToForgot() {
    setMode("forgot");
    setForgotProfileEmail("");
    setForgotDeliveryEmail("");
    setForgotCode("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
    setForgotCodeSent(false);
    setForgotStep("email");
    setForgotSuccess(false);
  }

  function switchToLogin() {
    setMode("login");
    setStep(1);
    setRegisterError("");
    setLoginError("");
    setForgotProfileEmail("");
    setForgotDeliveryEmail("");
    setForgotCode("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
    setForgotCodeSent(false);
    setForgotStep("email");
    setForgotSuccess(false);
  }

  function switchToRegister() {
    setMode("register");
    setStep(1);
    setRegisterError("");
    setLoginError("");
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

  // ─── Register step 3 → 4 ─────────────────────────────────
  async function handleStep3Next() {
    const email = accountRecoveryEmail.trim().toLowerCase();
    if (!email) {
      setRegisterError("Please enter an existing AfuChat recovery address.");
      return;
    }
    if (!normalizeAfuChatEmail(email)) {
      setRegisterError("Use an existing AfuChat recovery address (username@afuchat.com).");
      return;
    }
    setRegisterError("");
    setRegisterLoading(true);
    const { exists, error } = await isExistingAfuChatAddress(email);
    setRegisterLoading(false);
    if (error) {
      setRegisterError(error);
      return;
    }
    if (!exists) {
      setRegisterError("That AfuChat address does not exist yet. Create the account before linking it.");
      return;
    }
    setStep(4);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function goBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
    setRegisterError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
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
              resizeMode="contain"
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
                <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
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

                <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
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

                <Pressable style={styles.forgotRow} onPress={switchToForgot}>
                  <Text style={[styles.forgotText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                    Forgot password?
                  </Text>
                </Pressable>

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

          {/* ── FORGOT PASSWORD MODE ─────────────────────── */}
          {mode === "forgot" && (
            <View style={styles.card}>
              <Pressable onPress={switchToLogin} hitSlop={8} style={styles.backBtn}>
                <Feather name="arrow-left" size={18} color={colors.foreground} />
              </Pressable>

              {forgotSuccess ? (
                <>
                  <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
                    <Feather name="check-circle" size={32} color={colors.success} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    Password reset complete
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Your password has been updated. You can now sign in to AfuMail with your new password.
                  </Text>
                  <Pressable
                    onPress={switchToLogin}
                    style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? "#333" : colors.primary }]}
                  >
                    <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                      Back to Sign In
                    </Text>
                  </Pressable>
                </>
              ) : forgotCodeSent && forgotStep === "code" ? (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    Enter your code
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                     Check the linked AfuChat email inbox. We sent the code to {forgotDeliveryEmail || "your linked AfuChat address"}. It expires in 10 minutes.
                     {" "}AfuMail will never send a password reset link.
                  </Text>

                  <View style={styles.fields}>
                    <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      Verification code
                    </Text>
                    <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
                      <TextInput
                        style={[styles.input, styles.codeInput, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
                        placeholder="000000"
                        placeholderTextColor={colors.mutedForeground}
                        value={forgotCode}
                        onChangeText={(t) => { setForgotCode(t.replace(/\D/g, "").slice(0, 6)); setForgotError(""); }}
                        keyboardType="number-pad"
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={6}
                        textContentType="oneTimeCode"
                         returnKeyType="done"
                         onSubmitEditing={handleVerifyResetCode}
                      />
                    </View>

                    {!!forgotError && (
                      <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                        {forgotError}
                      </Text>
                    )}

                    <Pressable
                       onPress={handleVerifyResetCode}
                      disabled={forgotLoading}
                      style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? "#333" : colors.primary, opacity: forgotLoading ? 0.7 : 1 }]}
                    >
                      {forgotLoading
                        ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                        : <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                             Verify Code
                          </Text>
                      }
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setForgotCodeSent(false);
                         setForgotStep("email");
                        setForgotCode("");
                        setForgotDeliveryEmail("");
                        setForgotError("");
                      }}
                      disabled={forgotLoading}
                      style={styles.switchRow}
                    >
                      <Text style={[styles.switchText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        Use a different AfuMail profile email
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : forgotCodeSent && forgotStep === "password" ? (
                <>
                  <Pressable
                    onPress={() => { setForgotStep("code"); setForgotError(""); }}
                    hitSlop={8}
                    style={styles.backBtn}
                  >
                    <Feather name="arrow-left" size={18} color={colors.foreground} />
                  </Pressable>
                  <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    Create a new password
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Code verified. Choose a new password for your AfuMail account, then enter it again to confirm.
                  </Text>

                  <View style={styles.fields}>
                    <View style={[styles.verifiedCode, { backgroundColor: colors.success + "14" }]}>
                      <Feather name="check-circle" size={16} color={colors.success} />
                      <Text style={[styles.verifiedCodeText, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>
                        Verification code confirmed
                      </Text>
                    </View>

                    <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                        placeholder="New password (min. 6 characters)"
                        placeholderTextColor={colors.mutedForeground}
                        value={forgotNewPassword}
                        onChangeText={(t) => { setForgotNewPassword(t); setForgotError(""); }}
                        secureTextEntry
                        returnKeyType="next"
                      />
                    </View>

                    <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                        placeholder="Confirm new password"
                        placeholderTextColor={colors.mutedForeground}
                        value={forgotConfirmPassword}
                        onChangeText={(t) => { setForgotConfirmPassword(t); setForgotError(""); }}
                        secureTextEntry
                        returnKeyType="done"
                        onSubmitEditing={handleConfirmPasswordReset}
                      />
                    </View>

                    {!!forgotError && (
                      <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                        {forgotError}
                      </Text>
                    )}

                    <Pressable
                      onPress={handleConfirmPasswordReset}
                      disabled={forgotLoading}
                      style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? "#333" : colors.primary, opacity: forgotLoading ? 0.7 : 1 }]}
                    >
                      {forgotLoading
                        ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                        : <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                            Reset Password
                          </Text>
                      }
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    Reset password
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                     Enter the AfuChat email on your AfuMail profile. If a recovery email is linked, AfuMail will send a secure six digit code to that inbox. We never send a reset link.
                  </Text>

                  <View style={styles.fields}>
                    <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                         placeholder="yourname@afuchat.com"
                        placeholderTextColor={colors.mutedForeground}
                         value={forgotProfileEmail}
                         onChangeText={(t) => { setForgotProfileEmail(t); setForgotError(""); }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        returnKeyType="done"
                        onSubmitEditing={handleForgotPassword}
                      />
                    </View>

                    {!!forgotError && (
                      <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                        {forgotError}
                      </Text>
                    )}

                    <Pressable
                      onPress={handleForgotPassword}
                      disabled={forgotLoading}
                      style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? "#333" : colors.primary, opacity: forgotLoading ? 0.7 : 1 }]}
                    >
                      {forgotLoading
                        ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                        : <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                            Send Verification Code
                          </Text>
                      }
                    </Pressable>
                  </View>

                  <Pressable style={styles.switchRow} onPress={switchToLogin}>
                    <Text style={[styles.switchText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      Remember your password?{" "}
                      <Text style={[styles.switchLink, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                        Sign in
                      </Text>
                    </Text>
                  </Pressable>
                </>
              )}
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
                    <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
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

                    <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
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
                    <View style={[styles.usernameRow, { backgroundColor: colors.secondary }]}>
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
                          Already taken. Try another.
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

              {/* ── STEP 3: Recovery email ────────────────── */}
              {step === 3 && (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    Recovery email
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Enter an existing AfuChat address belonging to someone you trust. AfuMail uses it for branded verification codes and never sends recovery mail outside AfuChat.
                  </Text>

                  <View style={styles.fields}>
                    <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                         placeholder="recovery@afuchat.com"
                        placeholderTextColor={colors.mutedForeground}
                         value={accountRecoveryEmail}
                         onChangeText={(t) => { setAccountRecoveryEmail(t); setRegisterError(""); }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        returnKeyType="done"
                        onSubmitEditing={handleStep3Next}
                      />
                    </View>

                    {!!registerError && (
                      <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                        {registerError}
                      </Text>
                    )}

                    <Pressable
                      onPress={handleStep3Next}
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

              {/* ── STEP 4: Password ──────────────────────── */}
              {step === 4 && (
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
                    <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
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

                    <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
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

              {/* ── STEP 5: Phone number ──────────────────── */}
              {step === 5 && (
                <>
                  <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    Add a phone number
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Used only for identity verification by phone if you ever lose account access. You can skip this and add it later in Settings.
                  </Text>

                  <View style={styles.fields}>
                    <View style={[styles.inputWrap, { backgroundColor: colors.secondary }]}>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                        placeholder="+1 555 000 0000"
                        placeholderTextColor={colors.mutedForeground}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        returnKeyType="done"
                        onSubmitEditing={() => handleFinishWithPhone(false)}
                      />
                    </View>

                    <Pressable
                      onPress={() => handleFinishWithPhone(false)}
                      disabled={phoneLoading}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        { backgroundColor: pressed ? "#333" : colors.primary, opacity: phoneLoading ? 0.7 : 1 },
                      ]}
                    >
                      {phoneLoading
                        ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                        : <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                            Save & Continue
                          </Text>
                      }
                    </Pressable>

                    <Pressable
                      onPress={() => handleFinishWithPhone(true)}
                      disabled={phoneLoading}
                      style={styles.skipBtn}
                    >
                      <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        Skip for now
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              {step < 5 && (
                <Pressable style={styles.switchRow} onPress={switchToLogin}>
                  <Text style={[styles.switchText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Already have an account?{" "}
                    <Text style={[styles.switchLink, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                      Sign in
                    </Text>
                  </Text>
                </Pressable>
              )}
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
  fieldLabel: { fontSize: 13, marginBottom: -4 },
  inputWrap: {
    borderRadius: 100,
    overflow: "hidden",
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  codeInput: {
    fontSize: 26,
    letterSpacing: 8,
    textAlign: "center",
  },
  verifiedCode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  verifiedCodeText: { fontSize: 13 },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 100,
    paddingRight: 12,
    overflow: "hidden",
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
    borderRadius: 100,
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
    borderRadius: 100,
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
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
  },
  backBtn: {
    padding: 4,
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
});
