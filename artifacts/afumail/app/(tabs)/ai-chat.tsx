import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { aiChat } from "@/lib/ai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT =
  "You are AfuMail's AI assistant, powered by Engagera. You help users write better emails, manage their inbox, suggest replies, improve drafts, and answer questions about email etiquette and productivity. Be concise, warm, and practical.";

const SUGGESTIONS = [
  "Write a polite follow-up email",
  "Help me decline a meeting gracefully",
  "Summarise what I should reply to",
  "How do I stop getting so much spam?",
];

export default function AiChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(text = input.trim()) {
    if (!text || loading) return;
    setError(null);
    const userMsg: Message = { role: "user", content: text };
    const next: Message[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const reply = await aiChat({
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...next],
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={[styles.aiAvatar, { backgroundColor: colors.accent + "22" }]}>
          <Feather name="cpu" size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            AI Assistant
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Powered by Engagera
          </Text>
        </View>
        {messages.length > 0 && (
          <Pressable
            onPress={() => { setMessages([]); setError(null); }}
            hitSlop={8}
          >
            <Text style={[styles.clearBtn, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Clear
            </Text>
          </Pressable>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accent + "18" }]}>
              <Feather name="zap" size={36} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              How can I help?
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Ask me to write emails, improve drafts, or anything inbox-related.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => handleSend(s)}
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    {
                      backgroundColor: pressed ? colors.muted : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather name="chevron-right" size={13} color={colors.accent} />
                  <Text style={[styles.suggestionText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          messages.map((msg, i) => (
            <View key={i} style={[styles.msgRow, msg.role === "user" && styles.userRow]}>
              {msg.role === "assistant" && (
                <View style={[styles.msgAvatar, { backgroundColor: colors.accent + "22" }]}>
                  <Feather name="cpu" size={13} color={colors.accent} />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  msg.role === "user"
                    ? { backgroundColor: colors.accent }
                    : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    {
                      fontFamily: "Inter_400Regular",
                      color: msg.role === "user" ? "#FFFFFF" : colors.foreground,
                    },
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            </View>
          ))
        )}

        {loading && (
          <View style={styles.msgRow}>
            <View style={[styles.msgAvatar, { backgroundColor: colors.accent + "22" }]}>
              <Feather name="cpu" size={13} color={colors.accent} />
            </View>
            <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
          </View>
        )}

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "33" }]}>
            <Feather name="alert-circle" size={13} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
              {error}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: colors.muted, color: colors.foreground, fontFamily: "Inter_400Regular" },
          ]}
          placeholder="Ask anything…"
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => handleSend()}
        />
        <Pressable
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor:
                !input.trim() || loading
                  ? colors.muted
                  : pressed
                  ? "#1558B5"
                  : colors.accent,
            },
          ]}
        >
          <Feather
            name="send"
            size={16}
            color={!input.trim() || loading ? colors.mutedForeground : "#FFFFFF"}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aiAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17 },
  headerSub: { fontSize: 12, marginTop: 1 },
  clearBtn: { fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, flexGrow: 1 },
  emptyState: { alignItems: "center", paddingTop: 48, gap: 14 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 22, letterSpacing: -0.4 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 22, paddingHorizontal: 20 },
  suggestions: { gap: 8, width: "100%", paddingHorizontal: 4, marginTop: 8 },
  suggestionChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 100,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  suggestionText: { fontSize: 14 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  userRow: { justifyContent: "flex-end" },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "82%", minWidth: 44 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderWidth: 1, borderRadius: 12, padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 120,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
});
