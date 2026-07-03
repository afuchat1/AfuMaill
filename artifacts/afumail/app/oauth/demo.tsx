import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "@/lib/pkce";

const DEMO_CLIENT_ID = "afumail-demo-app";
const DEMO_REDIRECT_URI =
  Platform.OS === "web" ? Linking.createURL("/oauth/demo-callback") : "afumail://oauth/demo-callback";

export default function OAuthDemoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  async function startDemoFlow() {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    await AsyncStorage.setItem(
      "oauth_demo_pkce",
      JSON.stringify({ codeVerifier, state, redirectUri: DEMO_REDIRECT_URI })
    );

    const authorizeUrl = Linking.createURL("/oauth/authorize", {
      queryParams: {
        client_id: DEMO_CLIENT_ID,
        redirect_uri: DEMO_REDIRECT_URI,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        scope: "profile email",
        state,
      },
    });

    router.push(authorizeUrl as never);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          OAuth Demo
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
          <Feather name="shield" size={28} color={colors.foreground} />
        </View>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Try real "Sign in with AfuMail"
        </Text>
        <Text style={[styles.body1, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          This simulates a third-party Afu app ("AfuMail OAuth Demo") asking to sign a user in with their
          AfuMail account, using the standard OAuth 2.1 Authorization Code flow with PKCE — the same flow
          any real Afu app (AfuChat, AfuCloud, Engagera, MMRadio) would use.
        </Text>

        <View style={[styles.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Step colors={colors} n={1} label="A demo app requests access to your AfuMail identity" />
          <Step colors={colors} n={2} label="You approve or deny on a real consent screen" />
          <Step colors={colors} n={3} label="AfuMail issues a one-time code, then an access token" />
          <Step colors={colors} n={4} label="The demo app fetches your profile via /oauth/userinfo" />
        </View>

        <Pressable onPress={startDemoFlow} style={[styles.cta, { backgroundColor: colors.foreground }]}>
          <Text style={[styles.ctaText, { color: colors.background, fontFamily: "Inter_600SemiBold" }]}>
            Start the demo
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Step({ colors, n, label }: { colors: ReturnType<typeof useColors>; n: number; label: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepNum, { backgroundColor: colors.secondary }]}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{n}</Text>
      </View>
      <Text style={[styles.stepText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
    </View>
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
  headerTitle: { flex: 1, fontSize: 18, letterSpacing: -0.3 },
  body: { padding: 24, alignItems: "center", gap: 14 },
  iconCircle: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, textAlign: "center" },
  body1: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  stepsCard: { width: "100%", borderWidth: 1, borderRadius: 16, padding: 16, gap: 14, marginTop: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 13, flex: 1, lineHeight: 19 },
  cta: { width: "100%", paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  ctaText: { fontSize: 15 },
});
