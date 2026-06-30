import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

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

  function toggleSwitch(label: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToggles((prev) => ({ ...prev, [label]: !prev[label] }));
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
});
