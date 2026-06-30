import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getProfile, savePhoneNumber, saveRecoveryEmail } from "@/lib/supabase";

interface SettingRow {
  label: string;
  icon: string;
  type: "nav" | "toggle" | "info";
  value?: string;
}

const SETTING_SECTIONS: { title: string; rows: SettingRow[] }[] = [
  {
    title: "Account",
    rows: [
      { label: "Signature", icon: "edit-3", type: "nav" },
      { label: "Vacation Reply", icon: "umbrella", type: "nav" },
      { label: "Connected Accounts", icon: "link", type: "nav" },
    ],
  },
  {
    title: "Appearance",
    rows: [
      { label: "Dark Mode", icon: "moon", type: "toggle" },
      { label: "Font Size", icon: "type", type: "nav", value: "Medium" },
      { label: "Email Density", icon: "align-justify", type: "nav", value: "Comfortable" },
    ],
  },
  {
    title: "Notifications",
    rows: [
      { label: "Push Notifications", icon: "bell", type: "toggle" },
      { label: "Priority Notifications", icon: "star", type: "toggle" },
      { label: "Quiet Hours", icon: "moon", type: "nav", value: "Off" },
    ],
  },
  {
    title: "Privacy & Security",
    rows: [
      { label: "Biometric Lock", icon: "shield", type: "toggle" },
      { label: "Two-Factor Auth", icon: "lock", type: "nav" },
      { label: "Privacy Controls", icon: "eye-off", type: "nav" },
    ],
  },
  {
    title: "Storage",
    rows: [
      { label: "Storage Used", icon: "database", type: "info", value: "2.4 GB of 15 GB" },
      { label: "Manage Storage", icon: "trash-2", type: "nav" },
    ],
  },
  {
    title: "About",
    rows: [
      { label: "Version", icon: "info", type: "info", value: "AfuMail 1.0.0" },
      { label: "Help & Support", icon: "help-circle", type: "nav" },
      { label: "Terms of Service", icon: "file-text", type: "nav" },
      { label: "Privacy Policy", icon: "shield", type: "nav" },
    ],
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    "Dark Mode": false,
    "Push Notifications": true,
    "Priority Notifications": true,
    "Biometric Lock": false,
  });

  // Recovery state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [phoneModal, setPhoneModal] = useState(false);
  const [recoveryModal, setRecoveryModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then((p) => {
      if (!p) return;
      setPhoneNumber(p.phone_number ?? "");
      setRecoveryEmail(p.recovery_email ?? "");
    });
  }, [user]);

  function toggleSwitch(label: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToggles((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleSavePhone() {
    if (!user) return;
    setSaving(true);
    const { error } = await savePhoneNumber(user.id, phoneInput);
    setSaving(false);
    if (error) {
      Alert.alert("Error", error);
      return;
    }
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
    if (error) {
      setRecoveryError(error);
      return;
    }
    const full = recoveryInput.trim()
      ? recoveryInput.includes("@")
        ? recoveryInput.trim().toLowerCase()
        : `${recoveryInput.trim().toLowerCase()}@afuchat.com`
      : "";
    setRecoveryEmail(full);
    setRecoveryModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleLogout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Profile Card */}
        {user && (
          <Pressable
            style={({ pressed }) => [
              styles.profileCard,
              {
                backgroundColor: pressed ? colors.secondary : colors.card,
                borderColor: colors.border,
                marginHorizontal: 16,
                marginTop: 16,
              },
            ]}
          >
            <Avatar name={user.name} size={52} fontSize={18} />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {user.name}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {user.email}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}

        {/* Account Recovery Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Account Recovery
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Phone number row */}
            <Pressable
              onPress={() => { setPhoneInput(phoneNumber); setPhoneModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={({ pressed }) => [styles.settingRow, { borderBottomColor: colors.border, backgroundColor: pressed ? colors.secondary : "transparent" }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="phone" size={15} color={colors.foreground} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>Recovery Phone</Text>
              <View style={styles.navRight}>
                <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {phoneNumber || "Not set"}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* Recovery email row */}
            <Pressable
              onPress={() => { setRecoveryInput(recoveryEmail.replace("@afuchat.com", "")); setRecoveryError(""); setRecoveryModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={({ pressed }) => [styles.settingRow, { borderBottomColor: colors.border, backgroundColor: pressed ? colors.secondary : "transparent" }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="mail" size={15} color={colors.foreground} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>Recovery Email</Text>
              <View style={styles.navRight}>
                <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {recoveryEmail || "Not set"}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Settings sections */}
        {SETTING_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.rows.map((row, idx) => (
                <View key={row.label}>
                  <View
                    style={[
                      styles.settingRow,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                      <Feather name={row.icon as any} size={15} color={colors.foreground} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                      {row.label}
                    </Text>
                    <View style={styles.rowRight}>
                      {row.type === "toggle" ? (
                        <Switch
                          value={toggles[row.label] ?? false}
                          onValueChange={() => toggleSwitch(row.label)}
                          trackColor={{ false: colors.border, true: colors.accent }}
                          thumbColor="#FFFFFF"
                        />
                      ) : row.type === "info" ? (
                        <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                          {row.value}
                        </Text>
                      ) : (
                        <View style={styles.navRight}>
                          {row.value && (
                            <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                              {row.value}
                            </Text>
                          )}
                          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                        </View>
                      )}
                    </View>
                  </View>
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
            style={({ pressed }) => [
              styles.signOutButton,
              {
                backgroundColor: pressed ? "#FFEBEE" : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Phone Number Modal ── */}
      <Modal visible={phoneModal} transparent animationType="fade" onRequestClose={() => setPhoneModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setPhoneModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Recovery Phone</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Your phone number is only used to verify your identity if you lose access to your account.
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
                <Text style={[{ fontSize: 15, fontFamily: "Inter_400Regular" }, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSavePhone}
                disabled={saving}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={[{ fontSize: 15, fontFamily: "Inter_600SemiBold" }, { color: colors.primaryForeground }]}>Save</Text>
                )}
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
              Enter another AfuMail username. If you forget your password, a reset link will be sent to that account.
            </Text>
            <View style={[styles.usernameRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[{ flex: 1, fontSize: 16, color: colors.foreground, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingVertical: 13 }]}
                placeholder="username"
                placeholderTextColor={colors.mutedForeground}
                value={recoveryInput}
                onChangeText={(t) => { setRecoveryInput(t); setRecoveryError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <Text style={[{ fontSize: 13, paddingRight: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>@afuchat.com</Text>
            </View>
            {!!recoveryError && (
              <Text style={[{ fontSize: 13, paddingLeft: 2, fontFamily: "Inter_400Regular" }, { color: colors.destructive }]}>{recoveryError}</Text>
            )}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setRecoveryModal(false)} style={[styles.modalCancelBtn, { borderColor: colors.border }]}>
                <Text style={[{ fontSize: 15, fontFamily: "Inter_400Regular" }, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveRecoveryEmail}
                disabled={saving}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={[{ fontSize: 15, fontFamily: "Inter_600SemiBold" }, { color: colors.primaryForeground }]}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 8,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 16,
  },
  profileEmail: {
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
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
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
  rowRight: {
    flexShrink: 0,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  signOutText: {
    fontSize: 15,
  },
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
  modalTitle: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -6,
  },
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
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
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
});
