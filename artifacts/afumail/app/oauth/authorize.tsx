import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiUrl } from "@/lib/api-base";
import { supabase } from "@/lib/supabase";

interface ClientInfo {
  clientId: string;
  name: string;
  logoUrl: string | null;
  scopes: string[];
  isFirstParty: boolean;
}

const SCOPE_LABELS: Record<string, string> = {
  profile: "Your name and username",
  email: "Your AfuMail email address",
};

export default function OAuthAuthorizeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    client_id?: string;
    redirect_uri?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    scope?: string;
    state?: string;
  }>();

  const [client, setClient] = useState<ClientInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { client_id, redirect_uri, code_challenge, code_challenge_method, scope, state } = params;

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!client_id || !redirect_uri || !code_challenge) {
        setError("This authorization link is missing required parameters.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          apiUrl(`/api/oauth/clients/${encodeURIComponent(client_id)}?redirect_uri=${encodeURIComponent(redirect_uri)}`)
        );
        const data = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          setError(data.error ?? "This app is not registered with AfuMail.");
        } else {
          setClient(data);
        }
      } catch {
        if (mounted) setError("Network error. Please check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [client_id, redirect_uri, code_challenge]);

  async function handleDecision(approve: boolean) {
    if (!redirect_uri) return;
    if (!approve) {
      const denyUrl = `${redirect_uri}${redirect_uri.includes("?") ? "&" : "?"}error=access_denied${
        state ? `&state=${encodeURIComponent(state)}` : ""
      }`;
      await Linking.openURL(denyUrl);
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError("Your AfuMail session expired. Please sign in again.");
        return;
      }

      const res = await fetch(apiUrl("/api/oauth/authorize"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          client_id,
          redirect_uri,
          code_challenge,
          code_challenge_method: code_challenge_method ?? "S256",
          scope: scope ?? "profile email",
          state,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to authorize this app.");
        return;
      }

      const callbackUrl = `${redirect_uri}${redirect_uri.includes("?") ? "&" : "?"}code=${encodeURIComponent(
        data.code
      )}${data.state ? `&state=${encodeURIComponent(data.state)}` : ""}`;
      await Linking.openURL(callbackUrl);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const scopes = scope ? scope.split(" ") : client?.scopes ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.foreground} />
          </View>
        )}

        {!loading && error && (
          <View style={styles.center}>
            <Feather name="alert-triangle" size={40} color={colors.destructive ?? "#DC2626"} />
            <Text style={[styles.errorTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Can't authorize this app
            </Text>
            <Text style={[styles.errorMsg, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {error}
            </Text>
            {Platform.OS !== "web" && (
              <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.secondary }]}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
              </Pressable>
            )}
          </View>
        )}

        {!loading && !error && client && (
          <View style={styles.card}>
            <View style={styles.appIconRow}>
              <Avatar name={client.name} size={56} fontSize={20} />
              <Feather name="arrow-right" size={18} color={colors.mutedForeground} style={{ marginHorizontal: 12 }} />
              <View style={[styles.afuIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="mail" size={24} color={colors.foreground} />
              </View>
            </View>

            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {client.name} wants to access your AfuMail account
            </Text>

            {user && (
              <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Signing in as {user.email}
              </Text>
            )}

            <View style={[styles.scopeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.scopeHeading, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                This will allow {client.name} to:
              </Text>
              {scopes.map((s) => (
                <View key={s} style={styles.scopeRow}>
                  <Feather name="check" size={16} color={colors.success ?? "#16A34A"} />
                  <Text style={[styles.scopeText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                    {SCOPE_LABELS[s] ?? s}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              disabled={submitting}
              onPress={() => handleDecision(true)}
              style={[styles.primaryButton, { backgroundColor: colors.foreground, opacity: submitting ? 0.6 : 1 }]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: colors.background, fontFamily: "Inter_600SemiBold" }]}>
                  Allow
                </Text>
              )}
            </Pressable>

            <Pressable
              disabled={submitting}
              onPress={() => handleDecision(false)}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Deny
              </Text>
            </Pressable>

            <Text style={[styles.footnote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              You can revoke access anytime from Settings → Connected Accounts.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 80 },
  errorTitle: { fontSize: 18, textAlign: "center" },
  errorMsg: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 320 },
  backButton: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  card: { width: "100%", maxWidth: 420, alignItems: "center", gap: 16 },
  appIconRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  afuIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, textAlign: "center", lineHeight: 27 },
  subtitle: { fontSize: 14, textAlign: "center" },
  scopeBox: { width: "100%", borderWidth: 1, borderRadius: 16, padding: 16, gap: 10, marginTop: 4 },
  scopeHeading: { fontSize: 14, marginBottom: 4 },
  scopeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scopeText: { fontSize: 14, flex: 1 },
  primaryButton: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { fontSize: 15 },
  secondaryButton: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 15 },
  footnote: { fontSize: 12, textAlign: "center", marginTop: 8, maxWidth: 320, lineHeight: 17 },
});
