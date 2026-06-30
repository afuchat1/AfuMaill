import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const FAQ = [
  {
    q: "How do I send an email?",
    a: "Tap the compose button (pencil icon) in the bottom tab bar. Fill in the To, Subject, and message fields, then tap the send button.",
  },
  {
    q: "Why did my account registration fail?",
    a: "Make sure your username only contains letters and numbers. If the username is taken, try a different one. Check that your password is at least 6 characters.",
  },
  {
    q: "How do I reset my password?",
    a: "On the login screen, tap 'Forgot password?' and enter your recovery email or phone number. A reset link will be sent to your linked recovery email.",
  },
  {
    q: "Can I use AfuMail to send emails to Gmail or Outlook users?",
    a: "Currently AfuMail is a closed network — you can only exchange messages with other @afuchat.com users. External email support is on our roadmap.",
  },
  {
    q: "What is a recovery email?",
    a: "A recovery email is another AfuMail account that can receive a password-reset link if you ever get locked out of your main account. Set it in Settings → Account Recovery.",
  },
  {
    q: "How do I star or archive an email?",
    a: "In the email detail view, tap the star icon to star it or the archive icon to move it to the archive folder.",
  },
  {
    q: "How do I set up a vacation reply?",
    a: "Go to Settings → Account → Vacation Reply. Enable it and write your auto-reply message. AfuMail will automatically respond to senders while the feature is on.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your emails are stored securely in our database with row-level security. Only you can read your own messages. We do not share your data with third parties.",
  },
];

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<number | null>(null);

  function toggle(idx: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(expanded === idx ? null : idx);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Help & Support
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 40 }}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          FREQUENTLY ASKED QUESTIONS
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {FAQ.map((item, idx) => (
            <View key={idx}>
              <Pressable
                onPress={() => toggle(idx)}
                style={({ pressed }) => [styles.faqRow, { backgroundColor: pressed ? colors.secondary : "transparent" }]}
              >
                <Text style={[styles.question, { color: colors.foreground, fontFamily: "Inter_500Medium", flex: 1 }]}>
                  {item.q}
                </Text>
                <Feather name={expanded === idx ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
              </Pressable>

              {expanded === idx && (
                <View style={[styles.answer, { borderTopColor: colors.border }]}>
                  <Text style={[styles.answerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {item.a}
                  </Text>
                </View>
              )}

              {idx < FAQ.length - 1 && (
                <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 16 }]} />
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          CONTACT
        </Text>

        <Pressable
          onPress={() => Linking.openURL("mailto:support@afuchat.com")}
          style={({ pressed }) => [styles.contactCard, { backgroundColor: pressed ? colors.secondary : colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.contactIcon, { backgroundColor: colors.accent + "18" }]}>
            <Feather name="mail" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.contactLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Email Support
            </Text>
            <Text style={[styles.contactSub, { color: colors.accent, fontFamily: "Inter_400Regular" }]}>
              support@afuchat.com
            </Text>
          </View>
          <Feather name="external-link" size={16} color={colors.mutedForeground} />
        </Pressable>
      </ScrollView>
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
  title: { flex: 1, fontSize: 20, letterSpacing: -0.3 },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  question: { fontSize: 14, lineHeight: 20 },
  answer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  answerText: { fontSize: 13, lineHeight: 20 },
  sep: { height: StyleSheet.hairlineWidth },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contactLabel: { fontSize: 15 },
  contactSub: { fontSize: 13 },
});
