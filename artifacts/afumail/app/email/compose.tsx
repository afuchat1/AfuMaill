import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
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

type AiAction = "improve" | "grammar" | "shorter" | "longer";

const AI_ACTIONS: { id: AiAction; label: string; icon: string; instruction: string }[] = [
  { id: "improve",  label: "Improve tone",  icon: "edit-2",     instruction: "Improve the tone of this email to be more professional and engaging" },
  { id: "grammar",  label: "Fix grammar",   icon: "check",      instruction: "Fix all grammar and spelling errors in this email" },
  { id: "shorter",  label: "Make shorter",  icon: "minimize-2", instruction: "Make this email more concise and shorter while keeping the key message" },
  { id: "longer",   label: "Make longer",   icon: "maximize-2", instruction: "Expand this email with more detail and context" },
];

export default function ComposeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { sendEmail } = useEmails();
  const params = useLocalSearchParams<{ to?: string; cc?: string; subject?: string; body?: string }>();

  const [to, setTo] = useState(params.to ?? "");
  const [cc, setCc] = useState(params.cc ?? "");
  const [subject, setSubject] = useState(params.subject ?? "");
  const [body, setBody] = useState(params.body ?? "");
  const [showCc, setShowCc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [activeAiAction, setActiveAiAction] = useState<AiAction | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bodyRef = useRef<TextInput>(null);
  const goBackRef = useRef<() => void>(() => router.back());

  // Clear AI error timer on unmount to avoid stale state updates
  useEffect(() => {
    return () => {
      if (aiErrorTimerRef.current) clearTimeout(aiErrorTimerRef.current);
    };
  }, []);

  useEffect(() => {
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

  function showAiError(msg: string) {
    if (aiErrorTimerRef.current) clearTimeout(aiErrorTimerRef.current);
    setAiError(msg);
    aiErrorTimerRef.current = setTimeout(() => setAiError(null), 3500);
  }

  async function handleAiAction(action: AiAction) {
    const item = AI_ACTIONS.find((a) => a.id === action)!;
    setShowAiMenu(false);
    setAiError(null);
    if (aiErrorTimerRef.current) clearTimeout(aiErrorTimerRef.current);
    setActiveAiAction(action);
    try {
      const generated = await aiCompose({
        instruction: item.instruction,
        draft: body.trim() ? body : undefined,
        subject: subject.trim() ? subject : undefined,
        to: to.trim() ? to : undefined,
      });
      setBody(generated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAiError(err?.message ?? "AI assist failed — try again");
    } finally {
      setActiveAiAction(null);
    }
  }

  return (
    <SwipeBackView>
      {(goBack) => {
        goBackRef.current = goBack;
        return (
    <View style={[styles.root, { backgroundColor: colors.card }]}>
      {/* AI error toast */}
      {aiError && (
        <View style={[styles.aiErrorToast, { backgroundColor: colors.destructive }]}>
          <Feather name="alert-circle" size={14} color="#fff" />
          <Text style={[styles.aiErrorToastText, { fontFamily: "Inter_500Medium" }]}>{aiError}</Text>
        </View>
      )}
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

      {/* AI Assist dropdown menu */}
      {showAiMenu && (
        <>
          {/* Backdrop */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowAiMenu(false)}
          />
          <View style={[styles.aiMenu, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground }]}>
            {AI_ACTIONS.map((action, idx) => (
              <Pressable
                key={action.id}
                onPress={() => handleAiAction(action.id)}
                style={({ pressed }) => [
                  styles.aiMenuItem,
                  pressed && { backgroundColor: colors.muted },
                  idx < AI_ACTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <Feather name={action.icon as any} size={15} color={colors.accent} />
                <Text style={[styles.aiMenuLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

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
        {/* AI Assist button */}
        {activeAiAction ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Pressable
            onPress={() => setShowAiMenu((v) => !v)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.aiAssistBtn,
              { backgroundColor: showAiMenu ? colors.accent + "18" : pressed ? colors.muted : "transparent", borderColor: colors.accent + "44" },
            ]}
          >
            <Feather name="zap" size={14} color={colors.accent} />
            <Text style={[styles.aiAssistLabel, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>
              AI Assist
            </Text>
          </Pressable>
        )}
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
  aiAssistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  aiAssistLabel: {
    fontSize: 13,
  },
  aiErrorToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  aiErrorToastText: {
    fontSize: 13,
    color: "#fff",
    flex: 1,
  },
  aiMenu: {
    position: "absolute",
    bottom: 64,
    right: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
    overflow: "hidden",
    zIndex: 100,
  },
  aiMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  aiMenuLabel: {
    fontSize: 14,
  },
});
