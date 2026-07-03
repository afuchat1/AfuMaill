import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import {
  getProfile,
  saveNotificationEmail,
  savePhoneNumber,
  saveSignature,
  saveVacationReply,
  type Profile,
} from "@/lib/supabase";
import { W } from "./webColors";

// ── reusable field components ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sec.root}>
      <Text style={[sec.title, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>{title}</Text>
      <View style={[sec.body, { backgroundColor: W.bgCard, borderColor: W.border }]}>{children}</View>
    </View>
  );
}
const sec = StyleSheet.create({
  root: { marginBottom: 28 },
  title: { fontSize: 13, letterSpacing: 0.3, marginBottom: 10 },
  body: { borderRadius: 12, overflow: "hidden" },
});

function FieldRow({
  label, value, onChange, placeholder, editable = true, type = "text",
  hint, last = false,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; editable?: boolean; type?: string;
  hint?: string; last?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[
      fld.root,
      !last && { borderBottomWidth: 1, borderBottomColor: W.border },
      focused && { backgroundColor: W.bgAccentSubtle },
    ]}>
      <Text style={[fld.label, { fontFamily: "Inter_500Medium", color: W.textMuted }]}>{label}</Text>
      <View style={fld.right}>
        {editable && onChange ? (
          <TextInput
            style={[fld.input, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
            placeholderTextColor={W.textMuted}
            secureTextEntry={type === "password"}
            keyboardType={type === "email" ? "email-address" : "default"}
            autoCapitalize={type === "email" ? "none" : "words"}
            autoCorrect={false}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        ) : (
          <Text style={[fld.readOnly, { fontFamily: "Inter_400Regular", color: editable ? W.textPrimary : W.textMuted }]}>
            {value || "—"}
          </Text>
        )}
        {!editable && (
          <View style={[fld.lockedBadge, { backgroundColor: W.bgSecondary }]}>
            <Feather name="lock" size={10} color={W.textMuted} />
          </View>
        )}
        {hint && <Text style={[fld.hint, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>{hint}</Text>}
      </View>
    </View>
  );
}
const fld = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  label: { fontSize: 13, width: 160, flexShrink: 0 },
  right: { flex: 1 },
  input: { fontSize: 14, paddingVertical: 2 },
  readOnly: { fontSize: 14 },
  lockedBadge: { alignSelf: "flex-start", marginTop: 4, padding: 4, borderRadius: 4 },
  hint: { fontSize: 11, marginTop: 4 },
});

function SaveBtn({ onPress, loading, saved }: { onPress: () => void; loading?: boolean; saved?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        btn.root,
        { backgroundColor: saved ? W.success : hovered ? W.accentHover : W.accent, opacity: loading ? 0.8 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Feather name={saved ? "check" : "save"} size={13} color="#fff" />
          <Text style={[btn.label, { fontFamily: "Inter_600SemiBold" }]}>{saved ? "Saved" : "Save changes"}</Text>
        </>
      )}
    </Pressable>
  );
}
const btn = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20 },
  label: { color: "#fff", fontSize: 13 },
});

// ── Main component ─────────────────────────────────────────────────────────────

