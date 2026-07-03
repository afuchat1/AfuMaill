import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { isUsernameAvailable, registerUser, savePhoneNumber, sendPasswordReset, signInUser } from "@/lib/supabase";

type Mode = "login" | "register" | "forgot";
type RegisterStep = 1 | 2 | 3 | 4 | 5;

const C = {
  leftBg: "#0F172A",
  leftAccent: "#2563EB",
  leftText: "#F1F5F9",
  leftMuted: "#64748B",
  rightBg: "#FFFFFF",
  rightBorder: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  accent: "#2563EB",
  accentHover: "#1D4ED8",
  inputBg: "#F8FAFC",
  inputBorder: "#E2E8F0",
  inputFocus: "#2563EB",
  destructive: "#EF4444",
  success: "#10B981",
};

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/\s+/g, "").replace(/[^a-z0-9._]/g, "");
}

function WebInput({
  label, value, onChange, placeholder, type = "text", autoFocus = false,
  suffix, hint, rightElement,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  suffix?: string;
  hint?: string;
  rightElement?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium", color: C.textSecondary }]}>{label}</Text>
      <View style={[
        styles.inputRow,
        { borderColor: focused ? C.inputFocus : C.inputBorder, backgroundColor: C.inputBg },
        focused && { borderColor: C.inputFocus },
      ]}>
        <TextInput
          style={[styles.input, { fontFamily: "Inter_400Regular", color: C.textPrimary }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          secureTextEntry={type === "password"}
          keyboardType={type === "email" ? "email-address" : "default"}
          autoCapitalize={type === "email" || type === "username" ? "none" : "words"}
          autoCorrect={false}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {suffix && (
          <Text style={[styles.inputSuffix, { fontFamily: "Inter_400Regular", color: C.textMuted }]}>
            {suffix}
          </Text>
        )}
        {rightElement}
      </View>
      {hint && <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular", color: C.textMuted }]}>{hint}</Text>}
    </View>
  );
}

function PrimaryBtn({ label, onPress, loading, disabled, icon }: {
  label: string; onPress: () => void; loading?: boolean; disabled?: boolean; icon?: keyof typeof Feather.glyphMap;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        styles.primaryBtn,
        { backgroundColor: disabled ? "#CBD5E1" : hovered ? C.accentHover : C.accent, opacity: loading ? 0.8 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Text style={[styles.primaryBtnLabel, { fontFamily: "Inter_600SemiBold" }]}>{label}</Text>
          {icon && <Feather name={icon} size={15} color="#fff" />}
        </>
      )}
    </Pressable>
  );
}

function SecondaryBtn({ label, onPress, icon }: { label: string; onPress: () => void; icon?: keyof typeof Feather.glyphMap }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        styles.secondaryBtn,
        { backgroundColor: hovered ? "#F1F5F9" : "transparent", borderColor: C.inputBorder },
      ]}
    >
      {icon && <Feather name={icon} size={15} color={C.textSecondary} />}
      <Text style={[styles.secondaryBtnLabel, { fontFamily: "Inter_500Medium", color: C.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function StepIndicator({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.steps}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.step,
            { backgroundColor: i < current ? C.accent : i === current - 1 ? C.accent : "#E2E8F0" },
          ]}
        />
      ))}
    </View>
  );
}

