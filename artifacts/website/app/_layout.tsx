import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { EmailProvider } from "@/context/EmailContext";

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inOAuthFlow = segments[0] === "oauth";

    if (!isAuthenticated && !inAuthGroup) {
      if (inOAuthFlow && typeof window !== "undefined") {
        // Preserve the OAuth consent request so the user lands back on it
        // after signing in, instead of losing client_id/redirect_uri/state.
        sessionStorage.setItem("oauth_return_to", window.location.pathname + window.location.search);
      }
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      const returnTo = typeof window !== "undefined" ? sessionStorage.getItem("oauth_return_to") : null;
      if (returnTo) {
        sessionStorage.removeItem("oauth_return_to");
        router.replace(returnTo as never);
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1A1F2E" }}>
        <ActivityIndicator size="large" color="#4A7DFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
      <Stack.Screen name="oauth/authorize" options={{ animation: "fade" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EmailProvider>
          <RootLayoutNav />
        </EmailProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
