import { Stack } from "expo-router";
import React from "react";

export default function OAuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="authorize" />
      <Stack.Screen name="demo" />
      <Stack.Screen name="demo-callback" />
    </Stack>
  );
}
