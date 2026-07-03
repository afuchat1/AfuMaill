import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { setNewPassword } from "@/lib/supabase";
import { W } from "./webColors";

type Tab = "overview" | "password" | "sessions";

interface Props {
  initialTab?: Tab;
}

function TabBtn({ label, icon, active, onPress }: { label: string; icon: keyof typeof Feather.glyphMap; active: boolean; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        styles.tabBtn,
        active && { borderBottomColor: W.accent, borderBottomWidth: 2 },
        hovered && !active && { backgroundColor: W.bgHover },
      ]}
    >
      <Feather name={icon} size={14} color={active ? W.accent : W.textSecondary} />
      <Text style={[styles.tabLabel, {
        fontFamily: active ? "Inter_700Bold" : "Inter_400Regular",
        color: active ? W.accent : W.textSecondary,
      }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatusCard({ icon, label, value, color, bg }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[styles.statusCard, { backgroundColor: bg, borderColor: color + "33" }]}>
      <View style={[styles.statusIconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <View>
        <Text style={[styles.statusValue, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>{value}</Text>
        <Text style={[styles.statusLabel, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>{title}</Text>
        {sub && <Text style={[styles.sectionSub, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>{sub}</Text>}
      </View>
      <View style={[styles.sectionBody, { backgroundColor: W.bgCard, borderColor: W.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({ icon, label, value, status, last }: {
  icon: keyof typeof Feather.glyphMap; label: string; value?: string;
  status?: { text: string; color: string; bg: string }; last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && { borderBottomColor: W.border, borderBottomWidth: 1 }]}>
      <Feather name={icon} size={15} color={W.textSecondary} />
      <Text style={[styles.rowLabel, { fontFamily: "Inter_500Medium", color: W.textPrimary }]}>{label}</Text>
      {value && <Text style={[styles.rowValue, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>{value}</Text>}
      {status && (
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusPillText, { fontFamily: "Inter_600SemiBold", color: status.color }]}>{status.text}</Text>
        </View>
      )}
    </View>
  );
}

// ── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ isCurrent, device, location, lastSeen, onRevoke }: {
  isCurrent: boolean; device: string; location: string; lastSeen: string; onRevoke?: () => void;
}) {
  const [revokeHovered, setRevokeHovered] = useState(false);
  return (
    <View style={[styles.sessionCard, { backgroundColor: W.bgCard, borderColor: isCurrent ? W.accent + "44" : W.border }]}>
      <View style={[styles.deviceIconWrap, { backgroundColor: isCurrent ? W.accentLight : W.bgSecondary }]}>
        <Feather name="monitor" size={20} color={isCurrent ? W.accent : W.textMuted} />
      </View>
      <View style={styles.sessionInfo}>
        <View style={styles.sessionTopRow}>
          <Text style={[styles.sessionDevice, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>{device}</Text>
          {isCurrent && (
            <View style={[styles.currentBadge, { backgroundColor: W.successLight }]}>
              <View style={[styles.currentDot, { backgroundColor: W.success }]} />
              <Text style={[styles.currentBadgeText, { fontFamily: "Inter_600SemiBold", color: W.success }]}>Current session</Text>
            </View>
          )}
        </View>
        <Text style={[styles.sessionLocation, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>{location}</Text>
        <Text style={[styles.sessionLast, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>Last active: {lastSeen}</Text>
      </View>
      {!isCurrent && onRevoke && (
        <Pressable
          onPress={onRevoke}
          onPointerEnter={() => setRevokeHovered(true)}
          onPointerLeave={() => setRevokeHovered(false)}
          style={[styles.revokeBtn, { backgroundColor: revokeHovered ? W.destructiveLight : W.bgSecondary, borderColor: revokeHovered ? W.destructive : W.border }]}
        >
          <Text style={[styles.revokeBtnLabel, { fontFamily: "Inter_600SemiBold", color: revokeHovered ? W.destructive : W.textSecondary }]}>
            Revoke
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function WebSecurityPanel({ initialTab = "overview" }: Props) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // Sessions
  const [signOutAllLoading, setSignOutAllLoading] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  async function handleChangePassword() {
    if (!newPw || newPw.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
    setPwLoading(true); setPwError("");
    const { error } = await setNewPassword(newPw);
    if (error) { setPwError(error); }
    else {
      setPwSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSuccess(false), 3000);
    }
    setPwLoading(false);
  }

  async function handleSignOutAll() {
    setSignOutAllLoading(true);
    await logout();
    setSignOutAllLoading(false);
  }

  // Detect current device via web APIs
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const deviceName = ua.includes("Mac") ? "macOS" : ua.includes("Windows") ? "Windows PC" : ua.includes("Linux") ? "Linux" : "Web Browser";
  const browserName = ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Browser";
  const currentDevice = `${deviceName} · ${browserName}`;

  return (
    <View style={[styles.root, { backgroundColor: W.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: W.border, backgroundColor: W.bg }]}>
        <View>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>
            Security &amp; Privacy
          </Text>
          <Text style={[styles.headerSub, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
            Manage how your Afu account is protected
          </Text>
        </View>
        <View style={[styles.ecosystemPill, { backgroundColor: W.bgAccentSubtle, borderColor: W.accentLight }]}>
          <Feather name="shield" size={12} color={W.accent} />
          <Text style={[styles.ecosystemText, { fontFamily: "Inter_600SemiBold", color: W.accentText }]}>Identity Provider</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: W.border, backgroundColor: W.bg }]}>
        <TabBtn icon="shield" label="Overview" active={tab === "overview"} onPress={() => setTab("overview")} />
        <TabBtn icon="lock" label="Password" active={tab === "password"} onPress={() => setTab("password")} />
        <TabBtn icon="monitor" label="Sessions &amp; Devices" active={tab === "sessions"} onPress={() => setTab("sessions")} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {tab === "overview" && (
          <>
            {/* Status cards */}
            <View style={styles.statusGrid}>
              <StatusCard icon="shield" label="Account security" value="Good" color={W.success} bg={W.successLight} />
              <StatusCard icon="mail" label="Email verification" value="Verified" color={W.success} bg={W.successLight} />
              <StatusCard icon="monitor" label="Active sessions" value="1" color={W.accent} bg={W.accentLight} />
              <StatusCard icon="smartphone" label="Two-factor auth" value="Not set up" color={W.warning} bg={W.warningLight} />
            </View>

            <Section title="Account status" sub="Your current security and account configuration">
              <Row icon="user-check" label="Account status" status={{ text: "Active", color: W.success, bg: W.successLight }} />
              <Row icon="mail" label="Email verified" status={{ text: "Verified", color: W.success, bg: W.successLight }} />
              <Row icon="shield" label="Two-factor authentication" status={{ text: "Not enabled", color: W.warning, bg: W.warningLight }} />
              <Row icon="lock" label="Password" value="Last changed recently" last />
            </Section>

            <Section title="Authentication platform" sub="AfuMail is the identity provider for all Afu applications">
              <Row icon="key" label="OAuth 2.1" status={{ text: "Supported", color: W.success, bg: W.successLight }} />
              <Row icon="user" label="OpenID Connect" status={{ text: "Supported", color: W.success, bg: W.successLight }} />
              <Row icon="link" label="Single Sign-On" status={{ text: "Active", color: W.success, bg: W.successLight }} />
              <Row icon="code" label="Developer API access" status={{ text: "Coming soon", color: W.textMuted, bg: W.bgSecondary }} last />
            </Section>

            <Section title="Security recommendations" sub="Actions to improve your account security">
              <View style={[styles.recommendRow, { borderBottomColor: W.border }]}>
                <View style={[styles.recommendIcon, { backgroundColor: W.warningLight }]}>
                  <Feather name="smartphone" size={16} color={W.warning} />
                </View>
                <View style={styles.recommendContent}>
                  <Text style={[styles.recommendTitle, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]}>
                    Set up two-factor authentication
                  </Text>
                  <Text style={[styles.recommendSub, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
                    Add an extra layer of protection to your Afu account.
                  </Text>
                </View>
                <View style={[styles.comingSoonBadge, { backgroundColor: W.bgSecondary }]}>
                  <Text style={[styles.comingSoonText, { fontFamily: "Inter_500Medium", color: W.textMuted }]}>Coming soon</Text>
                </View>
              </View>
              <View style={styles.recommendRow}>
                <View style={[styles.recommendIcon, { backgroundColor: W.accentLight }]}>
                  <Feather name="mail" size={16} color={W.accent} />
                </View>
                <View style={styles.recommendContent}>
                  <Text style={[styles.recommendTitle, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]}>
                    Add a recovery email
                  </Text>
                  <Text style={[styles.recommendSub, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
                    Ensure you can always recover access to your account.
                  </Text>
                </View>
                <Pressable
                  style={[styles.actionLink, { borderColor: W.accent }]}
                >
                  <Text style={[styles.actionLinkText, { fontFamily: "Inter_600SemiBold", color: W.accent }]}>Set up</Text>
                </Pressable>
              </View>
            </Section>
          </>
        )}

        {/* ── PASSWORD ─────────────────────────────────────────────── */}
        {tab === "password" && (
          <>
            <Section title="Change password" sub="Your password must be at least 6 characters long">
              {pwSuccess && (
                <View style={[styles.successBanner, { backgroundColor: W.successLight, borderColor: W.success + "44" }]}>
                  <Feather name="check-circle" size={15} color={W.success} />
                  <Text style={[styles.successText, { fontFamily: "Inter_500Medium", color: W.success }]}>
                    Password changed successfully.
                  </Text>
                </View>
              )}
              {!!pwError && (
                <View style={[styles.errorBanner, { backgroundColor: W.destructiveLight, borderColor: W.destructive + "44" }]}>
                  <Feather name="alert-circle" size={15} color={W.destructive} />
                  <Text style={[styles.errorText, { fontFamily: "Inter_400Regular", color: W.destructive }]}>{pwError}</Text>
                </View>
              )}
              <View style={[styles.inputRow, { borderBottomColor: W.border }]}>
                <Text style={[styles.inputLabel, { fontFamily: "Inter_500Medium", color: W.textMuted }]}>New password</Text>
                <TextInput
                  style={[styles.inputField, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
                  value={newPw}
                  onChangeText={(t) => { setNewPw(t); setPwError(""); }}
                  secureTextEntry
                  placeholder="New password (min. 6 characters)"
                  placeholderTextColor={W.textMuted}
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { fontFamily: "Inter_500Medium", color: W.textMuted }]}>Confirm password</Text>
                <TextInput
                  style={[styles.inputField, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
                  value={confirmPw}
                  onChangeText={(t) => { setConfirmPw(t); setPwError(""); }}
                  secureTextEntry
                  placeholder="Repeat new password"
                  placeholderTextColor={W.textMuted}
                />
              </View>
            </Section>
            <View style={styles.sectionAction}>
              <Pressable
                onPress={handleChangePassword}
                disabled={pwLoading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: W.accent, opacity: (pwLoading || pressed) ? 0.85 : 1 },
                ]}
              >
                {pwLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Feather name="lock" size={14} color="#fff" />
                    <Text style={[styles.primaryBtnLabel, { fontFamily: "Inter_600SemiBold" }]}>Change password</Text>
                  </>
                )}
              </Pressable>
            </View>

            <Section title="Password guidelines" sub="Best practices for keeping your account secure">
              {[
                "Use at least 12 characters",
                "Mix uppercase, lowercase, numbers, and symbols",
                "Don't reuse passwords from other websites",
                "Consider using a password manager",
              ].map((tip, i, arr) => (
                <View key={tip} style={[styles.tipRow, i < arr.length - 1 && { borderBottomColor: W.border, borderBottomWidth: 1 }]}>
                  <View style={[styles.tipDot, { backgroundColor: W.accentLight }]}>
                    <Feather name="check" size={11} color={W.accent} />
                  </View>
                  <Text style={[styles.tipText, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>{tip}</Text>
                </View>
              ))}
            </Section>
          </>
        )}

        {/* ── SESSIONS ─────────────────────────────────────────────── */}
        {tab === "sessions" && (
          <>
            <View style={styles.sessionsHeader}>
              <Text style={[styles.sessionsTitle, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]}>
                1 active session
              </Text>
              <Pressable
                onPress={handleSignOutAll}
                disabled={signOutAllLoading}
                style={({ pressed }) => [
                  styles.signOutAllBtn,
                  { backgroundColor: W.destructiveLight, borderColor: W.destructive + "66", opacity: pressed ? 0.85 : 1 },
                ]}
              >
                {signOutAllLoading ? <ActivityIndicator size="small" color={W.destructive} /> : (
                  <>
                    <Feather name="log-out" size={13} color={W.destructive} />
                    <Text style={[styles.signOutAllLabel, { fontFamily: "Inter_600SemiBold", color: W.destructive }]}>
                      Sign out all devices
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.sessionsList}>
              <SessionCard
                isCurrent
                device={currentDevice}
                location="Current location"
                lastSeen="Just now"
              />
            </View>

            <Section title="About session management" sub="How AfuMail handles your sessions">
              <Row icon="shield" label="Session encryption" status={{ text: "HTTPS", color: W.success, bg: W.successLight }} />
              <Row icon="refresh-cw" label="Token rotation" status={{ text: "Enabled", color: W.success, bg: W.successLight }} />
              <Row icon="clock" label="Session timeout" value="7 days of inactivity" />
              <Row icon="globe" label="SSO scope" value="All Afu applications" last />
            </Section>

            <View style={[styles.infoBox, { backgroundColor: W.bgAccentSubtle, borderColor: W.accentLight }]}>
              <Feather name="info" size={14} color={W.accent} />
              <Text style={[styles.infoText, { fontFamily: "Inter_400Regular", color: W.accentText }]}>
                Signing in here gives you access to all Afu applications — AfuChat, Engagera, AfuCloud, MMRadio, and more — without a separate login.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "column" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 32, paddingVertical: 20, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },
  headerSub: { fontSize: 14, marginTop: 4 },
  ecosystemPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  ecosystemText: { fontSize: 12 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 24,
  },
  tabBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 4,
    marginBottom: -1,
  },
  tabLabel: { fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 60, maxWidth: 800, alignSelf: "center", width: "100%" },
  statusGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28,
  },
  statusCard: {
    flex: 1, minWidth: 160, flexDirection: "row", alignItems: "center",
    gap: 12, padding: 16, borderRadius: 10, borderWidth: 1,
  },
  statusIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statusValue: { fontSize: 16 },
  statusLabel: { fontSize: 12, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 14 },
  sectionSub: { fontSize: 12, marginTop: 3 },
  sectionBody: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  sectionAction: { flexDirection: "row", justifyContent: "flex-end", marginTop: -12, marginBottom: 24 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14, gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 13 },
  rowValue: { fontSize: 13 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11 },
  recommendRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14, gap: 14,
  },
  recommendIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  recommendContent: { flex: 1 },
  recommendTitle: { fontSize: 13 },
  recommendSub: { fontSize: 12, marginTop: 3 },
  comingSoonBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 },
  comingSoonText: { fontSize: 11 },
  actionLink: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 7, borderWidth: 1.5,
  },
  actionLinkText: { fontSize: 13 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14, gap: 16,
  },
  inputLabel: { width: 150, fontSize: 13 },
  inputField: { flex: 1, fontSize: 14, paddingVertical: 2, outlineWidth: 0 } as any,
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  primaryBtnLabel: { color: "#fff", fontSize: 13 },
  tipRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 12, gap: 12,
  },
  tipDot: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  tipText: { flex: 1, fontSize: 13, lineHeight: 20 },
  successBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    margin: 14, padding: 12, borderRadius: 8, borderWidth: 1,
  },
  successText: { fontSize: 13 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    margin: 14, padding: 12, borderRadius: 8, borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  sessionsHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 16,
  },
  sessionsTitle: { fontSize: 15 },
  signOutAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  signOutAllLabel: { fontSize: 13 },
  sessionsList: { gap: 12, marginBottom: 28 },
  sessionCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    padding: 18, borderRadius: 12, borderWidth: 1.5,
  },
  deviceIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sessionInfo: { flex: 1, gap: 4 },
  sessionTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sessionDevice: { fontSize: 14 },
  currentBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  currentDot: { width: 6, height: 6, borderRadius: 3 },
  currentBadgeText: { fontSize: 11 },
  sessionLocation: { fontSize: 13 },
  sessionLast: { fontSize: 12 },
  revokeBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 7, borderWidth: 1.5,
  },
  revokeBtnLabel: { fontSize: 13 },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
