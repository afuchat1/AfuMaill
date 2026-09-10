import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { Avatar } from "@/components/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { EmailFolder } from "@/context/EmailContext";
import { useEmails } from "@/context/EmailContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useColors } from "@/hooks/useColors";
import { aiSmartReplies, aiSummarize } from "@/lib/ai";
import { getFontScale } from "@/lib/preferences";

// react-native-webview's React 19 declarations lag behind the Expo SDK's
// JSX types. Keep the native runtime component while normalizing its public
// type at this boundary.
const NativeWebView = WebView as unknown as React.ComponentType<any>;

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

function blockExternalImages(html: string, placeholderColor: string): string {
  return html
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const alt = tag.match(/\balt\s*=\s*(['"])(.*?)\1/i)?.[2]?.trim();
      return `<div style="padding:8px 0;color:${placeholderColor};font-size:12px;">${alt || "External image blocked"}</div>`;
    })
    .replace(/\s(?:src|srcset)\s*=\s*(['"])[^'"]*\1/gi, "")
    .replace(/url\(\s*(['"]?)(?:https?:|data:)[^)]*\1\s*\)/gi, "none");
}

function looksLikeHtmlDocument(value: string): boolean {
  const body = value.trim();
  if (!body) return false;

  // Real stored HTML normally starts with a document/container tag. Requiring
  // that shape prevents prose containing snippets such as "use <p> here" from
  // being sent through a WebView.
  return /^(?:<!doctype\s+html\b|<(?:html|head|body|style|meta|link|div|p|table|section|article|main|blockquote|ul|ol|h[1-6]|tr|td|th|tbody|thead|span|br|img|a|strong|em|pre|code|font|form|svg|header|footer|center)\b)/i.test(body);
}

function extractEmailMarkup(html: string): { markup: string; styles: string } {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const markup = (bodyMatch ? bodyMatch[1] : html)
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?(?:html|head)\b[^>]*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .trim();
  const styles = Array.from(html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi))
    .map((match) => match[0])
    .join("\n");

  return { markup, styles };
}

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

/** Split plain-text into runs of normal text and tappable URL spans. */
function linkifyText(text: string, linkColor: string): React.ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0; // reset stateful regex after test
      return (
        <Text
          key={i}
          style={{ color: linkColor, textDecorationLine: "underline" }}
          onPress={() => Linking.openURL(part).catch(() => {})}
        >
          {part}
        </Text>
      );
    }
    URL_REGEX.lastIndex = 0;
    return part;
  });
}

const ATTACHMENT_ICONS: Record<string, string> = {
  pdf: "file-text", doc: "file-text", docx: "file-text",
  xls: "bar-chart-2", xlsx: "bar-chart-2",
  png: "image", jpg: "image", jpeg: "image",
  mp4: "video", mp3: "music", zip: "archive",
};

const MOVE_FOLDERS: { label: string; folder: EmailFolder; icon: string }[] = [
  { label: "Inbox",   folder: "inbox",    icon: "inbox" },
  { label: "Archive", folder: "archived", icon: "archive" },
  { label: "Spam",    folder: "spam",     icon: "alert-octagon" },
  { label: "Trash",   folder: "trash",    icon: "trash-2" },
];

interface Props {
  emailId: string;
  onClose: () => void;
}

export default function EmailDetailPanel({ emailId, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getEmailById, toggleStar, archiveEmail, deleteEmail, markAsRead, markAsUnread, moveToFolder } = useEmails();
  const { preferences } = usePreferences();
  const fontScale = getFontScale(preferences.fontSize);

  const email = getEmailById(emailId);

  const [actionsVisible, setActionsVisible] = useState(false);
  const [moveVisible,    setMoveVisible]    = useState(false);
  const [toast,          setToast]          = useState<string | null>(null);
  const [webHeight,      setWebHeight]      = useState(120);
  const [replyRailHeight, setReplyRailHeight] = useState(76);

  const [smartReplies, setSmartReplies] = useState<string[] | null>(null);
  const [isRepliesLoading, setIsRepliesLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  useEffect(() => {
    if (email && !email.read) markAsRead(email.id);
    // Reset smart replies when a different email is opened
    setSmartReplies(null);
    setIsRepliesLoading(false);
    setSummary(null);
    setIsSummaryLoading(false);
    setWebHeight(120);
  }, [email?.id]);

  async function handleFetchSmartReplies() {
    if (!email || isRepliesLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRepliesLoading(true);
    try {
      const replies = await aiSmartReplies({
        emailBody: email.body,
        emailSubject: email.subject,
        emailFrom: email.from.name || email.from.email,
      });
      setSmartReplies(replies);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(err?.message ?? "Smart Reply unavailable. Try again.");
    } finally {
      setIsRepliesLoading(false);
    }
  }

  async function handleSummarize() {
    if (!email || isSummaryLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSummaryLoading(true);
    try {
      const content = await aiSummarize({
        emailBody: email.body,
        emailSubject: email.subject,
      });
      setSummary(content);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(err?.message ?? "Summary unavailable. Try again.");
    } finally {
      setIsSummaryLoading(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function handleReply() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/email/compose", params: { to: email!.from.email, subject: `Re: ${email!.subject}` } });
  }

  function handleReplyAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const allRecipients = [email!.from.email, ...(email!.cc?.map((c) => c.email) ?? [])].join(", ");
    router.push({ pathname: "/email/compose", params: { to: allRecipients, subject: `Re: ${email!.subject}` } });
  }

  function handleForward() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const quoted = `\n\n---------- Forwarded Message ----------\nFrom: ${email!.from.name} <${email!.from.email}>\nDate: ${formatFullDate(email!.timestamp)}\nSubject: ${email!.subject}\n\n${email!.body}`;
    router.push({ pathname: "/email/compose", params: { subject: `Fwd: ${email!.subject}`, body: quoted } });
  }

  async function handleStar() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleStar(email!.id);
    showToast(email!.starred ? "Removed from Starred" : "Added to Starred");
  }

  async function handleArchive() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await archiveEmail(email!.id);
    showToast("Archived");
    onClose();
  }

  async function handleUnarchive() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await moveToFolder(email!.id, "inbox");
    showToast("Moved to Inbox");
    onClose();
  }

  async function handleDelete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteEmail(email!.id);
    showToast(email!.folder === "trash" ? "Permanently deleted" : "Moved to Trash");
    onClose();
  }

  async function handleMarkUnread() {
    await markAsUnread(email!.id);
    setActionsVisible(false);
    showToast("Marked as unread");
    setTimeout(() => onClose(), 700);
  }

  async function handleMoveToFolder(folder: EmailFolder) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await moveToFolder(email!.id, folder);
    setMoveVisible(false);
    setActionsVisible(false);
    const label = MOVE_FOLDERS.find((f) => f.folder === folder)?.label ?? folder;
    showToast(`Moved to ${label}`);
    setTimeout(() => onClose(), 700);
  }

  async function handleShare() {
    setActionsVisible(false);
    try {
      await Share.share({
        title: email!.subject,
        message: `${email!.subject}\n\nFrom: ${email!.from.name} <${email!.from.email}>\n\n${email!.body}`,
      });
    } catch {}
  }

  function handleSmartReply(replyText: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/email/compose", params: { to: email!.from.email, subject: `Re: ${email!.subject}`, body: replyText } });
  }

  if (!email) return null;

  // The database field is authoritative for current messages. Cached messages
  // from before bodyFormat existed use a conservative document-shape fallback.
  const isHtml =
    email.bodyFormat === "html"
      ? looksLikeHtmlDocument(email.body ?? "")
      : email.bodyFormat === "text"
        ? false
        : looksLikeHtmlDocument(email.body ?? "");
  const htmlBody = isHtml
    ? (preferences.externalImages ? (email.body ?? "") : blockExternalImages(email.body ?? "", colors.mutedForeground))
    : "";
  const { markup: emailMarkup, styles: emailStyles } = isHtml
    ? extractEmailMarkup(htmlBody)
    : { markup: "", styles: "" };

  const htmlDoc = isHtml
    ? `<!DOCTYPE html><html><head>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
        <meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none';">
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            max-width: 100%;
            overflow-x: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: ${colors.background};
            color: ${colors.foreground};
          }
          body { padding: 4px 0; font-size: ${16 * fontScale}px; color: ${colors.foreground}; overflow-wrap: anywhere; }
          img, video, svg { max-width: 100% !important; height: auto !important; }
          table { max-width: 100% !important; }
          td, th { max-width: 100%; overflow-wrap: anywhere; }
          a { word-break: break-word; cursor: pointer; color: ${colors.accent}; }
          pre, code { white-space: pre-wrap; word-break: break-word; }
        </style>
        ${emailStyles}
      </head><body>${emailMarkup}</body></html>`
    : "";

  // Combined script: report height + intercept ALL link clicks and send them out
  // instead of navigating inline. Messages are JSON: { type, value/url }.
  const webViewScript = `
    (function() {
      function sendHeight() {
        var h = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: h }));
      }
      document.addEventListener('DOMContentLoaded', sendHeight);
      window.addEventListener('load', sendHeight);
      setTimeout(sendHeight, 400);
      setTimeout(sendHeight, 1200);

      // Intercept every link click — send URL to RN, never navigate inline
      document.addEventListener('click', function(e) {
        var el = e.target;
        while (el && el.tagName !== 'A') el = el.parentElement;
        if (el && el.href && el.href !== '' && !el.href.startsWith('javascript:')) {
          e.preventDefault();
          e.stopPropagation();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'link', url: el.href }));
        }
      }, true);
    })();
    true;
  `;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Toast */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: colors.foreground }]}>
          <Feather name="check" size={14} color={colors.background} />
          <Text style={[styles.toastText, { color: colors.background, fontFamily: "Inter_500Medium" }]}>{toast}</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClose();
          }}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable onPress={handleStar} hitSlop={8}>
             <Feather name="star" size={20} color={email.starred ? colors.warning : colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={email.folder === "archived" ? handleUnarchive : handleArchive} hitSlop={8}>
            <Feather
              name={email.folder === "archived" ? "inbox" : "archive"}
              size={20}
              color={email.folder === "archived" ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Feather name="trash-2" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActionsVisible(true); }}
            hitSlop={8}
          >
            <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: replyRailHeight + 12 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
      >
        {/* Subject */}
        <View style={styles.subjectSection}>
          <Text style={[styles.subject, { color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 22 * fontScale, lineHeight: 30 * fontScale }]}>
            {email.subject}
          </Text>
          <View style={styles.subjectMetaRow}>
            <View style={styles.badgeRow}>
              {email.category && (
                <View style={[styles.categoryBadge, { backgroundColor: colors.accent + "18" }]}>
                  <Text style={[styles.categoryText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                    {email.category.charAt(0).toUpperCase() + email.category.slice(1)}
                  </Text>
                </View>
              )}
              {!email.read && <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />}
            </View>
            <Pressable
              onPress={handleSummarize}
              disabled={isSummaryLoading}
              style={({ pressed }) => [
                styles.summaryButton,
                {
                  backgroundColor: pressed ? colors.accent + "22" : colors.accent + "12",
                  borderColor: colors.accent + "44",
                  opacity: isSummaryLoading ? 0.7 : 1,
                },
              ]}
            >
              {isSummaryLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Feather name="file-text" size={14} color={colors.accent} />
              )}
              <Text style={[styles.summaryButtonText, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
                Summarize
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Sender info */}
        <View style={[styles.senderSection, { borderBottomColor: colors.border }]}>
          <Avatar name={email.from.name} size={44} fontSize={15} />
          <View style={styles.senderInfo}>
            <View style={styles.senderTopRow}>
              <Text style={[styles.senderName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
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
            {email.cc && email.cc.length > 0 && (
              <Text style={[styles.recipientLine, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Cc: {email.cc.map((c) => c.name || c.email).join(", ")}
              </Text>
            )}
          </View>
        </View>

        {/* Body */}
        <View
          style={[
            styles.bodySection,
            { backgroundColor: colors.background },
            isHtml && { paddingHorizontal: 12, paddingTop: 12 },
          ]}
        >
          {isHtml ? (
            Platform.OS === "web" ? (
              React.createElement("iframe", {
                title: "Email preview",
                srcDoc: htmlDoc,
                sandbox: "allow-same-origin",
                onLoad: (event: any) => {
                  const frame = event.currentTarget as HTMLIFrameElement;
                  const documentElement = frame.contentDocument?.documentElement;
                  const bodyElement = frame.contentDocument?.body;
                  const height = Math.max(
                    documentElement?.scrollHeight ?? 0,
                    bodyElement?.scrollHeight ?? 0,
                  );
                  if (height > 0) setWebHeight(Math.max(24, height));
                },
                style: {
                  display: "block",
                  width: "100%",
                  height: webHeight,
                  border: "0",
                   backgroundColor: colors.background,
                },
              })
            ) : (
              <NativeWebView
                source={{ html: htmlDoc }}
                scrollEnabled={false}
                 style={{ height: webHeight, width: "100%", backgroundColor: colors.background }}
                injectedJavaScript={webViewScript}
                onMessage={(e: any) => {
                  try {
                    const msg = JSON.parse(e.nativeEvent.data);
                    if (msg.type === "height") {
                      const height = Number(msg.value);
                      if (!isNaN(height) && height > 0) setWebHeight(Math.max(24, height));
                    } else if (msg.type === "link" && msg.url) {
                      Linking.openURL(msg.url).catch(() =>
                        showToast("Could not open link")
                      );
                    }
                  } catch {
                    // Legacy plain-number height messages.
                    const height = Number(e.nativeEvent.data);
                    if (!isNaN(height) && height > 0) setWebHeight(Math.max(24, height));
                  }
                }}
                // Belt-and-suspenders: block any navigation not caught by the JS interceptor
                onShouldStartLoadWithRequest={(req: any) => {
                  if (req.url === "about:blank" || req.url.startsWith("data:")) return true;
                  Linking.openURL(req.url).catch(() => {});
                  return false;
                }}
                showsVerticalScrollIndicator={false}
                originWhitelist={["*"]}
                javaScriptEnabled
              />
            )
          ) : (
            // Plain-text body: render tappable URLs inline
            <Text
              selectable
              style={[
                styles.body,
                {
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 16 * fontScale,
                  lineHeight: 27 * fontScale,
                },
              ]}
            >
              {linkifyText(email.body ?? "", colors.accent)}
            </Text>
          )}
        </View>

        {/* Attachments */}
        {email.attachments.length > 0 && (
          <View style={[styles.attachmentsSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.attachTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              {email.attachments.length} Attachment{email.attachments.length > 1 ? "s" : ""}
            </Text>
            {email.attachments.map((att) => {
              const fileExt = att.name.split(".").pop()?.toLowerCase() ?? "";
              const icon = ATTACHMENT_ICONS[fileExt] ?? "file";
              return (
                <Pressable
                  key={att.id}
                  disabled={!att.url}
                  onPress={() => {
                    if (att.url) Linking.openURL(att.url).catch(() => showToast("Could not open attachment"));
                  }}
                  style={({ pressed }) => [
                    styles.attachmentCard,
                    {
                      backgroundColor: pressed ? colors.secondary : colors.muted,
                      borderColor: colors.border,
                      opacity: att.url ? 1 : 0.7,
                    },
                  ]}
                >
                  <View style={[styles.attachIconWrap, { backgroundColor: colors.accent + "18" }]}>
                    <Feather name={icon as any} size={18} color={colors.accent} />
                  </View>
                  <View style={styles.attachInfo}>
                    <Text style={[styles.attachName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                      {att.name}
                    </Text>
                    <Text style={[styles.attachSize, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {formatFileSize(att.size)}
                    </Text>
                  </View>
                  <View style={[styles.downloadBtn, { backgroundColor: colors.accent + "18" }]}>
                    <Feather name="download" size={14} color={colors.accent} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {(summary || isSummaryLoading) && (
          <View style={[styles.summaryCard, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "33" }]}>
            {isSummaryLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Feather name="zap" size={15} color={colors.accent} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
                AI summary
              </Text>
              {summary && (
                <Text style={[styles.summaryText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                  {summary}
                </Text>
              )}
            </View>
            {!!summary && (
              <Pressable onPress={() => setSummary(null)} hitSlop={8}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Reply rail */}
      <View
        style={styles.replyRail}
        onLayout={(event) => {
          const nextHeight = Math.ceil(event.nativeEvent.layout.height);
          if (nextHeight !== replyRailHeight) setReplyRailHeight(nextHeight);
        }}
      >
          {/* Smart reply chips — shown after button tap */}
          {smartReplies && smartReplies.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.smartRepliesContainer}>
              {smartReplies.map((reply, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSmartReply(reply)}
                  style={({ pressed }) => [
                    styles.smartReplyChip,
                    { backgroundColor: pressed ? colors.muted : colors.card, borderColor: colors.border }
                  ]}
                >
                  <Text style={[styles.smartReplyText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{reply}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <View style={[styles.replyBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 10 }]}>
            <Pressable
              onPress={handleReply}
              style={({ pressed }) => [styles.replyButton, { backgroundColor: pressed ? colors.accent + "22" : colors.muted, borderColor: colors.border }]}
            >
              <Feather name="corner-up-left" size={15} color={colors.foreground} />
              <Text style={[styles.replyBtnText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Reply</Text>
            </Pressable>
            <Pressable
              onPress={handleForward}
              style={({ pressed }) => [styles.replyButton, { backgroundColor: pressed ? colors.accent + "22" : colors.muted, borderColor: colors.border }]}
            >
              <Feather name="corner-up-right" size={15} color={colors.foreground} />
              <Text style={[styles.replyBtnText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Forward</Text>
            </Pressable>
            <Pressable
              onPress={handleFetchSmartReplies}
              disabled={isRepliesLoading}
              style={({ pressed }) => [
                styles.replyButton,
                {
                  backgroundColor: pressed ? colors.accent + "22" : colors.muted,
                  borderColor: smartReplies && smartReplies.length > 0 ? colors.accent + "44" : colors.border,
                }
              ]}
            >
              {isRepliesLoading ? (
                <ActivityIndicator size={13} color={colors.accent} />
              ) : (
                <Feather name="zap" size={14} color={colors.accent} />
              )}
              <Text style={[styles.replyBtnText, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>Smart Reply</Text>
            </Pressable>
          </View>
      </View>

      {/* More Actions Sheet */}
      <BottomSheet visible={actionsVisible} onClose={() => setActionsVisible(false)}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>More Actions</Text>
          {[
            { icon: "mail", label: "Mark as Unread", onPress: handleMarkUnread },
            ...(email.folder === "archived"
              ? [{ icon: "inbox", label: "Move to Inbox", onPress: () => { setActionsVisible(false); handleUnarchive(); } }]
              : []
            ),
            { icon: "folder", label: "Move to Folder", onPress: () => { setActionsVisible(false); setTimeout(() => setMoveVisible(true), 320); } },
            { icon: "corner-up-right", label: "Forward", onPress: () => { setActionsVisible(false); handleForward(); } },
            { icon: "share-2", label: "Share Email", onPress: handleShare },
            { icon: "alert-octagon", label: "Report as Spam", onPress: () => handleMoveToFolder("spam"), danger: true },
          ].map((action, idx) => (
            <Pressable
              key={idx}
              onPress={action.onPress}
              style={({ pressed }) => [styles.sheetRow, { backgroundColor: pressed ? colors.secondary : "transparent" }]}
            >
              <View style={[styles.sheetIconWrap, { backgroundColor: ("danger" in action && action.danger) ? colors.destructive + "18" : colors.secondary }]}>
                <Feather name={action.icon as any} size={16} color={("danger" in action && action.danger) ? colors.destructive : colors.foreground} />
              </View>
              <Text style={[styles.sheetLabel, { color: ("danger" in action && action.danger) ? colors.destructive : colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {action.label}
              </Text>
              <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
            </Pressable>
          ))}
          <Pressable onPress={() => setActionsVisible(false)} style={[styles.sheetCancel, { backgroundColor: colors.secondary, marginTop: 4 }]}>
            <Text style={[styles.sheetCancelText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Cancel</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Move to Folder Sheet */}
      <BottomSheet visible={moveVisible} onClose={() => setMoveVisible(false)}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Move to Folder</Text>
          {MOVE_FOLDERS.filter((f) => f.folder !== email.folder).map((f) => (
            <Pressable
              key={f.folder}
              onPress={() => handleMoveToFolder(f.folder)}
              style={({ pressed }) => [styles.sheetRow, { backgroundColor: pressed ? colors.secondary : "transparent" }]}
            >
              <View style={[styles.sheetIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name={f.icon as any} size={16} color={colors.foreground} />
              </View>
              <Text style={[styles.sheetLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{f.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setMoveVisible(false)} style={[styles.sheetCancel, { backgroundColor: colors.secondary, marginTop: 4 }]}>
            <Text style={[styles.sheetCancelText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Cancel</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 22 },
  scroll: { flex: 1 },
  subjectSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, gap: 8 },
  subject: { fontSize: 22, lineHeight: 30, letterSpacing: -0.3 },
  subjectMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  categoryText: { fontSize: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  summaryButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, minHeight: 34, paddingHorizontal: 10, borderRadius: 100, borderWidth: 1,
  },
  summaryButtonText: { fontSize: 12 },
  senderSection: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 18, paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  senderInfo: { flex: 1, gap: 3 },
  senderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  senderName: { fontSize: 15, flex: 1 },
  timestamp: { fontSize: 12, flexShrink: 0 },
  senderEmail: { fontSize: 13 },
  recipientLine: { fontSize: 12, marginTop: 1 },
  bodySection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  body: { fontSize: 16, lineHeight: 27, letterSpacing: 0.1 },
  attachmentsSection: {
    paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 10, paddingBottom: 8,
  },
  attachTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  attachmentCard: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 14, padding: 14, gap: 12,
  },
  attachIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  attachInfo: { flex: 1, gap: 2 },
  attachName: { fontSize: 14 },
  attachSize: { fontSize: 12 },
  downloadBtn: { width: 32, height: 32, borderRadius: 100, alignItems: "center", justifyContent: "center" },
  replyRail: { gap: 0 },
  replyBar: {
    flexDirection: "row", paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  replyButton: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderRadius: 100, paddingVertical: 11, gap: 5,
  },
  replyBtnText: { fontSize: 13 },
  toast: {
    position: "absolute", bottom: 100, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, zIndex: 999,
  },
  toastText: { fontSize: 13 },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, padding: 20, paddingBottom: 32, gap: 2,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, letterSpacing: -0.3, marginBottom: 12 },
  sheetRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 13, paddingHorizontal: 4, borderRadius: 12, gap: 14,
  },
  sheetIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sheetLabel: { flex: 1, fontSize: 15 },
  sheetCancel: { borderRadius: 100, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  sheetCancelText: { fontSize: 15 },
  smartRepliesContainer: {
    paddingHorizontal: 12, gap: 8, paddingBottom: 12
  },
  smartReplyChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, justifyContent: "center"
  },
  smartReplyText: { fontSize: 14 },
  summaryCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    marginHorizontal: 16, marginBottom: 16, padding: 12,
    borderRadius: 12, borderWidth: 1,
  },
  summaryTitle: { fontSize: 12, marginBottom: 4 },
  summaryText: { fontSize: 14, lineHeight: 20 },
});