export default function LoginWebScreen() {
  const { refreshUser } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<RegisterStep>(1);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Forgot
  const [forgotRecovery, setForgotRecovery] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Register
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  async function handleLogin() {
    const raw = loginEmail.trim();
    if (!raw || !loginPassword.trim()) { setLoginError("Please fill in all fields."); return; }
    const email = raw.includes("@") ? raw : `${raw}@afuchat.com`;
    setLoginLoading(true); setLoginError("");
    const { error } = await signInUser(email, loginPassword);
    if (error) { setLoginError("Incorrect username or password."); }
    else { await refreshUser(); }
    setLoginLoading(false);
  }

  function handleStep1Next() {
    if (!firstName.trim() || !lastName.trim()) { setRegisterError("Please enter your first and last name."); return; }
    setRegisterError("");
    const suggestion = slugify(`${firstName} ${lastName}`);
    setUsername(suggestion);
    setUsernameAvailable(null);
    setStep(2);
  }

  async function handleCheckUsername() {
    const u = username.trim().toLowerCase();
    if (!u) { setRegisterError("Please enter a username."); return; }
    if (!/^[a-z0-9._]+$/.test(u)) { setRegisterError("Letters, numbers, dots, and underscores only."); return; }
    setRegisterError(""); setCheckingUsername(true);
    const available = await isUsernameAvailable(u);
    setUsernameAvailable(available); setCheckingUsername(false);
  }

  function handleStep2Next() {
    if (usernameAvailable !== true) { setRegisterError("Please check username availability first."); return; }
    setRegisterError(""); setStep(3);
  }

  function handleStep3Next() {
    const email = notificationEmail.trim().toLowerCase();
    if (!email) { setRegisterError("Please enter your real email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setRegisterError("Please enter a valid email address."); return; }
    if (email.endsWith("@afuchat.com")) { setRegisterError("Please use a real external email (Gmail, Outlook, etc.)."); return; }
    setRegisterError(""); setStep(4);
  }

  async function handleRegister() {
    if (!password.trim() || password.length < 6) { setRegisterError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setRegisterError("Passwords don't match."); return; }
    setRegisterError(""); setRegisterLoading(true);
    const email = `${username.trim().toLowerCase()}@afuchat.com`;
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { error, userId } = await registerUser(email, password, username.trim().toLowerCase(), fullName, notificationEmail.trim().toLowerCase());
    if (error) { setRegisterError(error); setRegisterLoading(false); return; }
    setNewUserId(userId ?? null); setRegisterLoading(false); setStep(5);
  }

  async function handleFinish(skip: boolean) {
    setPhoneLoading(true);
    if (!skip && phoneNumber.trim() && newUserId) await savePhoneNumber(newUserId, phoneNumber.trim());
    await refreshUser();
    setPhoneLoading(false);
  }

  async function handleForgotPassword() {
    if (!forgotRecovery.trim()) { setForgotError("Please enter your AfuMail username."); return; }
    setForgotLoading(true); setForgotError("");
    const { error } = await sendPasswordReset(forgotRecovery.trim());
    if (error) { setForgotError(error); } else { setForgotSuccess(true); }
    setForgotLoading(false);
  }

  function reset() {
    setMode("login"); setStep(1);
    setRegisterError(""); setLoginError(""); setForgotError(""); setForgotSuccess(false);
  }

  const FEATURES = [
    { icon: "shield" as const, label: "Secure by default", desc: "End-to-end encrypted at rest" },
    { icon: "zap" as const, label: "Real-time inbox", desc: "Instant updates across all devices" },
    { icon: "layers" as const, label: "Smart categories", desc: "AI-sorted inbox, zero manual work" },
  ];

  return (
    <View style={styles.root}>
      {/* Left panel — branding */}
      <View style={[styles.leftPanel, { backgroundColor: C.leftBg }]}>
        <View style={styles.leftContent}>
          <View style={styles.leftBrand}>
            <Image source={require("../../assets/images/logo.png")} style={styles.leftLogo} resizeMode="contain" />
            <Text style={[styles.leftBrandName, { fontFamily: "Inter_700Bold", color: C.leftText }]}>AfuMail</Text>
          </View>

          <Text style={[styles.tagline, { fontFamily: "Inter_700Bold", color: C.leftText }]}>
            Your email,{"\n"}elevated.
          </Text>
          <Text style={[styles.taglineSub, { fontFamily: "Inter_400Regular", color: C.leftMuted }]}>
            A modern email experience built for the Afu ecosystem. One account, every product.
          </Text>

          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: C.leftAccent + "22" }]}>
                  <Feather name={f.icon} size={16} color={C.leftAccent} />
                </View>
                <View>
                  <Text style={[styles.featureLabel, { fontFamily: "Inter_600SemiBold", color: C.leftText }]}>{f.label}</Text>
                  <Text style={[styles.featureDesc, { fontFamily: "Inter_400Regular", color: C.leftMuted }]}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.leftFooter, { fontFamily: "Inter_400Regular", color: C.leftMuted }]}>
          © 2026 AfuChat · mail.afuchat.com
        </Text>
      </View>

      {/* Right panel — form */}
      <ScrollView
        style={[styles.rightPanel, { backgroundColor: C.rightBg }]}
        contentContainerStyle={styles.rightContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── LOGIN ── */}
        {mode === "login" && (
          <View style={styles.form}>
            <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: C.textPrimary }]}>Sign in</Text>
            <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: C.textSecondary }]}>
              Welcome back to AfuMail
            </Text>

            <View style={styles.fields}>
              <WebInput
                label="Username or email"
                value={loginEmail}
                onChange={(t) => { setLoginEmail(t); setLoginError(""); }}
                placeholder="john or john@afuchat.com"
                type="email"
                autoFocus
              />
              <WebInput
                label="Password"
                value={loginPassword}
                onChange={(t) => { setLoginPassword(t); setLoginError(""); }}
                placeholder="Your password"
                type="password"
              />

              {!!loginError && (
                <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
                  <Feather name="alert-circle" size={14} color={C.destructive} />
                  <Text style={[styles.errorText, { fontFamily: "Inter_400Regular", color: C.destructive }]}>{loginError}</Text>
                </View>
              )}

              <PrimaryBtn label="Sign In" onPress={handleLogin} loading={loginLoading} />

              <Pressable onPress={() => { setMode("forgot"); setForgotRecovery(""); setForgotError(""); setForgotSuccess(false); }} style={styles.centeredLink}>
                <Text style={[styles.linkText, { fontFamily: "Inter_400Regular", color: C.accent }]}>Forgot your password?</Text>
              </Pressable>
            </View>

            <View style={[styles.divider, { borderTopColor: C.rightBorder }]}>
              <Text style={[styles.dividerText, { fontFamily: "Inter_400Regular", color: C.textMuted }]}>Don't have an account?</Text>
            </View>
            <SecondaryBtn label="Create an AfuMail account" onPress={() => { setMode("register"); setStep(1); setRegisterError(""); }} />
          </View>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === "forgot" && (
          <View style={styles.form}>
            <Pressable onPress={reset} style={styles.backRow}>
              <Feather name="arrow-left" size={16} color={C.textSecondary} />
              <Text style={[styles.backLabel, { fontFamily: "Inter_500Medium", color: C.textSecondary }]}>Back to sign in</Text>
            </Pressable>

            {forgotSuccess ? (
              <View style={styles.successBox}>
                <View style={[styles.successIcon, { backgroundColor: "#D1FAE5" }]}>
                  <Feather name="check-circle" size={32} color={C.success} />
                </View>
                <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: C.textPrimary }]}>Check your inbox</Text>
                <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: C.textSecondary }]}>
                  A password reset link has been sent to your recovery email address.
                </Text>
                <PrimaryBtn label="Back to Sign In" onPress={reset} />
              </View>
            ) : (
              <>
                <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: C.textPrimary }]}>Reset password</Text>
                <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: C.textSecondary }]}>
                  Enter your AfuMail username. We'll send a reset link to your recovery email.
                </Text>
                <View style={styles.fields}>
                  <WebInput
                    label="Username"
                    value={forgotRecovery}
                    onChange={(t) => { setForgotRecovery(t); setForgotError(""); }}
                    placeholder="your username (e.g. john)"
                    type="username"
                    autoFocus
                  />
                  {!!forgotError && (
                    <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
                      <Feather name="alert-circle" size={14} color={C.destructive} />
                      <Text style={[styles.errorText, { fontFamily: "Inter_400Regular", color: C.destructive }]}>{forgotError}</Text>
                    </View>
                  )}
                  <PrimaryBtn label="Send Reset Link" onPress={handleForgotPassword} loading={forgotLoading} />
                </View>
              </>
            )}
          </View>
        )}

        {/* ── REGISTER ── */}
        {mode === "register" && (
          <View style={styles.form}>
            {step > 1 && (
              <Pressable onPress={() => { setStep((s) => (s > 1 ? (s - 1) as RegisterStep : s)); setRegisterError(""); }} style={styles.backRow}>
                <Feather name="arrow-left" size={16} color={C.textSecondary} />
                <Text style={[styles.backLabel, { fontFamily: "Inter_500Medium", color: C.textSecondary }]}>Back</Text>
              </Pressable>
            )}

            <StepIndicator total={4} current={step} />

            {/* Step 1 — Name */}
            {step === 1 && (
              <>
                <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: C.textPrimary }]}>Create your account</Text>
                <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: C.textSecondary }]}>What's your name?</Text>
                <View style={styles.fields}>
                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <WebInput label="First name" value={firstName} onChange={(t) => { setFirstName(t); setRegisterError(""); }} placeholder="Jane" autoFocus />
                    </View>
                    <View style={{ flex: 1 }}>
                      <WebInput label="Last name" value={lastName} onChange={(t) => { setLastName(t); setRegisterError(""); }} placeholder="Smith" />
                    </View>
                  </View>
                  {!!registerError && (
                    <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
                      <Feather name="alert-circle" size={14} color={C.destructive} />
                      <Text style={[styles.errorText, { fontFamily: "Inter_400Regular", color: C.destructive }]}>{registerError}</Text>
                    </View>
                  )}
                  <PrimaryBtn label="Continue" onPress={handleStep1Next} icon="arrow-right" />
                </View>
              </>
            )}

            {/* Step 2 — Username */}
            {step === 2 && (
              <>
                <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: C.textPrimary }]}>Choose a username</Text>
                <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: C.textSecondary }]}>
                  Your email will be <Text style={{ color: C.accent, fontFamily: "Inter_600SemiBold" }}>{username || "username"}@afuchat.com</Text>
                </Text>
                <View style={styles.fields}>
                  <WebInput
                    label="Username"
                    value={username}
                    onChange={(t) => { setUsername(slugify(t)); setUsernameAvailable(null); setRegisterError(""); }}
                    placeholder="username"
                    type="username"
                    suffix="@afuchat.com"
                    autoFocus
                    rightElement={
                      usernameAvailable === true ? <Feather name="check-circle" size={16} color={C.success} /> :
                      usernameAvailable === false ? <Feather name="x-circle" size={16} color={C.destructive} /> : undefined
                    }
                  />
                  {usernameAvailable === true && (
                    <Text style={[styles.availText, { fontFamily: "Inter_500Medium", color: C.success }]}>✓ Available</Text>
                  )}
                  {usernameAvailable === false && (
                    <Text style={[styles.availText, { fontFamily: "Inter_500Medium", color: C.destructive }]}>✗ Already taken — try another</Text>
                  )}
                  {!!registerError && (
                    <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
                      <Feather name="alert-circle" size={14} color={C.destructive} />
                      <Text style={[styles.errorText, { fontFamily: "Inter_400Regular", color: C.destructive }]}>{registerError}</Text>
                    </View>
                  )}
                  <View style={styles.twoCol}>
                    <SecondaryBtn label={checkingUsername ? "Checking…" : "Check availability"} onPress={handleCheckUsername} />
                    <PrimaryBtn label="Continue" onPress={handleStep2Next} disabled={usernameAvailable !== true} icon="arrow-right" />
                  </View>
                </View>
              </>
            )}

            {/* Step 3 — Recovery email */}
            {step === 3 && (
              <>
                <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: C.textPrimary }]}>Recovery email</Text>
                <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: C.textSecondary }]}>
                  Your real email for password reset links. This won't be your AfuMail address.
                </Text>
                <View style={styles.fields}>
                  <WebInput
                    label="Recovery email"
                    value={notificationEmail}
                    onChange={(t) => { setNotificationEmail(t); setRegisterError(""); }}
                    placeholder="you@gmail.com"
                    type="email"
                    autoFocus
                  />
                  {!!registerError && (
                    <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
                      <Feather name="alert-circle" size={14} color={C.destructive} />
                      <Text style={[styles.errorText, { fontFamily: "Inter_400Regular", color: C.destructive }]}>{registerError}</Text>
                    </View>
                  )}
                  <PrimaryBtn label="Continue" onPress={handleStep3Next} icon="arrow-right" />
                </View>
              </>
            )}

            {/* Step 4 — Password */}
            {step === 4 && (
              <>
                <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: C.textPrimary }]}>Create a password</Text>
                <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: C.textSecondary }]}>
                  At least 6 characters. Make it strong.
                </Text>
                <View style={styles.fields}>
                  <WebInput label="Password" value={password} onChange={(t) => { setPassword(t); setRegisterError(""); }} placeholder="••••••••" type="password" autoFocus />
                  <WebInput label="Confirm password" value={confirmPassword} onChange={(t) => { setConfirmPassword(t); setRegisterError(""); }} placeholder="••••••••" type="password" />
                  {!!registerError && (
                    <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
                      <Feather name="alert-circle" size={14} color={C.destructive} />
                      <Text style={[styles.errorText, { fontFamily: "Inter_400Regular", color: C.destructive }]}>{registerError}</Text>
                    </View>
                  )}
                  <PrimaryBtn label="Create Account" onPress={handleRegister} loading={registerLoading} />
                </View>
              </>
            )}

            {/* Step 5 — Phone (optional) */}
            {step === 5 && (
              <>
                <View style={[styles.successIcon, { backgroundColor: "#EFF6FF", alignSelf: "flex-start" }]}>
                  <Feather name="check-circle" size={32} color={C.accent} />
                </View>
                <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: C.textPrimary }]}>Account created!</Text>
                <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: C.textSecondary }]}>
                  Add a phone number for extra security, or skip to start using AfuMail.
                </Text>
                <View style={styles.fields}>
                  <WebInput label="Phone number (optional)" value={phoneNumber} onChange={setPhoneNumber} placeholder="+1 234 567 8900" />
                  <PrimaryBtn label="Finish & Go to Inbox" onPress={() => handleFinish(false)} loading={phoneLoading} />
                  <Pressable onPress={() => handleFinish(true)} style={styles.centeredLink}>
                    <Text style={[styles.linkText, { fontFamily: "Inter_400Regular", color: C.textMuted }]}>Skip for now</Text>
                  </Pressable>
                </View>
              </>
            )}

            {step === 1 && (
              <Pressable onPress={reset} style={styles.centeredLink}>
                <Text style={[styles.linkText, { fontFamily: "Inter_400Regular", color: C.textMuted }]}>
                  Already have an account? <Text style={{ color: C.accent }}>Sign in</Text>
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },

  // Left panel
  leftPanel: { width: 420, flexDirection: "column", padding: 48 },
  leftContent: { flex: 1, justifyContent: "center" },
  leftBrand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 48 },
  leftLogo: { width: 32, height: 32 },
  leftBrandName: { fontSize: 20, color: "#F1F5F9" },
  tagline: { fontSize: 40, lineHeight: 48, letterSpacing: -1, color: "#F1F5F9", marginBottom: 16 },
  taglineSub: { fontSize: 16, lineHeight: 26, color: "#64748B", marginBottom: 40 },
  featureList: { gap: 20 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2 },
  featureLabel: { fontSize: 14, color: "#F1F5F9", marginBottom: 3 },
  featureDesc: { fontSize: 13, color: "#64748B" },
  leftFooter: { fontSize: 12, color: "#334155", marginTop: 24 },

  // Right panel
  rightPanel: { flex: 1 },
  rightContent: { flexGrow: 1, justifyContent: "center", padding: 64, maxWidth: 480, alignSelf: "center", width: "100%" },
  form: { gap: 20, width: "100%" },
  formTitle: { fontSize: 28, letterSpacing: -0.5, color: "#0F172A" },
  formSub: { fontSize: 15, color: "#475569", marginTop: -10 },
  fields: { gap: 14 },
  twoCol: { flexDirection: "row", gap: 12 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  backLabel: { fontSize: 14 },
  steps: { flexDirection: "row", gap: 6, marginBottom: 4 },
  step: { height: 4, flex: 1, borderRadius: 2 },

  // Field
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  input: { flex: 1, fontSize: 14 },
  inputSuffix: { fontSize: 14, flexShrink: 0 },
  fieldHint: { fontSize: 12 },

  // Buttons
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 8,
    marginTop: 4,
  },
  primaryBtnLabel: { fontSize: 15, color: "#fff" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1.5,
    flex: 1,
  },
  secondaryBtnLabel: { fontSize: 14 },

  // Error / success
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  availText: { fontSize: 13 },
  successBox: { gap: 12, alignItems: "flex-start" },
  successIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },

  // Links
  divider: { borderTopWidth: 1, paddingTop: 16, alignItems: "center" },
  dividerText: { fontSize: 13, marginBottom: 10 },
  centeredLink: { alignItems: "center", paddingVertical: 4 },
  linkText: { fontSize: 14 },
});
