import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { EmailProvider } from "@/context/EmailContext";
import { MailtoDraft, parseMailtoUrl } from "@/lib/mailto";

const GestureRoot = GestureHandlerRootView as React.ComponentType<{ style?: object; children?: React.ReactNode }>;

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, isPasswordRecovery } = useAuth();
  const segments = useSegments();
  const scheme = useColorScheme();
  const [pendingMailto, setPendingMailto] = useState<MailtoDraft | null>(null);

  const handleIncomingUrl = useCallback((url: string) => {
    const draft = parseMailtoUrl(url);
    if (draft) setPendingMailto(draft);
  }, []);

  useEffect(() => {
    let mounted = true;
    Linking.getInitialURL().then((url) => {
      if (mounted && url) handleIncomingUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleIncomingUrl(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [handleIncomingUrl]);

  useEffect(() => {
    if (isLoading) return;
    if (isPasswordRecovery) {
      router.replace("/(auth)/set-new-password");
      return;
    }
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, isPasswordRecovery, segments]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !pendingMailto || segments[0] !== "(tabs)") {
      return;
    }

    const params = Object.fromEntries(
      Object.entries(pendingMailto).filter(([, value]) => Boolean(value))
    ) as Record<string, string>;
    setPendingMailto(null);
    router.push({ pathname: "/email/compose", params });
  }, [isAuthenticated, isLoading, pendingMailto, segments]);

  if (isLoading) {
    const bg = scheme === "dark" ? "#0D0D0D" : "#FAF8F5";
    const fg = scheme === "dark" ? "#F5F3F0" : "#1A1A1A";
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: bg }}>
        <ActivityIndicator size="large" color={fg} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="email/[id]" options={{ headerShown: false, animation: "none", gestureEnabled: false }} />
      <Stack.Screen
        name="email/compose"
        options={{
          headerShown: false,
          animation: "none",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="settings" options={{ headerShown: false, animation: "none", gestureEnabled: false }} />
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureRoot style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <EmailProvider>
                  <RootLayoutNav />
                </EmailProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureRoot>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
