import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Appearance,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getPreferences, Preferences, setPref } from "@/lib/preferences";
import { getEmailStats, getProfile, savePhoneNumber, saveRecoveryEmail } from "@/lib/supabase";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  // ── Preferences ──────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState<Preferences>({
    fontSize: "Medium",
    emailDensity: "Comfortable",
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    pushNotifications: true,
    priorityNotifications: true,
    biometricLock: false,
    darkMode: false,
    readReceipts: true,
    externalImages: true,
  });

  // ── Storage stats ─────────────────────────────────────────────────────────
  const [emailCount, setEmailCount] = useState<number | null>(null);

  // ── Account Recovery state ────────────────────────────────────────────────
  const [phoneNumber, setPhoneNumber] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Modal visibility ──────────────────────────────────────────────────────
  const [phoneModal, setPhoneModal] = useState(false);
  const [recoveryModal, setRecoveryModal] = useState(false);
  const [fontSizeModal, setFontSizeModal] = useState(false);
  const [densityModal, setDensityModal] = useState(false);
  const [quietModal, setQuietModal] = useState(false);

  // ── Modal inputs ──────────────────────────────────────────────────────────
  const [phoneInput, setPhoneInput] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");

  // ── Load everything on mount ──────────────────────────────────────────────
  useEffect(() => {
    getPreferences().then(setPrefs);

    if (!user) return;
    getProfile(user.id).then((p) => {
      if (!p) return;
      setPhoneNumber(p.phone_number ?? "");
      setRecoveryEmail(p.recovery_email ?? "");
    });
    getEmailStats(user.id).then((s) => setEmailCount(s.total));
  }, [user]);

  // ── Toggle handler ────────────────────────────────────────────────────────
  async function toggleSwitch(key: keyof Preferences) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !prefs[key] as any;
    setPrefs((p) => ({ ...p, [key]: next }));
    await setPref(key, next);
    if (key === "darkMode") {
      try {
        if (typeof (Appearance as any).setColorScheme === "function") {
          (Appearance as any).setColorScheme(next ? "dark" : "light");
        }
      } catch {}
    }
  }

  // ── Row press routing ─────────────────────────────────────────────────────
  function handleRowPress(label: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (label) {
      case "Signature":
        router.push("/settings/signature");
        break;
      case "Vacation Reply":
        router.push("/settings/vacation");
        break;
      case "Connected Accounts":
        router.push("/settings/connected-accounts");
        break;
      case "Font Size":
        setFontSizeModal(true);
        break;
      case "Email Density":
        setDensityModal(true);
        break;
      case "Quiet Hours":
        setQuietStart(prefs.quietHoursStart);
        setQuietEnd(prefs.quietHoursEnd);
        setQuietModal(true);
        break;
      case "Two-Factor Auth":
        router.push("/settings/two-factor");
        break;
      case "Privacy Controls":
        router.push("/settings/privacy");
        break;
      case "Manage Storage":
        router.push("/settings/storage");
        break;
      case "Help & Support":
        router.push("/settings/support");
        break;
      case "Terms of Service":
        router.push("/settings/legal");
        break;
      case "Privacy Policy":
        router.push("/settings/legal");
        break;
    }
  }

  // ── Recovery handlers ─────────────────────────────────────────────────────
  async function handleSavePhone() {
    if (!user) return;
    setSaving(true);
    const { error } = await savePhoneNumber(user.id, phoneInput);
    setSaving(false);
    if (error) { Alert.alert("Error", error); return; }
    setPhoneNumber(phoneInput);
    setPhoneModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleSaveRecoveryEmail() {
    if (!user) return;
    setRecoveryError("");
    setSaving(true);
    const { error } = await saveRecoveryEmail(user.id, recoveryInput);
    setSaving(false);
    if (error) { setRecoveryError(error); return; }
    const full = recoveryInput.trim()
      ? recoveryInput.includes("@") ? recoveryInput.trim().toLowerCase() : `${recoveryInput.trim().toLowerCase()}@afuchat.com`
      : "";
    setRecoveryEmail(full);
    setRecoveryModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // ── Font size / density pickers ───────────────────────────────────────────
  async function pickFontSize(v: Preferences["fontSize"]) {
    await setPref("fontSize", v);
    setPrefs((p) => ({ ...p, fontSize: v }));
    setFontSizeModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function pickDensity(v: Preferences["emailDensity"]) {
    await setPref("emailDensity", v);
    setPrefs((p) => ({ ...p, emailDensity: v }));
    setDensityModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function saveQuietHours() {
    await setPref("quietHoursStart", quietStart);
    await setPref("quietHoursEnd", quietEnd);
    await setPref("quietHoursEnabled", true);
    setPrefs((p) => ({ ...p, quietHoursStart: quietStart, quietHoursEnd: quietEnd, quietHoursEnabled: true }));
    setQuietModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function disableQuietHours() {
    await setPref("quietHoursEnabled", false);
    setPrefs((p) => ({ ...p, quietHoursEnabled: false }));
    setQuietModal(false);
  }

  async function handleLogout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
  }

  // ── Dynamic section data ──────────────────────────────────────────────────
  const SECTIONS = [
    {
      title: "Account",
      rows: [
        { label: "Signature", icon: "edit-3", type: "nav" as const },
        { label: "Vacation Reply", icon: "umbrella", type: "nav" as const },
        { label: "Connected Accounts", icon: "link", type: "nav" as const },
      ],
    },
    {
      title: "Appearance",
      rows: [
        { label: "Dark Mode", icon: "moon", type: "toggle" as const, toggleKey: "darkMode" as keyof Preferences },
        { label: "Font Size", icon: "type", type: "nav" as const, value: prefs.fontSize },
        { label: "Email Density", icon: "align-justify", type: "nav" as const, value: prefs.emailDensity },
      ],
    },
    {
      title: "Notifications",
      rows: [
        { label: "Push Notifications", icon: "bell", type: "toggle" as const, toggleKey: "pushNotifications" as keyof Preferences },
        { label: "Priority Notifications", icon: "star", type: "toggle" as const, toggleKey: "priorityNotifications" as keyof Preferences },
        {
          label: "Quiet Hours",
          icon: "moon",
          type: "nav" as const,
          value: prefs.quietHoursEnabled ? `${prefs.quietHoursStart} – ${prefs.quietHoursEnd}` : "Off",
        },
      ],
    },
    {
      title: "Privacy & Security",
      rows: [
        { label: "Biometric Lock", icon: "shield", type: "toggle" as const, toggleKey: "biometricLock" as keyof Preferences },
        { label: "Two-Factor Auth", icon: "lock", type: "nav" as const },
        { label: "Privacy Controls", icon: "eye-off", type: "nav" as const },
      ],
    },
    {
      title: "Storage",
      rows: [
        {
          label: "Emails Stored",
          icon: "database",
          type: "info" as const,
          value: emailCount === null ? "Loading…" : `${emailCount} of 500`,
        },
        { label: "Manage Storage", icon: "trash-2", type: "nav" as const },
      ],
    },
    {
      title: "About",
      rows: [
        { label: "Version", icon: "info", type: "info" as const, value: "AfuMail 1.0.0" },
        { label: "Help & Support", icon: "help-circle", type: "nav" as const },
        { label: "Terms of Service", icon: "file-text", type: "nav" as const },
        { label: "Privacy Policy", icon: "shield", type: "nav" as const },
      ],
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Settings
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Profile card */}
        {user && (
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginTop: 16 }]}>
            <Avatar name={user.name} size={52} fontSize={18} />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {user.name}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {user.email}
              </Text>
            </View>
          </View>
        )}

        {/* Account Recovery */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Account Recovery</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              onPress={() => { setPhoneInput(phoneNumber); setPhoneModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={({ pressed }) => [styles.settingRow, { backgroundColor: pressed ? colors.secondary : "transparent" }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="phone" size={15} color={colors.foreground} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Recovery Phone</Text>
              <View style={styles.navRight}>
                <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{phoneNumber || "Not set"}</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <Pressable
              onPress={() => { setRecoveryInput(recoveryEmail.replace("@afuchat.com", "")); setRecoveryError(""); setRecoveryModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={({ pressed }) => [styles.settingRow, { backgroundColor: pressed ? colors.secondary : "transparent" }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="mail" size={15} color={colors.foreground} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Recovery Email</Text>
              <View style={styles.navRight}>
                <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{recoveryEmail || "Not set"}</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Dynamic sections */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.rows.map((row, idx) => (
                <View key={row.label}>
                  <Pressable
                    onPress={row.type !== "toggle" && row.type !== "info" ? () => handleRowPress(row.label) : undefined}
                    style={({ pressed }) => [
                      styles.settingRow,
                      { backgroundColor: row.type === "nav" && pressed ? colors.secondary : "transparent" },
                    ]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                      <Feather name={row.icon as any} size={15} color={colors.foreground} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: row.type === "nav" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                      {row.label}
                    </Text>
                    <View style={styles.rowRight}>
                      {row.type === "toggle" && "toggleKey" in row && row.toggleKey ? (
                        <Switch
                          value={prefs[row.toggleKey] as boolean}
                          onValueChange={() => toggleSwitch(row.toggleKey!)}
                          trackColor={{ false: colors.border, true: colors.accent }}
                          thumbColor="#FFFFFF"
                        />
                      ) : row.type === "info" ? (
                        <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                          {row.value}
                        </Text>
                      ) : (
                        <View style={styles.navRight}>
                          {"value" in row && row.value ? (
                            <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                              {row.value}
                            </Text>
                          ) : null}
                          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                        </View>
                      )}
                    </View>
                  </Pressable>
                  {idx < section.rows.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.signOutButton, { backgroundColor: pressed ? "#FFEBEE" : colors.card, borderColor: colors.border }]}
          >
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Phone Modal ── */}
      <Modal visible={phoneModal} transparent animationType="fade" onRequestClose={() => setPhoneModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setPhoneModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Recovery Phone</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Only used to verify your identity if you lose account access.
            </Text>
            <View style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[{ flex: 1, fontSize: 16, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="+1 555 000 0000"
                placeholderTextColor={colors.mutedForeground}
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setPhoneModal(false)} style={[styles.modalCancelBtn, { borderColor: colors.border }]}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSavePhone} disabled={saving} style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground }}>Save</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Recovery Email Modal ── */}
      <Modal visible={recoveryModal} transparent animationType="fade" onRequestClose={() => setRecoveryModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setRecoveryModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Recovery Email</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Another AfuMail username that can receive a password-reset link.
            </Text>
            <View style={[styles.usernameRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={{ flex: 1, fontSize: 16, color: colors.foreground, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingVertical: 13 }}
                placeholder="username"
                placeholderTextColor={colors.mutedForeground}
                value={recoveryInput}
                onChangeText={(t) => { setRecoveryInput(t); setRecoveryError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <Text style={{ fontSize: 13, paddingRight: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>@afuchat.com</Text>
            </View>
            {!!recoveryError && <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.destructive }}>{recoveryError}</Text>}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setRecoveryModal(false)} style={[styles.modalCancelBtn, { borderColor: colors.border }]}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveRecoveryEmail} disabled={saving} style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground }}>Save</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Font Size Picker ── */}
      <Modal visible={fontSizeModal} transparent animationType="fade" onRequestClose={() => setFontSizeModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setFontSizeModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Font Size</Text>
            {(["Small", "Medium", "Large"] as const).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => pickFontSize(opt)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  {
                    backgroundColor: prefs.fontSize === opt ? colors.accent + "18" : pressed ? colors.secondary : "transparent",
                    borderColor: prefs.fontSize === opt ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text style={[styles.pickerLabel, { color: colors.foreground, fontFamily: prefs.fontSize === opt ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                  {opt}
                </Text>
                {prefs.fontSize === opt && <Feather name="check" size={16} color={colors.accent} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Email Density Picker ── */}
      <Modal visible={densityModal} transparent animationType="fade" onRequestClose={() => setDensityModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setDensityModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Email Density</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Controls how much spacing appears between emails in your inbox.
            </Text>
            {(["Compact", "Comfortable"] as const).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => pickDensity(opt)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  {
                    backgroundColor: prefs.emailDensity === opt ? colors.accent + "18" : pressed ? colors.secondary : "transparent",
                    borderColor: prefs.emailDensity === opt ? colors.accent : colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerLabel, { color: colors.foreground, fontFamily: prefs.emailDensity === opt ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {opt}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 }}>
                    {opt === "Compact" ? "More emails visible at once" : "More breathing room between emails"}
                  </Text>
                </View>
                {prefs.emailDensity === opt && <Feather name="check" size={16} color={colors.accent} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Quiet Hours Modal ── */}
      <Modal visible={quietModal} transparent animationType="fade" onRequestClose={() => setQuietModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setQuietModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Quiet Hours</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Silence notifications between these times each day.
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.6 }}>Start</Text>
                <View style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput
                    style={{ flex: 1, fontSize: 18, color: colors.foreground, fontFamily: "Inter_600SemiBold", textAlign: "center" }}
                    value={quietStart}
                    onChangeText={setQuietStart}
                    placeholder="22:00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.6 }}>End</Text>
                <View style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput
                    style={{ flex: 1, fontSize: 18, color: colors.foreground, fontFamily: "Inter_600SemiBold", textAlign: "center" }}
                    value={quietEnd}
                    onChangeText={setQuietEnd}
                    placeholder="07:00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={disableQuietHours} style={[styles.modalCancelBtn, { borderColor: colors.border }]}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Turn Off</Text>
              </Pressable>
              <Pressable onPress={saveQuietHours} style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground }}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 28, letterSpacing: -0.5 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 8,
  },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 16 },
  profileEmail: { fontSize: 13 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 15 },
  rowRight: { flexShrink: 0 },
  navRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: { fontSize: 13 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  signOutText: { fontSize: 15 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 14,
  },
  modalTitle: { fontSize: 20, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 14, lineHeight: 20, marginTop: -6 },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalSaveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  pickerLabel: { flex: 1, fontSize: 15 },
});