export default function WebAccountPanel() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable states
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [notifEmail, setNotifEmail] = useState("");
  const [signature, setSignature] = useState("");
  const [vacationEnabled, setVacationEnabled] = useState(false);
  const [vacationMsg, setVacationMsg] = useState("");

  // Placeholder extras (UI-only for now)
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  // Save states
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savedIdentity, setSavedIdentity] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savedContact, setSavedContact] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [savedSignature, setSavedSignature] = useState(false);
  const [savingVacation, setSavingVacation] = useState(false);
  const [savedVacation, setSavedVacation] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then((p) => {
      if (p) {
        setProfile(p);
        setDisplayName(p.full_name ?? "");
        setPhone(p.phone_number ?? "");
        setNotifEmail(p.notification_email ?? "");
        setSignature(p.signature ?? "");
        setVacationEnabled(p.vacation_reply_enabled ?? false);
        setVacationMsg(p.vacation_reply_message ?? "");
      }
      setLoading(false);
    });
  }, [user]);

  async function saveIdentity() {
    if (!user) return;
    setSavingIdentity(true); setError("");
    // display name is part of the auth user; phone is stored in profile
    const { error: err } = await savePhoneNumber(user.id, phone);
    if (err) { setError(err); setSavingIdentity(false); return; }
    setSavedIdentity(true);
    setTimeout(() => setSavedIdentity(false), 2500);
    setSavingIdentity(false);
  }

  async function saveContact() {
    if (!user) return;
    setSavingContact(true); setError("");
    const { error: err } = await saveNotificationEmail(user.id, notifEmail);
    if (err) { setError(err); setSavingContact(false); return; }
    setSavedContact(true);
    setTimeout(() => setSavedContact(false), 2500);
    setSavingContact(false);
  }

  async function handleSaveSignature() {
    if (!user) return;
    setSavingSignature(true); setError("");
    const { error: err } = await saveSignature(user.id, signature);
    if (err) { setError(err); setSavingSignature(false); return; }
    setSavedSignature(true);
    setTimeout(() => setSavedSignature(false), 2500);
    setSavingSignature(false);
  }

  async function handleSaveVacation() {
    if (!user) return;
    setSavingVacation(true); setError("");
    const { error: err } = await saveVacationReply(user.id, vacationEnabled, vacationMsg);
    if (err) { setError(err); setSavingVacation(false); return; }
    setSavedVacation(true);
    setTimeout(() => setSavedVacation(false), 2500);
    setSavingVacation(false);
  }

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: W.bg }]}>
        <ActivityIndicator size="large" color={W.accent} />
        <Text style={[styles.loadingText, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>Loading profile…</Text>
      </View>
    );
  }

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "Unknown";

  return (
    <ScrollView style={[styles.root, { backgroundColor: W.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Page header */}
      <View style={[styles.pageHeader, { borderBottomColor: W.border }]}>
        <View>
          <Text style={[styles.pageTitle, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>Profile &amp; Account</Text>
          <Text style={[styles.pageSub, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
            Manage your Afu identity and preferences
          </Text>
        </View>
        {/* Ecosystem badge */}
        <View style={[styles.ecosystemPill, { backgroundColor: W.bgAccentSubtle, borderColor: W.accentLight }]}>
          <Feather name="globe" size={12} color={W.accent} />
          <Text style={[styles.ecosystemText, { fontFamily: "Inter_600SemiBold", color: W.accentText }]}>Afu Ecosystem Account</Text>
        </View>
      </View>

      {/* Error banner */}
      {!!error && (
        <View style={[styles.errorBanner, { backgroundColor: W.destructiveLight, borderColor: W.destructive + "33" }]}>
          <Feather name="alert-circle" size={14} color={W.destructive} />
          <Text style={[styles.errorText, { fontFamily: "Inter_400Regular", color: W.destructive }]}>{error}</Text>
        </View>
      )}

      {/* Avatar + identity summary */}
      <View style={[styles.identityCard, { backgroundColor: W.bgCard, borderColor: W.border }]}>
        <View style={styles.avatarWrap}>
          <Avatar name={user?.name ?? ""} size={72} fontSize={26} />
          <View style={[styles.verifiedBadge, { backgroundColor: W.success }]}>
            <Feather name="check" size={10} color="#fff" />
          </View>
        </View>
        <View style={styles.identitySummary}>
          <Text style={[styles.identityName, { fontFamily: "Inter_700Bold", color: W.textPrimary }]}>
            {user?.name ?? ""}
          </Text>
          <Text style={[styles.identityEmail, { fontFamily: "Inter_400Regular", color: W.textSecondary }]}>
            {user?.username}@afuchat.com
          </Text>
          <View style={styles.identityMeta}>
            <View style={[styles.chip, { backgroundColor: W.successLight }]}>
              <Feather name="shield" size={11} color={W.success} />
              <Text style={[styles.chipText, { fontFamily: "Inter_500Medium", color: W.success }]}>Verified</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: W.bgSecondary }]}>
              <Feather name="calendar" size={11} color={W.textMuted} />
              <Text style={[styles.chipText, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>Joined {joinedDate}</Text>
            </View>
          </View>
        </View>
        <View style={styles.accountId}>
          <Text style={[styles.accountIdLabel, { fontFamily: "Inter_500Medium", color: W.textMuted }]}>Account ID</Text>
          <Text style={[styles.accountIdValue, { fontFamily: "Inter_400Regular", color: W.textSecondary }]} numberOfLines={1}>
            {user?.id}
          </Text>
        </View>
      </View>

      {/* Identity section */}
      <Section title="Identity">
        <FieldRow label="Full name"  value={displayName} onChange={setDisplayName} placeholder="Jane Smith" />
        <FieldRow label="Username"   value={`@${user?.username ?? ""}`} editable={false} />
        <FieldRow label="Email address" value={`${user?.username}@afuchat.com`} editable={false} hint="This is your AfuMail identity — it cannot be changed." />
        <FieldRow label="Phone number" value={phone} onChange={setPhone} placeholder="+1 234 567 8900" last />
      </Section>
      <View style={styles.sectionActions}>
        <SaveBtn onPress={saveIdentity} loading={savingIdentity} saved={savedIdentity} />
      </View>

      {/* Preferences section */}
      <Section title="Preferences">
        <FieldRow label="Country"   value={country}   onChange={setCountry}   placeholder="e.g. United States" />
        <FieldRow label="Language"  value={language}  onChange={setLanguage}  placeholder="e.g. English" />
        <FieldRow label="Time zone" value={timezone}  onChange={setTimezone}  placeholder="e.g. America/New_York" last />
      </Section>
      <View style={styles.sectionActions}>
        <Text style={[styles.infoText, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
          Preferences sync across all Afu applications.
        </Text>
      </View>

      {/* Contact & recovery */}
      <Section title="Contact &amp; Recovery">
        <FieldRow
          label="Recovery email"
          value={notifEmail}
          onChange={setNotifEmail}
          placeholder="you@gmail.com"
          type="email"
          hint="Used for password resets and security alerts."
          last
        />
      </Section>
      <View style={styles.sectionActions}>
        <SaveBtn onPress={saveContact} loading={savingContact} saved={savedContact} />
      </View>

      {/* Email signature */}
      <Section title="Email Signature">
        <View style={[styles.textAreaWrap, { borderBottomColor: W.border }]}>
          <TextInput
            style={[styles.textArea, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
            value={signature}
            onChangeText={setSignature}
            placeholder="Add a signature that appears at the bottom of your messages…"
            placeholderTextColor={W.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </Section>
      <View style={styles.sectionActions}>
        <SaveBtn onPress={handleSaveSignature} loading={savingSignature} saved={savedSignature} />
      </View>

      {/* Vacation reply */}
      <Section title="Vacation Reply">
        <View style={[styles.toggleRow, { borderBottomColor: W.border }]}>
          <Text style={[styles.toggleLabel, { fontFamily: "Inter_500Medium", color: W.textPrimary }]}>Auto-reply when away</Text>
          <Pressable
            onPress={() => setVacationEnabled((v) => !v)}
            style={[styles.toggle, { backgroundColor: vacationEnabled ? W.accent : W.border }]}
          >
            <View style={[styles.toggleThumb, { left: vacationEnabled ? 20 : 2 }]} />
          </Pressable>
        </View>
        {vacationEnabled && (
          <View style={styles.textAreaWrap}>
            <TextInput
              style={[styles.textArea, { fontFamily: "Inter_400Regular", color: W.textPrimary }]}
              value={vacationMsg}
              onChangeText={setVacationMsg}
              placeholder="Thanks for your email. I'm away and will respond when I return…"
              placeholderTextColor={W.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}
      </Section>
      <View style={styles.sectionActions}>
        <SaveBtn onPress={handleSaveVacation} loading={savingVacation} saved={savedVacation} />
      </View>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <View style={[styles.dangerRow, { borderBottomColor: W.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dangerTitle, { fontFamily: "Inter_600SemiBold", color: W.textPrimary }]}>Delete account</Text>
            <Text style={[styles.dangerSub, { fontFamily: "Inter_400Regular", color: W.textMuted }]}>
              Permanently delete your Afu account and all associated data. This cannot be undone.
            </Text>
          </View>
          <Pressable style={[styles.dangerBtn, { borderColor: W.destructive }]}>
            <Feather name="trash-2" size={14} color={W.destructive} />
            <Text style={[styles.dangerBtnLabel, { fontFamily: "Inter_600SemiBold", color: W.destructive }]}>Delete account</Text>
          </Pressable>
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  root: { flex: 1 },
  content: { paddingHorizontal: 40, paddingTop: 28, paddingBottom: 60, maxWidth: 760, alignSelf: "center", width: "100%" },
  pageHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 28, paddingBottom: 20,
  },
  pageTitle: { fontSize: 22, letterSpacing: -0.4 },
  pageSub: { fontSize: 14, marginTop: 4 },
  ecosystemPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  ecosystemText: { fontSize: 12 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 8, marginBottom: 20,
  },
  errorText: { fontSize: 13, flex: 1 },
  identityCard: {
    flexDirection: "row", alignItems: "center", gap: 20,
    padding: 24, borderRadius: 14, marginBottom: 32,
  },
  avatarWrap: { position: "relative" },
  verifiedBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: W.bgCard,
  },
  identitySummary: { flex: 1, gap: 6 },
  identityName: { fontSize: 20, letterSpacing: -0.3 },
  identityEmail: { fontSize: 14 },
  identityMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 12 },
  accountId: { alignItems: "flex-end", maxWidth: 180 },
  accountIdLabel: { fontSize: 10, letterSpacing: 0.8, marginBottom: 4 },
  accountIdValue: { fontSize: 11 },
  sectionActions: {
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    marginTop: -20, marginBottom: 24, gap: 12,
  },
  infoText: { fontSize: 12 },
  textAreaWrap: { padding: 16 },
  textArea: { fontSize: 14, lineHeight: 22, minHeight: 96 },
  toggleRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { flex: 1, fontSize: 14 },
  toggle: { width: 40, height: 22, borderRadius: 11, position: "relative" },
  toggleThumb: {
    position: "absolute", top: 2, width: 18, height: 18,
    borderRadius: 9, backgroundColor: "#fff",
  },
  dangerRow: {
    flexDirection: "row", alignItems: "center", gap: 16,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  dangerTitle: { fontSize: 14, marginBottom: 4 },
  dangerSub: { fontSize: 13, lineHeight: 20 },
  dangerBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 8, borderWidth: 1.5,
  },
  dangerBtnLabel: { fontSize: 13 },
});
