import { router } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

export default function ComposeTab() {
  useEffect(() => {
    router.push("/email/compose");
  }, []);
  return <View style={{ flex: 1 }} />;
}
