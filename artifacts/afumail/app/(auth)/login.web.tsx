import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
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
import { W } from "@/components/web/webColors";

type Mode = "login" | "register" | "forgot";
type RegStep = 1 | 2 | 3 | 4 | 5;

function slugify(t: string) {
  return t.toLowerCase().trim().replace(/\s+/g, "").replace(/[^a-z0-9._]/g, "");
}

// ── Shared form field ────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = "text", autoFocus = false,
  suffix, hint, rightEl,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoFocus?: boolean;
  suffix?: string; hint?: string; rightEl?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={[f.label, { fontFamily: "Inter_500Medium", color: W.textSecondary }]}>{label}</Text>
      <View style={[
        f.inputWrap,
        { borderColor: focused ? W.accent : W.border, backgroundColor: W.bgCard },
      ]}>
        <TextInput
          style={[f.input, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={W.textMuted}
          secureTextEntry={type === "password"}
          keyboardType={type === "email" ? "email-address" : "default"}
          autoCapitalize={type === "email" || type === "username" ? "none" : "words"}
          autoCorrect={false}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {suffix && <Text style={[f.suffix, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>{suffix}</Text>}
        {rightEl}
      </View>
      {hint && <Text style={[f.hint, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>{hint}</Text>}
    </View>
  );
}
const f = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11, gap: 6,
  },
  input: { flex: 1, fontSize: 14 },
  suffix: { fontSize: 14, flexShrink: 0 },
  hint: { fontSize: 12, lineHeight: 18 },
});

// ── Primary button ────────────────────────────────────────────────────────────

function PrimaryBtn({ label, onPress, loading, disabled, icon }: {
  label: string; onPress: () => void; loading?: boolean;
  disabled?: boolean; icon?: keyof typeof Feather.glyphMap;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        pb.root,
        { backgroundColor: disabled ? W.border : hovered ? W.accentHover : W.accent, opacity: loading ? 0.8 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : (
        <>
          <Text style={[pb.label, { fontFamily: "Inter_700Bold" }]}>{label}</Text>
          {icon && <Feather name={icon} size={15} color="#fff" />}
        </>
      )}
    </Pressable>
  );
}
const pb = StyleSheet.create({
  root: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 8, marginTop: 4,
  },
  label: { fontSize: 15, color: "#fff" },
});

// ── Step indicator ────────────────────────────────────────────────────────────

function StepBar({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 5, marginBottom: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 3, flex: 1, borderRadius: 2,
            backgroundColor: i < current ? W.accent : W.border,
          }}
        />
      ))}
    </View>
  );
}

// ── Error box ────────────────────────────────────────────────────────────────

