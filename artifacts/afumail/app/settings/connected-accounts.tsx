import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { SwipeBackView } from "@/components/SwipeBackView";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiUrl } from "@/lib/api-base";
import { supabase } from "@/lib/supabase";

interface Grant {
  clientId: string;
  name: string;
  logoUrl: string | null;
  scopes: string[];
  authorizedAt: string;
}

export default function ConnectedAccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadGrants = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch(apiUrl("/api/oauth/grants"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setGrants(json.grants ?? []);
      }
    } catch {
      // silently ignore — grants list is best-effort
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGrants();
  }, [loadGrants]);

  async function revoke(clientId: string, name: string) {
    Alert.alert(`Remove access for ${name}?`, "This app will no longer be able to sign you in or read your profile.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setRevoking(clientId);
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            await fetch(apiUrl(`/api/oauth/grants/${encodeURIComponent(clientId)}`), {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            setGrants((prev) => prev.filter((g) => g.clientId !== clientId));
          } finally {
            setRevoking(null);
          }
        },
      },
    ]);
  }

  return (
    <SwipeBackView>
      {(goBack) => (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
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

        <View style={{ gap: 8 }}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            Apps signed in with AfuMail
          </Text>

          {loading && (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <ActivityIndicator color={colors.foreground} />
            </View>
          )}

          {!loading && grants.length === 0 && (
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="shield" size={18} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No apps have used "Sign in with AfuMail" yet. Try the live demo below to see it in action.
              </Text>
            </View>
          )}

          {grants.map((grant) => (
            <View key={grant.clientId} style={[styles.grantCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Avatar name={grant.name} size={40} fontSize={14} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.grantName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {grant.name}
                </Text>
                <Text style={[styles.grantScopes, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Access: {grant.scopes.join(", ")}
                </Text>
              </View>
              <Pressable
                onPress={() => revoke(grant.clientId, grant.name)}
                disabled={revoking === grant.clientId}
                style={[styles.revokeBtn, { borderColor: colors.destructive }]}
              >
                {revoking === grant.clientId ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                    Remove
                  </Text>
                )}
              </Pressable>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.push("/oauth/demo")}
          style={[styles.demoBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="play-circle" size={18} color={colors.foreground} />
          <Text style={[styles.demoBtnText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Try the "Sign in with AfuMail" demo
          </Text>
        </Pressable>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={18} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            To use multiple AfuMail accounts, sign out and log in with a different account. Multi-account switching is coming soon.
          </Text>
        </View>
      </View>
    </View>
      )}
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
  sectionLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  grantCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  grantName: { fontSize: 14 },
  grantScopes: { fontSize: 12 },
  revokeBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 68,
    alignItems: "center",
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  demoBtnText: { fontSize: 14 },
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
