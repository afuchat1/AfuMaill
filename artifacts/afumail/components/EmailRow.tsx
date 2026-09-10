import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Avatar } from "@/components/Avatar";
import type { Email, EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

const THRESHOLD = 80;
const SPRING_CONFIG = { damping: 20, stiffness: 280, mass: 0.8 };

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
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h`;
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface EmailRowProps {
  email: Email;
  currentFolder: EmailFolder;
  onOpenEmail?: (id: string) => void;
}

export function EmailRow({ email, currentFolder, onOpenEmail }: EmailRowProps) {
  const colors = useColors();
  const { markAsRead, toggleStar, archiveEmail, moveToFolder } = useEmails();

  const translateX = useSharedValue(0);
  const hapticFired = useRef(false);

  const canArchive = currentFolder !== "archived" && currentFolder !== "sent" && currentFolder !== "drafts";
  const canUnarchive = currentFolder === "archived";

  const doArchive = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    archiveEmail(email.id);
  }, [email.id, archiveEmail]);

  const doUnarchive = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    moveToFolder(email.id, "inbox");
  }, [email.id, moveToFolder]);

  const snapBack = useCallback(() => {
    translateX.value = withSpring(0, SPRING_CONFIG);
  }, [translateX]);

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      const dx = e.translationX;

      if (dx < 0 && canArchive) {
        translateX.value = dx * 0.85;
      } else if (dx > 0 && canUnarchive) {
        translateX.value = dx * 0.85;
      } else {
        translateX.value = dx * 0.08;
      }

      const absX = Math.abs(translateX.value);
      if (absX >= THRESHOLD && !hapticFired.current) {
        hapticFired.current = true;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      } else if (absX < THRESHOLD && hapticFired.current) {
        hapticFired.current = false;
      }
    })
    .onEnd((e) => {
      const committed = Math.abs(translateX.value) >= THRESHOLD || Math.abs(e.velocityX) > 600;
      const direction = translateX.value < 0 ? "left" : "right";

      if (committed && direction === "left" && canArchive) {
        translateX.value = withSpring(-500, { damping: 22, stiffness: 260 }, () => {
          runOnJS(doArchive)();
          translateX.value = withSpring(0, SPRING_CONFIG);
        });
      } else if (committed && direction === "right" && canUnarchive) {
        translateX.value = withSpring(500, { damping: 22, stiffness: 260 }, () => {
          runOnJS(doUnarchive)();
          translateX.value = withSpring(0, SPRING_CONFIG);
        });
      } else {
        runOnJS(snapBack)();
      }
      hapticFired.current = false;
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const archiveBgStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? Math.min(Math.abs(translateX.value) / THRESHOLD, 1) : 0,
  }));

  const unarchiveBgStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? Math.min(translateX.value / THRESHOLD, 1) : 0,
  }));

  function handlePress() {
    markAsRead(email.id);
    if (onOpenEmail) {
      onOpenEmail(email.id);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/email/${email.id}`);
    }
  }

  function handleStar() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleStar(email.id);
  }

  return (
    <View style={styles.wrapper}>
      {/* ── Archive backdrop (left swipe) ── */}
      {canArchive && (
        <Animated.View style={[styles.backdrop, styles.archiveBg, { backgroundColor: colors.warning }, archiveBgStyle]}>
          <Feather name="archive" size={22} color="#fff" />
          <Text style={styles.backdropLabel}>Archive</Text>
        </Animated.View>
      )}

      {/* ── Unarchive backdrop (right swipe) ── */}
      {canUnarchive && (
        <Animated.View style={[styles.backdrop, styles.unarchiveBg, { backgroundColor: colors.success }, unarchiveBgStyle]}>
          <Feather name="inbox" size={22} color="#fff" />
          <Text style={styles.backdropLabel}>Inbox</Text>
        </Animated.View>
      )}

      {/* ── Row ── */}
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>
          <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? colors.secondary : colors.card,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {/* Left: avatar */}
            <View style={styles.avatarContainer}>
              <Avatar name={email.from.name} size={44} fontSize={15} />
              {!email.read && (
                <View style={[styles.unreadDot, { backgroundColor: colors.accent, borderColor: colors.card }]} />
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
                      fontFamily: email.read ? "Inter_400Regular" : "Inter_600SemiBold",
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
                      fontFamily: email.read ? "Inter_400Regular" : "Inter_500Medium",
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
                    fontFamily: email.read ? "Inter_400Regular" : "Inter_500Medium",
                  },
                ]}
              >
                {email.subject}
              </Text>

              <View style={styles.bottomRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.preview, { color: colors.mutedForeground, flex: 1 }]}
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
                      name="star"
                      size={16}
                      color={email.starred ? colors.warning : "transparent"}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    overflow: "hidden",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  archiveBg: {
    justifyContent: "flex-end",
  },
  unarchiveBg: {
    justifyContent: "flex-start",
  },
  backdropLabel: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
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
