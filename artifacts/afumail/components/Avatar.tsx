import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const AVATAR_COLORS = [
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#D97706",
  "#059669",
  "#0891B2",
  "#4F46E5",
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? "#2563EB";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return (name.slice(0, 2) ?? "?").toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: number;
  fontSize?: number;
}

export function Avatar({ name, size = 40, fontSize = 14 }: AvatarProps) {
  const colors = useColors();
  const bgColor = getColorForName(name);
  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    letterSpacing: 0.5,
  },
});
