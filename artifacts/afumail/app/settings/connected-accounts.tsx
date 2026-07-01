import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { SwipeBackView } from "@/components/SwipeBackView";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ConnectedAccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <SwipeBackView>
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Connected Accounts
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ padding: 20, gap: 16 }}>
        {user && (
          <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Avatar name={user.name} size={48} fontSize={16} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.accountName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {user.name}
              </Text>
              <Text style={[styles.accountEmail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {user.email}
              </Text>
              <View style={[styles.badge, { backgroundColor: colors.accent + "22" }]}>
                <Text style={[styles.badgeText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                  Primary account
                </Text>
              </View>
            </View>
            <View style={[styles.activeIndicator, { backgroundColor: colors.success }]} />
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={18} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            To use multiple AfuMail accounts, sign out and log in with a different account. Multi-account switching is coming soon.
          </Text>
        </View>
      </View>
    </View>
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, letterSpacing: -0.3 },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  accountName: { fontSize: 15 },
  accountEmail: { fontSize: 13 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  badgeText: { fontSize: 11 },
  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  infoCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
