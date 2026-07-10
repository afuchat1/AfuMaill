import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { aiChat } from "@/lib/ai";
import { W } from "./webColors";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT =
  "You are AfuMail's AI assistant, powered by Engagera. You help users write better emails, manage their inbox, suggest replies, improve drafts, and answer questions about email etiquette and productivity. Be concise, warm, and practical.";

const SUGGESTIONS = [
  "Write a polite follow-up email",
  "Help me decline a meeting gracefully",
  "How do I stop getting so much spam?",
  "Suggest a subject line for my email",
];

export default function WebAiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

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
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  function handleKeyDown(e: any) {
    if (e.nativeEvent?.key === "Enter" && !e.nativeEvent?.shiftKey) {
      e.preventDefault?.();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: pressed ? "#1558B5" : W.accent },
          ]}
          accessibilityLabel="Open AI assistant"
        >
          <Feather name="cpu" size={22} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Chat panel */}
      {open && (
        <View style={[styles.panel, { backgroundColor: W.bgCard, borderColor: W.border }]}>
          {/* Panel header */}
          <View style={[styles.panelHeader, { borderBottomColor: W.borderLight }]}>
            <View style={[styles.headerAvatar, { backgroundColor: W.accentLight }]}>
              <Feather name="cpu" size={16} color={W.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>
                AI Assistant
              </Text>
              <Text style={[styles.headerSub, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
                Powered by Engagera
              </Text>
            </View>
            <View style={styles.headerActions}>
              {messages.length > 0 && (
                <Pressable onPress={() => { setMessages([]); setError(null); }} hitSlop={6}>
                  <Text style={[styles.clearBtn, { fontFamily: "Inter_500Medium", color: W.textMuted }]}>
                    Clear
                  </Text>
                </Pressable>
              )}
              <Pressable onPress={() => setOpen(false)} hitSlop={6}>
                <Feather name="x" size={16} color={W.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: W.accentLight }]}>
                  <Feather name="zap" size={24} color={W.accent} />
                </View>
                <Text style={[styles.emptyTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>
                  How can I help?
                </Text>
                <Text style={[styles.emptySub, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
                  Write emails, improve drafts, or ask anything.
                </Text>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => handleSend(s)}
                      style={({ pressed }) => [
                        styles.chip,
                        { backgroundColor: pressed ? W.bgHover : W.bgSecondary, borderColor: W.border },
                      ]}
                    >
                      <Text style={[styles.chipText, { fontFamily: "Inter_500Medium", color: W.textPrimary }]}>
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
                    <View style={[styles.msgAvatar, { backgroundColor: W.accentLight }]}>
                      <Feather name="cpu" size={11} color={W.accent} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      msg.role === "user"
                        ? { backgroundColor: W.accent }
                        : { backgroundColor: W.bgSecondary, borderColor: W.border, borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        {
                          fontFamily: "Inter_400Regular",
                          color: msg.role === "user" ? "#FFFFFF" : W.textPrimary,
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
                <View style={[styles.msgAvatar, { backgroundColor: W.accentLight }]}>
                  <Feather name="cpu" size={11} color={W.accent} />
                </View>
                <View style={[styles.bubble, { backgroundColor: W.bgSecondary, borderColor: W.border, borderWidth: 1 }]}>
                  <ActivityIndicator size="small" color={W.textMuted} />
                </View>
              </View>
            )}

            {error && (
              <View style={[styles.errorBox, { backgroundColor: W.destructiveLight, borderColor: W.destructive + "44" }]}>
                <Feather name="alert-circle" size={12} color={W.destructive} />
                <Text style={[styles.errorText, { fontFamily: "Inter_400Regular", color: W.destructive }]}>
                  {error}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={[styles.inputRow, { borderTopColor: W.borderLight }]}>
            <TextInput
              style={[
                styles.textInput,
                { fontFamily: "Inter_400Regular", color: W.textPrimary, backgroundColor: W.bgSecondary, borderColor: W.border },
              ]}
              placeholder="Ask anything…"
              placeholderTextColor={W.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              // @ts-ignore — web-only prop
              onKeyPress={handleKeyDown}
            />
            <Pressable
              onPress={() => handleSend()}
              disabled={!input.trim() || loading}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor:
                    !input.trim() || loading
                      ? W.bgSecondary
                      : pressed
                      ? "#1558B5"
                      : W.accent,
                },
              ]}
            >
              <Feather
                name="send"
                size={14}
                color={!input.trim() || loading ? W.textMuted : "#FFFFFF"}
              />
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 28,
    right: 28,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    // @ts-ignore
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
    zIndex: 200,
  },
  panel: {
    position: "absolute",
    bottom: 28,
    right: 28,
    width: 360,
    height: 520,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "column",
    overflow: "hidden",
    // @ts-ignore
    boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
    zIndex: 200,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
  },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 14 },
  headerSub: { fontSize: 11, marginTop: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  clearBtn: { fontSize: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 10, flexGrow: 1 },
  emptyState: { alignItems: "center", paddingTop: 24, gap: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16 },
  emptySub: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  suggestions: { gap: 6, width: "100%", marginTop: 4 },
  chip: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  chipText: { fontSize: 12 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 7 },
  userRow: { justifyContent: "flex-end" },
  msgAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, maxWidth: "84%" },
  bubbleText: { fontSize: 13, lineHeight: 19 },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    borderWidth: 1, borderRadius: 8, padding: 10,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17 },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    padding: 12, borderTopWidth: 1,
  },
  textInput: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 13, maxHeight: 80,
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
});
