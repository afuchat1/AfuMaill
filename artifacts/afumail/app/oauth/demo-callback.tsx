import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { apiUrl } from "@/lib/api-base";

const DEMO_CLIENT_ID = "afumail-demo-app";

interface UserInfo {
  sub: string;
  preferred_username: string;
  name: string;
  email: string;
}

export default function OAuthDemoCallbackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    async function run() {
      if (params.error) {
        setStatus("error");
        setErrorMsg("Access was denied.");
        return;
      }
      if (!params.code) {
        setStatus("error");
        setErrorMsg("No authorization code was returned.");
        return;
      }

      const stored = await AsyncStorage.getItem("oauth_demo_pkce");
      if (!stored) {
        setStatus("error");
        setErrorMsg("Demo session expired. Please restart the demo.");
        return;
      }
      const { codeVerifier, state, redirectUri } = JSON.parse(stored);
      await AsyncStorage.removeItem("oauth_demo_pkce");

      if (params.state && params.state !== state) {
        setStatus("error");
        setErrorMsg("State mismatch — possible CSRF attempt. Aborting.");
        return;
      }

      try {
        const tokenRes = await fetch(apiUrl("/api/oauth/token"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "authorization_code",
            code: params.code,
            redirect_uri: redirectUri,
            client_id: DEMO_CLIENT_ID,
            code_verifier: codeVerifier,
          }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
          setStatus("error");
          setErrorMsg(tokenData.error_description ?? tokenData.error ?? "Token exchange failed.");
          return;
        }

        const userRes = await fetch(apiUrl("/api/oauth/userinfo"), {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userRes.json();
        if (!userRes.ok) {
          setStatus("error");
          setErrorMsg(userData.error ?? "Failed to fetch profile.");
          return;
        }

        setUserInfo(userData);
        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMsg("Network error during token exchange.");
      }
    }
    run();
  }, [params.code, params.state, params.error]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.center}>
        {status === "loading" && (
          <>
            <ActivityIndicator size="large" color={colors.foreground} />
            <Text style={[styles.msg, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Exchanging authorization code for a token…
            </Text>
          </>
        )}

        {status === "error" && (
          <>
            <Feather name="x-circle" size={44} color={colors.destructive} />
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Demo failed
            </Text>
            <Text style={[styles.msg, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {errorMsg}
            </Text>
          </>
        )}

        {status === "success" && userInfo && (
          <>
            <Feather name="check-circle" size={44} color={colors.success} />
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              It worked!
            </Text>
            <Text style={[styles.msg, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              The demo app fetched this from AfuMail's /oauth/userinfo endpoint using only the access
              token — never your password:
            </Text>

            <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Avatar name={userInfo.name} size={48} fontSize={16} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {userInfo.name}
                </Text>
                <Text style={[styles.email, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {userInfo.email}
                </Text>
                <Text style={[styles.email, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  @{userInfo.preferred_username}
                </Text>
              </View>
            </View>
          </>
        )}

        <Pressable
          onPress={() => router.replace("/settings/connected-accounts")}
          style={[styles.doneBtn, { backgroundColor: colors.foreground }]}
        >
          <Text style={[styles.doneBtnText, { color: colors.background, fontFamily: "Inter_600SemiBold" }]}>
            Done
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20 },
  msg: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 320 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    width: "100%",
    maxWidth: 360,
    marginTop: 4,
  },
  name: { fontSize: 15 },
  email: { fontSize: 13 },
  doneBtn: { marginTop: 20, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  doneBtnText: { fontSize: 15 },
});
