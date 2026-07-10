import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SwipeBackView } from "@/components/SwipeBackView";
import { useAuth } from "@/context/AuthContext";
import { useEmails } from "@/context/EmailContext";
import { useColors } from "@/hooks/useColors";
import { getProfile } from "@/lib/supabase";
import { aiCompose } from "@/lib/ai";

export default function ComposeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { sendEmail } = useEmails();
  const params = useLocalSearchParams<{ to?: string; subject?: string; body?: string }>();

  const [to, setTo] = useState(params.to ?? "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(params.subject ?? "");
  const [body, setBody] = useState(params.body ?? "");
  const [showCc, setShowCc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [showAiInput, setShowAiInput] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const bodyRef = useRef<TextInput>(null);
  const goBackRef = useRef<() => void>(() => router.back());

  useEffect(() => {
    // Only auto-insert signature for new emails (not replies/forwards that already have body)
    if (!user || params.body) return;
    getProfile(user.id)
      .then((p) => {
        if (p?.signature) {
          setBody(`\n\n— \n${p.signature}`);
        }
      })
      .catch((err) => console.warn("Failed to load signature:", err));
  }, [user]);

  async function handleSend() {
    if (!to.trim()) return;
    setIsSending(true);
    try {
      await sendEmail(
        { to: to.trim(), cc: cc.trim() || undefined, subject, body },
        user?.email ?? "me@afuchat.com",
        user?.name ?? "Me"
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
      setIsSending(false);
      setTimeout(() => {
        goBackRef.current();
      }, 800);
    } catch (err) {
      console.warn("Failed to send email:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsSending(false);
    }
  }

  async function handleAiGenerate() {
    if (!aiInstruction.trim()) return;
    setIsAiLoading(true);
    setAiError(null);
    try {
      const generated = await aiCompose({
        instruction: aiInstruction.trim(),
        draft: body.trim() ? body : undefined,
        subject: subject.trim() ? subject : undefined,
        to: to.trim() ? to : undefined,
      });
      setBody(generated);
      setShowAiInput(false);
      setAiInstruction("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setAiError(err.message || "Failed to generate email.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAiLoading(false);
    }
  }

  return (
    <SwipeBackView>
      {(goBack) => {
        goBackRef.current = goBack;
        return (
    <View style={[styles.root, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Pressable onPress={goBack} hitSlop={8}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          New Message
        </Text>
        <Pressable
          onPress={handleSend}
          disabled={isSending || sent || !to.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor:
                !to.trim() || isSending
                  ? colors.muted
                  : pressed
                  ? "#1558B5"
                  : colors.accent,
            },
          ]}
        >
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : sent ? (
            <Feather name="check" size={16} color="#FFFFFF" />
          ) : (
            <Feather name="send" size={16} color={!to.trim() ? colors.mutedForeground : "#FFFFFF"} />
          )}
        </Pressable>
      </View>

      {/* From */}
      <View style={[styles.fieldRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          From
        </Text>
        <Text style={[styles.fromAddress, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
          {user?.email ?? "me@afuchat.com"}
        </Text>
      </View>

      {/* To */}
      <View style={[styles.fieldRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          To
        </Text>
        <TextInput
          style={[styles.fieldInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder="Recipients"
          placeholderTextColor={colors.mutedForeground}
          value={to}
          onChangeText={setTo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <Pressable onPress={() => setShowCc(!showCc)} hitSlop={8}>
          <Text style={[styles.ccToggle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Cc
          </Text>
        </Pressable>
      </View>

      {/* CC */}
      {showCc && (
        <View style={[styles.fieldRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Cc
          </Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Carbon copy"
            placeholderTextColor={colors.mutedForeground}
            value={cc}
            onChangeText={setCc}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>
      )}

      {/* Subject */}
      <View style={[styles.fieldRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Subject
        </Text>
        <TextInput
          style={[styles.fieldInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder="Subject"
          placeholderTextColor={colors.mutedForeground}
          value={subject}
          onChangeText={setSubject}
          returnKeyType="next"
          onSubmitEditing={() => bodyRef.current?.focus()}
        />
      </View>

      {/* Body */}
      <KeyboardAwareScrollView
        style={[styles.bodyScroll, { backgroundColor: colors.card }]}
        bottomOffset={80}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {showAiInput && (
          <View style={[styles.aiContainer, { backgroundColor: colors.accent + "11", borderColor: colors.accent + "33" }]}>
            <View style={styles.aiHeader}>
              <Feather name="zap" size={16} color={colors.accent} />
              <Text style={[styles.aiTitle, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>Write with AI</Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setShowAiInput(false)} hitSlop={8}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.aiInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="What do you want to say?"
              placeholderTextColor={colors.mutedForeground}
              value={aiInstruction}
              onChangeText={setAiInstruction}
              multiline
            />
            {aiError && (
              <Text style={[styles.aiError, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>{aiError}</Text>
            )}
            <View style={styles.aiFooter}>
              <Pressable
                onPress={handleAiGenerate}
                disabled={isAiLoading || !aiInstruction.trim()}
                style={({ pressed }) => [
                  styles.aiGenerateBtn,
                  { backgroundColor: !aiInstruction.trim() || isAiLoading ? colors.muted : pressed ? "#1558B5" : colors.accent }
                ]}
              >
                {isAiLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[styles.aiGenerateText, { color: !aiInstruction.trim() ? colors.mutedForeground : "#FFFFFF", fontFamily: "Inter_600SemiBold" }]}>Generate</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
        <TextInput
          ref={bodyRef}
          style={[
            styles.bodyInput,
            { color: colors.foreground, fontFamily: "Inter_400Regular" },
          ]}
          placeholder="Compose your message..."
          placeholderTextColor={colors.mutedForeground}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </KeyboardAwareScrollView>

      {/* Toolbar */}
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <Pressable hitSlop={8}>
          <Feather name="paperclip" size={20} color={colors.mutedForeground} />
        </Pressable>
        <Pressable hitSlop={8}>
          <Feather name="image" size={20} color={colors.mutedForeground} />
        </Pressable>
        <Pressable hitSlop={8}>
          <Feather name="link" size={20} color={colors.mutedForeground} />
        </Pressable>
        <Pressable hitSlop={8}>
          <Feather name="clock" size={20} color={colors.mutedForeground} />
        </Pressable>
        <View style={styles.toolbarSpacer} />
        <Pressable onPress={() => setShowAiInput(!showAiInput)} hitSlop={8}>
          <Feather name="zap" size={20} color={colors.accent} />
        </Pressable>
      </View>
    </View>
        );
      }}
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  fieldLabel: {
    fontSize: 14,
    width: 52,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  fromAddress: {
    flex: 1,
    fontSize: 15,
  },
  ccToggle: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  bodyScroll: {
    flex: 1,
  },
  bodyInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    padding: 16,
    minHeight: 200,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 24,
  },
  toolbarSpacer: {
    flex: 1,
  },
  aiContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiTitle: {
    fontSize: 14,
  },
  aiInput: {
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
  },
  aiError: {
    fontSize: 13,
  },
  aiFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  aiGenerateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  aiGenerateText: {
    fontSize: 14,
  },
});
