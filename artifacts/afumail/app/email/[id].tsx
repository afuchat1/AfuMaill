import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";

function formatFullDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ATTACHMENT_ICONS: Record<string, string> = {
  pdf: "file-text",
  doc: "file-text",
  docx: "file-text",
  xls: "bar-chart-2",
  xlsx: "bar-chart-2",
  png: "image",
  jpg: "image",
  jpeg: "image",
  mp4: "video",
  mp3: "music",
  zip: "archive",
};

export default function EmailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getEmailById, toggleStar, archiveEmail, deleteEmail, markAsRead } = useEmails();

  const email = getEmailById(id ?? "");

  useEffect(() => {
    if (email && !email.read) {
      markAsRead(email.id);
    }
  }, [email?.id]);

  if (!email) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center" }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const ext = email.attachments[0]?.name.split(".").pop()?.toLowerCase() ?? "";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleStar(email.id);
            }}
            hitSlop={8}
          >
            <Feather
              name="star"
              size={20}
              color={email.starred ? colors.warning : colors.mutedForeground}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              archiveEmail(email.id);
              router.back();
            }}
            hitSlop={8}
          >
            <Feather name="archive" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              deleteEmail(email.id);
              router.back();
            }}
            hitSlop={8}
          >
            <Feather name="trash-2" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable hitSlop={8}>
            <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Subject */}
        <View style={styles.subjectSection}>
          <Text style={[styles.subject, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {email.subject}
          </Text>
        </View>

        {/* Sender info */}
        <View style={[styles.senderSection, { borderBottomColor: colors.border }]}>
          <Avatar name={email.from.name} size={44} fontSize={15} />
          <View style={styles.senderInfo}>
            <View style={styles.senderTopRow}>
              <Text style={[styles.senderName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {email.from.name}
              </Text>
              <Text style={[styles.timestamp, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {formatFullDate(email.timestamp)}
              </Text>
            </View>
            <Text style={[styles.senderEmail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {email.from.email}
            </Text>
            <Text style={[styles.recipientLine, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              To: {email.to.map((t) => t.name || t.email).join(", ")}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.bodySection}>
          <Text style={[styles.body, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
            {email.body}
          </Text>
        </View>

        {/* Attachments */}
        {email.attachments.length > 0 && (
          <View style={[styles.attachmentsSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.attachTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {email.attachments.length} attachment{email.attachments.length > 1 ? "s" : ""}
            </Text>
            {email.attachments.map((att) => {
              const fileExt = att.name.split(".").pop()?.toLowerCase() ?? "";
              const icon = ATTACHMENT_ICONS[fileExt] ?? "file";
              return (
                <Pressable
                  key={att.id}
                  style={({ pressed }) => [
                    styles.attachmentCard,
                    {
                      backgroundColor: pressed ? colors.secondary : colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather name={icon as any} size={20} color={colors.accent} />
                  <View style={styles.attachInfo}>
                    <Text style={[styles.attachName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                      {att.name}
                    </Text>
                    <Text style={[styles.attachSize, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {formatFileSize(att.size)}
                    </Text>
                  </View>
                  <Feather name="download" size={16} color={colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Reply bar */}
      <View
        style={[
          styles.replyBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/email/compose",
              params: {
                to: email.from.email,
                subject: `Re: ${email.subject}`,
              },
            })
          }
          style={({ pressed }) => [
            styles.replyButton,
            {
              backgroundColor: pressed ? colors.secondary : colors.muted,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="corner-up-left" size={16} color={colors.foreground} />
          <Text style={[styles.replyBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            Reply
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.replyButton,
            {
              backgroundColor: pressed ? colors.secondary : colors.muted,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="corner-up-left" size={16} color={colors.foreground} />
          <Text style={[styles.replyBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            Reply All
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.replyButton,
            {
              backgroundColor: pressed ? colors.secondary : colors.muted,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="share" size={16} color={colors.foreground} />
          <Text style={[styles.replyBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            Forward
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  scroll: {
    flex: 1,
  },
  subjectSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  subject: {
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  senderSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  senderInfo: {
    flex: 1,
    gap: 3,
  },
  senderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  senderName: {
    fontSize: 15,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    flexShrink: 0,
  },
  senderEmail: {
    fontSize: 13,
  },
  recipientLine: {
    fontSize: 12,
    marginTop: 2,
  },
  bodySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.1,
  },
  attachmentsSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  attachTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  attachInfo: {
    flex: 1,
    gap: 2,
  },
  attachName: {
    fontSize: 14,
  },
  attachSize: {
    fontSize: 12,
  },
  replyBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  replyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  replyBtnText: {
    fontSize: 14,
  },
});
