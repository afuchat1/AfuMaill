import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase-config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  recovery_email: string | null;
  notification_email: string | null;
  signature: string;
  vacation_reply_enabled: boolean;
  vacation_reply_message: string;
  preferences: Record<string, unknown> | null;
  recent_searches: string[] | null;
  created_at: string;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    console.warn("Username check error:", error.message);
    return true;
  }
  return data === null;
}

export async function registerUser(
  email: string,
  password: string,
  username: string,
  fullName: string,
  notificationEmail?: string
): Promise<{ error?: string; userId?: string }> {
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) return { error: signUpError.message };

  const userId = data.user?.id;
  if (!userId) return { error: "Registration failed. Please try again." };

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    username: username.toLowerCase().trim(),
    full_name: fullName,
    email,
    phone_number: null,
    recovery_email: null,
    notification_email: notificationEmail ?? null,
  });

  if (profileError) return { error: profileError.message };
  return { userId };
}

export async function sendPasswordReset(username: string): Promise<{ error?: string }> {
  const slug = username.trim().toLowerCase().replace(/@afuchat\.com$/, "");
  if (!slug) return { error: "Please enter your AfuMail username." };

  const redirectTo =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : (process.env.EXPO_PUBLIC_SITE_URL ?? `https://${process.env.EXPO_PUBLIC_DOMAIN}` ?? "https://mail.afuchat.com");

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ username: slug, redirectTo }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok) return { error: data.error ?? "Failed to send reset email. Please try again." };
    return {};
  } catch {
    return { error: "Network error. Please check your connection and try again." };
  }
}

export async function savePhoneNumber(
  userId: string,
  phone: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({ phone_number: phone.trim() || null })
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function saveNotificationEmail(
  userId: string,
  email: string
): Promise<{ error?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: "Please enter a valid email address." };
  }
  if (trimmed.endsWith("@afuchat.com")) {
    return { error: "Please use a real external email (e.g. Gmail, Outlook)." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ notification_email: trimmed || null })
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function saveRecoveryEmail(
  userId: string,
  recoveryUsername: string
): Promise<{ error?: string }> {
  if (!recoveryUsername.trim()) {
    const { error } = await supabase
      .from("profiles")
      .update({ recovery_email: null })
      .eq("id", userId);
    if (error) return { error: error.message };
    return {};
  }

  const normalized = recoveryUsername.trim().toLowerCase();
  const full = normalized.includes("@") ? normalized : `${normalized}@afuchat.com`;

  const { data: found } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", full)
    .neq("id", userId)
    .maybeSingle();

  if (!found) return { error: "No AfuMail account found with that username." };

  const { error } = await supabase
    .from("profiles")
    .update({ recovery_email: full })
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export async function signInUser(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return {};
}

export async function saveSignature(
  userId: string,
  signature: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({ signature })
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function saveVacationReply(
  userId: string,
  enabled: boolean,
  message: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({ vacation_reply_enabled: enabled, vacation_reply_message: message })
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function getEmailStats(userId: string): Promise<{
  total: number;
  byFolder: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from("emails")
    .select("folder")
    .eq("owner_id", userId);

  if (error || !data) return { total: 0, byFolder: {} };

  const byFolder: Record<string, number> = {};
  for (const row of data) {
    const f = (row.folder as string) || "inbox";
    byFolder[f] = (byFolder[f] ?? 0) + 1;
  }
  return { total: data.length, byFolder };
}

export interface CalendarEvent {
  id: string;
  owner_id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  duration: string | null;
  color: string;
  note: string;
  created_at: string;
}

export async function getCalendarEvents(
  userId: string,
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endMonth = month === 11 ? 1 : month + 2;
  const endYear = month === 11 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("owner_id", userId)
    .gte("event_date", startDate)
    .lt("event_date", endDate)
    .order("event_date");

  if (error || !data) return [];
  return data as CalendarEvent[];
}

export async function createCalendarEvent(
  input: Omit<CalendarEvent, "id" | "created_at">
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CalendarEvent;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getPreferencesRaw(
  userId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return {};
  return (data.preferences as Record<string, unknown>) ?? {};
}

export async function savePreferencesRaw(
  userId: string,
  preferences: Record<string, unknown>
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({ preferences })
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function getRecentSearches(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("recent_searches")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return [];
  return (data.recent_searches as string[]) ?? [];
}

export async function saveRecentSearches(
  userId: string,
  searches: string[]
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({ recent_searches: searches })
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function resetPasswordByRecoveryEmail(
  recoveryInput: string
): Promise<{ error?: string }> {
  return sendPasswordReset(recoveryInput);
}

export async function setNewPassword(password: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return {};
}
