import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useEmails } from "@/context/EmailContext";
import { getProfile } from "@/lib/supabase";
import { W } from "./WebSidebar";

interface ComposeConfig {
  to?: string;
  subject?: string;
  body?: string;
}

interface Props {
  config: ComposeConfig;
  onClose: () => void;
}

type WindowState = "full" | "minimized";

export default function WebComposeModal({ config, onClose }: Props) {
  const { user } = useAuth();
  const { sendEmail } = useEmails();

  const [to, setTo] = useState(config.to ?? "");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(config.subject ?? "");
  const [body, setBody] = useState(config.body ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [windowState, setWindowState] = useState<WindowState>("full");

  useEffect(() => {
    if (!user || config.body) return;
    getProfile(user.id)
      .then((p) => { if (p?.signature) setBody(`\n\n— \n${p.signature}`); })
      .catch(() => {});
  }, [user]);

  async function handleSend() {
    if (!to.trim()) { setError("Please add at least one recipient."); return; }
    setError("");
    setSending(true);
    try {
      await sendEmail(
        { to: to.trim(), cc: cc.trim() || undefined, subject: subject.trim() || "(No Subject)", body },
        user?.email ?? "me@afuchat.com",
        user?.name ?? "Me"
      );
      setSent(true);
      setTimeout(onClose, 800);
    } catch {
      setError("Failed to send. Please try again.");
    }
    setSending(false);
  }

  const isMinimized = windowState === "minimized";

  return (
    <View style={[styles.root, isMinimized && styles.rootMinimized]}>
      {/* Title bar */}
      <View style={styles.titleBar}>
        <Text style={[styles.title, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {subject.trim() || "New Message"}
        </Text>
        <View style={styles.titleActions}>
          <Pressable
            onPress={() => setWindowState((s) => (s === "full" ? "minimized" : "full"))}
            hitSlop={6}
            style={styles.windowBtn}
          >
            <Feather name={isMinimized ? "maximize-2" : "minus"} size={13} color="#94A3B8" />
          </Pressable>
          <Pressable onPress={onClose} hitSlop={6} style={styles.windowBtn}>
            <Feather name="x" size={13} color="#94A3B8" />
          </Pressable>
        </View>
      </View>

      {!isMinimized && (
        <>
          {/* To field */}
          <View style={[styles.field, { borderBottomColor: W.border }]}>
            <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium", color: W.textMuted }]}>To</Text>
            <TextInput
              style={[styles.fieldInput, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
              value={to}
              onChangeText={(t) => { setTo(t); setError(""); }}
              placeholder="Recipients"
              placeholderTextColor={W.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoFocus={!config.to}
            />
            <Pressable onPress={() => setShowCc((v) => !v)} hitSlop={6}>
              <Text style={[styles.ccToggle, { fontFamily: "Inter_500Medium", color: W.accent }]}>Cc</Text>
            </Pressable>
          </View>

          {showCc && (
            <View style={[styles.field, { borderBottomColor: W.border }]}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium", color: W.textMuted }]}>Cc</Text>
              <TextInput
                style={[styles.fieldInput, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
                value={cc}
                onChangeText={setCc}
                placeholder="Carbon copy"
                placeholderTextColor={W.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
          )}

          {/* Subject */}
          <View style={[styles.field, { borderBottomColor: W.border }]}>
            <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium", color: W.textMuted }]}>Subject</Text>
            <TextInput
              style={[styles.fieldInput, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Subject"
              placeholderTextColor={W.textMuted}
              autoFocus={!!config.to}
            />
          </View>

          {/* Body */}
          <TextInput
            style={[styles.body, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
            value={body}
            onChangeText={setBody}
            placeholder="Write your message…"
            placeholderTextColor={W.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: W.border }]}>
            {!!error && (
              <Text style={[styles.error, { fontFamily: "Inter_400Regular", color: W.destructive }]}>{error}</Text>
            )}
            <View style={styles.footerActions}>
              <Pressable
                onPress={handleSend}
                disabled={sending || sent}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: sent ? W.success : W.accent, opacity: (sending || sent) ? 0.85 : pressed ? 0.9 : 1 },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name={sent ? "check" : "send"} size={14} color="#fff" />
                    <Text style={[styles.sendBtnLabel, { fontFamily: "Inter_600SemiBold" }]}>
                      {sent ? "Sent!" : "Send"}
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable onPress={onClose} hitSlop={6} style={styles.discardBtn}>
                <Feather name="trash-2" size={14} color={W.textMuted} />
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    bottom: 0,
    right: 24,
    width: 520,
    maxHeight: 520,
    backgroundColor: "#fff",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 16,
    zIndex: 200,
    borderWidth: 1,
    borderColor: W.border,
    borderBottomWidth: 0,
    flexDirection: "column",
  },
  rootMinimized: { maxHeight: 44 },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: W.textPrimary,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  title: { flex: 1, fontSize: 13, color: "#F1F5F9" },
  titleActions: { flexDirection: "row", gap: 8 },
  windowBtn: { padding: 2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  fieldLabel: { fontSize: 12, width: 44 },
  fieldInput: { flex: 1, fontSize: 13, paddingVertical: 2 },
  ccToggle: { fontSize: 12 },
  body: {
    flex: 1,
    padding: 14,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 200,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  error: { fontSize: 12 },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendBtnLabel: { color: "#fff", fontSize: 13 },
  discardBtn: { padding: 8, borderRadius: 6 },
});
