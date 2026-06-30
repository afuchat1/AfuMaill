import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import type { Email } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHrs < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins <= 0 ? "Now" : `${diffMins}m`;
  }
  if (diffHrs < 24) {
    return `${Math.floor(diffHrs)}h`;
  }
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface EmailRowProps {
  email: Email;
}

export function EmailRow({ email }: EmailRowProps) {
  const colors = useColors();
  const { markAsRead, toggleStar } = useEmails();

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markAsRead(email.id);
    router.push(`/email/${email.id}`);
  }

  function handleStar() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleStar(email.id);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? colors.secondary
            : colors.card,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Left: avatar */}
      <View style={styles.avatarContainer}>
        <Avatar name={email.from.name} size={44} fontSize={15} />
        {!email.read && (
          <View
            style={[styles.unreadDot, { backgroundColor: colors.accent }]}
          />
        )}
      </View>

      {/* Center: content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.senderName,
              {
                color: colors.foreground,
                fontFamily: email.read
                  ? "Inter_400Regular"
                  : "Inter_600SemiBold",
              },
            ]}
          >
            {email.from.name}
          </Text>
          <Text
            style={[
              styles.time,
              {
                color: email.read ? colors.mutedForeground : colors.accent,
                fontFamily: email.read
                  ? "Inter_400Regular"
                  : "Inter_500Medium",
              },
            ]}
          >
            {formatTime(email.timestamp)}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.subject,
            {
              color: colors.foreground,
              fontFamily: email.read
                ? "Inter_400Regular"
                : "Inter_500Medium",
            },
          ]}
        >
          {email.subject}
        </Text>

        <View style={styles.bottomRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.preview,
              { color: colors.mutedForeground, flex: 1 },
            ]}
          >
            {email.preview}
          </Text>

          <View style={styles.actions}>
            {email.attachments.length > 0 && (
              <Feather
                name="paperclip"
                size={13}
                color={colors.mutedForeground}
                style={styles.attachIcon}
              />
            )}
            <Pressable onPress={handleStar} hitSlop={8}>
              <Feather
                name={email.starred ? "star" : "star"}
                size={16}
                color={
                  email.starred ? colors.warning : "transparent"
                }
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
    flexShrink: 0,
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  senderName: {
    fontSize: 15,
    flex: 1,
  },
  time: {
    fontSize: 12,
    flexShrink: 0,
  },
  subject: {
    fontSize: 14,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  preview: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  attachIcon: {
    marginRight: 2,
  },
});