function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={[eb.root, { backgroundColor: W.destructiveLight, borderColor: W.destructive + "44" }]}>
      <Feather name="alert-circle" size={14} color={W.destructive} />
      <Text style={[eb.text, { fontFamily: "Inter_400Regular", color: W.destructive }]}>{msg}</Text>
    </View>
  );
}
const eb = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  text: { fontSize: 13, flex: 1 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LoginWebScreen() {
  const { refreshUser } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<RegStep>(1);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState("");

  // Forgot state
  const [forgotUser, setForgotUser] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotErr, setForgotErr] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Register state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [username, setUsername]   = useState("");
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);
  const [notifEmail, setNotifEmail] = useState("");
  const [password, setPassword]   = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [phone, setPhone]         = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regErr, setRegErr]       = useState("");
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  // ── handlers ────────────────────────────────────────────────────────────────

  async function handleLogin() {
    const raw = loginEmail.trim();
    if (!raw || !loginPw.trim()) { setLoginErr("Please fill in all fields."); return; }
    const email = raw.includes("@") ? raw : `${raw}@afuchat.com`;
    setLoginLoading(true); setLoginErr("");
    const { error } = await signInUser(email, loginPw);
    if (error) setLoginErr("Incorrect username or password.");
    else await refreshUser();
    setLoginLoading(false);
  }

  function step1Next() {
    if (!firstName.trim() || !lastName.trim()) { setRegErr("Please enter your first and last name."); return; }
    setRegErr("");
    setUsername(slugify(`${firstName}${lastName}`));
    setUsernameOk(null);
    setStep(2);
  }

  async function checkUsername() {
    const u = username.trim().toLowerCase();
    if (!u) { setRegErr("Please enter a username."); return; }
    if (!/^[a-z0-9._]+$/.test(u)) { setRegErr("Letters, numbers, dots and underscores only."); return; }
    setRegErr(""); setCheckingUser(true);
    const ok = await isUsernameAvailable(u);
    setUsernameOk(ok); setCheckingUser(false);
  }

  function step2Next() {
    if (usernameOk !== true) { setRegErr("Please check username availability first."); return; }
    setRegErr(""); setStep(3);
  }

  function step3Next() {
    const e = notifEmail.trim().toLowerCase();
    if (!e) { setRegErr("Please enter your recovery email."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setRegErr("Please enter a valid email address."); return; }
    if (e.endsWith("@afuchat.com")) { setRegErr("Use an external email (Gmail, Outlook, etc.)."); return; }
    setRegErr(""); setStep(4);
  }

  async function handleRegister() {
    if (!password.trim() || password.length < 6) { setRegErr("Password must be at least 6 characters."); return; }
    if (password !== confirmPw) { setRegErr("Passwords don't match."); return; }
    setRegErr(""); setRegLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { error, userId } = await registerUser(
      `${username.trim().toLowerCase()}@afuchat.com`,
      password,
      username.trim().toLowerCase(),
      fullName,
      notifEmail.trim().toLowerCase(),
    );
    if (error) { setRegErr(error); setRegLoading(false); return; }
    setNewUserId(userId ?? null);
    setRegLoading(false);
    setStep(5);
  }

  async function handleFinish(skip: boolean) {
    setPhoneLoading(true);
    if (!skip && phone.trim() && newUserId) await savePhoneNumber(newUserId, phone.trim());
    await refreshUser();
    setPhoneLoading(false);
  }

  async function handleForgot() {
    if (!forgotUser.trim()) { setForgotErr("Please enter your AfuMail username."); return; }
    setForgotLoading(true); setForgotErr("");
    const { error } = await sendPasswordReset(forgotUser.trim());
    if (error) setForgotErr(error);
    else setForgotSent(true);
    setForgotLoading(false);
  }

  function reset() {
    setMode("login"); setStep(1);
    setRegErr(""); setLoginErr(""); setForgotErr(""); setForgotSent(false);
  }

  // ── Left panel features ──────────────────────────────────────────────────────
  const FEATURES = [
    { icon: "mail" as const,   title: "One inbox, every device",      desc: "Real-time sync across web and mobile" },
    { icon: "globe" as const,  title: "Single Sign-On identity",      desc: "One account for the entire Afu platform" },
    { icon: "shield" as const, title: "Enterprise-grade security",    desc: "OAuth 2.1 · OIDC · encrypted at rest" },
    { icon: "zap" as const,    title: "Smart inbox categories",       desc: "AI-powered sorting, zero effort" },
  ];

  return (
    <View style={styles.root}>
      {/* ── LEFT PANEL — Brand ──────────────────────────────────────────── */}
      <View style={[styles.leftPanel, { backgroundColor: "#0F172A" }]}>
        <View style={styles.leftInner}>
          {/* Brand mark */}
          <View style={styles.brandRow}>
            <Image source={require("../../assets/images/logo.png")} style={styles.brandLogo} resizeMode="contain" />
            <Text style={[styles.brandName, { fontFamily: "Inter_700Bold" }]}>AfuMail</Text>
          </View>

          {/* Ecosystem badge */}
          <View style={styles.ecosystemBadge}>
            <Feather name="globe" size={11} color="#4D9FEC" />
            <Text style={[styles.ecosystemText, { fontFamily: "Inter_600SemiBold" }]}>Afu Ecosystem Identity Platform</Text>
          </View>

          <View style={styles.leftDivider} />

          {/* Tagline */}
          <Text style={[styles.tagline, { fontFamily: "Inter_700Bold" }]}>
            Your identity.{"\n"}Your email.{"\n"}One account.
          </Text>
          <Text style={[styles.taglineSub, { fontFamily: "Inter_400Regular" }]}>
            Create one AfuMail account and use it across every Afu application — no separate signups, ever.
          </Text>

          {/* Features */}
          <View style={styles.featureList}>
            {FEATURES.map((ft) => (
              <View key={ft.title} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Feather name={ft.icon} size={15} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureTitle, { fontFamily: "Inter_600SemiBold" }]}>{ft.title}</Text>
                  <Text style={[styles.featureDesc, { fontFamily: "Inter_400Regular" }]}>{ft.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.leftFooter}>
          <View style={styles.leftFooterDivider} />
          <Text style={[styles.leftFooterText, { fontFamily: "Inter_400Regular" }]}>
            mail.afuchat.com · © 2026 AfuChat
          </Text>
          <View style={styles.leftFooterApps}>
            {["AfuChat", "Engagera", "AfuCloud", "MMRadio"].map((app) => (
              <View key={app} style={styles.appPill}>
                <Text style={[styles.appPillText, { fontFamily: "Inter_500Medium" }]}>{app}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── RIGHT PANEL — Form ──────────────────────────────────────────── */}
      <ScrollView
        style={[styles.rightPanel, { backgroundColor: W.bg }]}
        contentContainerStyle={styles.rightContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── LOGIN ── */}
        {mode === "login" && (
          <View style={styles.form}>
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>Sign in</Text>
              <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>
                Access your AfuMail inbox and Afu account
              </Text>
            </View>

            <View style={styles.fields}>
              <Field
                label="Username or email"
                value={loginEmail}
                onChange={(t) => { setLoginEmail(t); setLoginErr(""); }}
                placeholder="john or john@afuchat.com"
                type="email"
                autoFocus
              />
              <Field
                label="Password"
                value={loginPw}
                onChange={(t) => { setLoginPw(t); setLoginErr(""); }}
                placeholder="Your password"
                type="password"
              />
              {loginErr ? <ErrorBox msg={loginErr} /> : null}
              <PrimaryBtn label="Sign In" onPress={handleLogin} loading={loginLoading} />
              <Pressable
                onPress={() => { setMode("forgot"); setForgotSent(false); setForgotErr(""); }}
                style={styles.centeredLink}
              >
                <Text style={[styles.link, { fontFamily: "Inter_400Regular", color: W.accent }]}>Forgot your password?</Text>
              </Pressable>
            </View>

            <View style={[styles.divider, { borderTopColor: W.border }]}>
              <Text style={[styles.dividerText, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
                New to AfuMail?
              </Text>
            </View>
            <Pressable
              onPress={() => { setMode("register"); setStep(1); setRegErr(""); }}
              style={({ pressed }) => [
                styles.outlineBtn,
                { backgroundColor: pressed ? W.bgHover : W.bgCard, borderColor: W.border },
              ]}
            >
              <Text style={[styles.outlineBtnLabel, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]}>
                Create your Afu account
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === "forgot" && (
          <View style={styles.form}>
            <Pressable onPress={reset} style={styles.backRow}>
              <Feather name="arrow-left" size={15} color={W.textSecondary} />
              <Text style={[styles.backLabel, { fontFamily: "Inter_500Medium", color: W.textSecondary }]}>Back to sign in</Text>
            </Pressable>

            {forgotSent ? (
              <View style={styles.successState}>
                <View style={[styles.successIcon, { backgroundColor: W.successLight }]}>
                  <Feather name="check-circle" size={36} color={W.success} />
                </View>
                <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>Check your inbox</Text>
                <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>
                  A reset link has been sent to your recovery email address.
                </Text>
                <PrimaryBtn label="Back to Sign In" onPress={reset} />
              </View>
            ) : (
              <>
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>Reset password</Text>
                  <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>
                    Enter your AfuMail username. We'll send a reset link to your recovery email.
                  </Text>
                </View>
                <View style={styles.fields}>
                  <Field
                    label="Username"
                    value={forgotUser}
                    onChange={(t) => { setForgotUser(t); setForgotErr(""); }}
                    placeholder="yourusername"
                    type="username"
                    autoFocus
                  />
                  {forgotErr ? <ErrorBox msg={forgotErr} /> : null}
                  <PrimaryBtn label="Send Reset Link" onPress={handleForgot} loading={forgotLoading} />
                </View>
              </>
            )}
          </View>
        )}

        {/* ── REGISTER ── */}
        {mode === "register" && (
          <View style={styles.form}>
            {step > 1 && (
              <Pressable
                onPress={() => { setStep((s) => (s > 1 ? (s - 1) as RegStep : s)); setRegErr(""); }}
                style={styles.backRow}
              >
                <Feather name="arrow-left" size={15} color={W.textSecondary} />
                <Text style={[styles.backLabel, { fontFamily: "Inter_500Medium", color: W.textSecondary }]}>Back</Text>
              </Pressable>
            )}

            <StepBar total={4} current={step} />

            {/* Step 1 — Name */}
            {step === 1 && (
              <>
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>Create your account</Text>
                  <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>What's your name?</Text>
                </View>
                <View style={styles.fields}>
                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Field label="First name" value={firstName} onChange={(t) => { setFirstName(t); setRegErr(""); }} placeholder="Jane" autoFocus />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="Last name" value={lastName} onChange={(t) => { setLastName(t); setRegErr(""); }} placeholder="Smith" />
                    </View>
                  </View>
                  {regErr ? <ErrorBox msg={regErr} /> : null}
                  <PrimaryBtn label="Continue" onPress={step1Next} icon="arrow-right" />
                </View>
                <Pressable onPress={reset} style={styles.centeredLink}>
                  <Text style={[styles.link, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
                    Already have an account? <Text style={{ color: W.accent }}>Sign in</Text>
                  </Text>
                </Pressable>
              </>
            )}

            {/* Step 2 — Username */}
            {step === 2 && (
              <>
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>Choose your username</Text>
                  <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>
                    Your email will be{" "}
                    <Text style={{ color: W.accent, fontFamily: "Inter_600SemiBold" }}>
                      {username || "username"}@afuchat.com
                    </Text>
                  </Text>
                </View>
                <View style={styles.fields}>
                  <Field
                    label="Username"
                    value={username}
                    onChange={(t) => { setUsername(slugify(t)); setUsernameOk(null); setRegErr(""); }}
                    placeholder="username"
                    type="username"
                    suffix="@afuchat.com"
                    autoFocus
                    rightEl={
                      usernameOk === true ? <Feather name="check-circle" size={16} color={W.success} /> :
                      usernameOk === false ? <Feather name="x-circle" size={16} color={W.destructive} /> : undefined
                    }
                  />
                  {usernameOk === true && <Text style={[styles.availOk, { fontFamily: "Inter_500Medium", color: W.success }]}>✓ Available</Text>}
                  {usernameOk === false && <Text style={[styles.availErr, { fontFamily: "Inter_500Medium", color: W.destructive }]}>✗ Already taken — try another</Text>}
                  {regErr ? <ErrorBox msg={regErr} /> : null}
                  <View style={styles.twoCol}>
                    <Pressable
                      onPress={checkUsername}
                      style={({ pressed }) => [
                        styles.outlineBtn,
                        { flex: 1, backgroundColor: pressed ? W.bgHover : W.bgCard, borderColor: W.border },
                      ]}
                    >
                      <Text style={[styles.outlineBtnLabel, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]}>
                        {checkingUser ? "Checking…" : "Check"}
                      </Text>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <PrimaryBtn label="Continue" onPress={step2Next} disabled={usernameOk !== true} icon="arrow-right" />
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Step 3 — Recovery email */}
            {step === 3 && (
              <>
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>Recovery email</Text>
                  <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>
                    Your real email for password resets and security alerts. Not your AfuMail address.
                  </Text>
                </View>
                <View style={styles.fields}>
                  <Field
                    label="Recovery email"
                    value={notifEmail}
                    onChange={(t) => { setNotifEmail(t); setRegErr(""); }}
                    placeholder="you@gmail.com"
                    type="email"
                    autoFocus
                  />
                  {regErr ? <ErrorBox msg={regErr} /> : null}
                  <PrimaryBtn label="Continue" onPress={step3Next} icon="arrow-right" />
                </View>
              </>
            )}

            {/* Step 4 — Password */}
            {step === 4 && (
              <>
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>Create a password</Text>
                  <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>
                    At least 6 characters. Use something strong.
                  </Text>
                </View>
                <View style={styles.fields}>
                  <Field label="Password" value={password} onChange={(t) => { setPassword(t); setRegErr(""); }} placeholder="Min. 6 characters" type="password" autoFocus />
                  <Field label="Confirm password" value={confirmPw} onChange={(t) => { setConfirmPw(t); setRegErr(""); }} placeholder="Repeat password" type="password" />
                  {regErr ? <ErrorBox msg={regErr} /> : null}
                  <PrimaryBtn label="Create Account" onPress={handleRegister} loading={regLoading} />
                </View>
              </>
            )}

            {/* Step 5 — Phone (optional) */}
            {step === 5 && (
              <>
                <View style={[styles.successIcon, { backgroundColor: W.accentLight, alignSelf: "flex-start" }]}>
                  <Feather name="check-circle" size={36} color={W.accent} />
                </View>
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>Account created!</Text>
                  <Text style={[styles.formSub, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>
                    Add a phone number for extra security (optional), or go straight to your inbox.
                  </Text>
                </View>
                <View style={styles.fields}>
                  <Field label="Phone number" value={phone} onChange={setPhone} placeholder="+1 234 567 8900" />
                  <PrimaryBtn label="Go to Inbox" onPress={() => handleFinish(false)} loading={phoneLoading} />
                  <Pressable onPress={() => handleFinish(true)} style={styles.centeredLink}>
                    <Text style={[styles.link, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>Skip for now</Text>
                  </Pressable>
                </View>
              </>
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
  leftPanel: { width: 400, flexDirection: "column" },
  leftInner: { flex: 1, padding: 40, justifyContent: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  brandLogo: { width: 28, height: 28 },
  brandName: { fontSize: 20, color: "#F1F5F9" },
  ecosystemBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#0F2442", borderWidth: 1, borderColor: "#1E3A5F",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 28,
  },
  ecosystemText: { fontSize: 11, color: "#4D9FEC" },
  leftDivider: { height: 1, backgroundColor: "#1E293B", marginBottom: 28 },
  tagline: { fontSize: 34, lineHeight: 42, letterSpacing: -0.8, color: "#F1F5F9", marginBottom: 14 },
  taglineSub: { fontSize: 14, lineHeight: 22, color: "#64748B", marginBottom: 32 },
  featureList: { gap: 16 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  featureIconWrap: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: "#0F2442", borderWidth: 1, borderColor: "#1E3A5F",
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  featureTitle: { fontSize: 13, color: "#F1F5F9", marginBottom: 2 },
  featureDesc: { fontSize: 12, color: "#64748B", lineHeight: 18 },
  leftFooter: { padding: 32, paddingTop: 20 },
  leftFooterDivider: { height: 1, backgroundColor: "#1E293B", marginBottom: 16 },
  leftFooterText: { fontSize: 12, color: "#334155", marginBottom: 10 },
  leftFooterApps: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  appPill: {
    backgroundColor: "#1E293B", borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  appPillText: { fontSize: 11, color: "#94A3B8" },

  // Right panel
  rightPanel: { flex: 1 },
  rightContent: {
    flexGrow: 1, justifyContent: "center",
    paddingHorizontal: 64, paddingVertical: 48,
    maxWidth: 500, alignSelf: "center", width: "100%",
  },
  form: { gap: 20, width: "100%" },
  formHeader: { gap: 6 },
  formTitle: { fontSize: 26, letterSpacing: -0.5 },
  formSub: { fontSize: 14, lineHeight: 22 },
  fields: { gap: 14 },
  twoCol: { flexDirection: "row", gap: 10 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  backLabel: { fontSize: 14 },
  divider: { borderTopWidth: 1, paddingTop: 16, alignItems: "center" },
  dividerText: { fontSize: 13, marginBottom: 12 },
  centeredLink: { alignItems: "center", paddingVertical: 4 },
  link: { fontSize: 14 },
  outlineBtn: {
    borderWidth: 1.5, borderRadius: 8,
    paddingVertical: 12, alignItems: "center", justifyContent: "center",
  },
  outlineBtnLabel: { fontSize: 14 },
  successState: { gap: 14, alignItems: "flex-start" },
  successIcon: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  availOk: { fontSize: 13 },
  availErr: { fontSize: 13 },
});
