import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase-config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Password recovery is handled only through the branded recovery-email
    // code flow. Do not let a Supabase recovery URL create a reset session.
    detectSessionInUrl: false,
  },
});

const AFUCHAT_EMAIL_RE = /^[^\s@]+@afuchat\.com$/i;

export function normalizeAfuChatEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return AFUCHAT_EMAIL_RE.test(normalized) ? normalized : null;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  recovery_email: string | null;
  signature: string;
  vacation_reply_enabled: boolean;
  vacation_reply_message: string;
  preferences: Record<string, unknown> | null;
  recent_searches: string[] | null;
  created_at: string;
}

interface EmailAddressRecord {
  id: string;
  local_part: string;
  domain: string;
  full_email: string | null;
  is_primary: boolean;
}

async function getPreferredEmailAddress(userId: string): Promise<EmailAddressRecord | null> {
  const { data, error } = await supabase
    .from("email_addresses")
    .select("id,local_part,domain,full_email,is_primary")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Preferred email address load error:", error.message);
    return null;
  }
  return data as EmailAddressRecord | null;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("username_available", {
    _username: username.toLowerCase().trim(),
  });
  if (error) {
    console.warn("Username check error:", error.message);
    return false;
  }
  return data === true;
}

export async function registerUser(
  email: string,
  password: string,
  username: string,
  fullName: string,
  recoveryEmail: string
): Promise<{ error?: string; userId?: string }> {
  const normalizedRecoveryEmail = normalizeAfuChatEmail(recoveryEmail);
  if (!normalizedRecoveryEmail) {
    return { error: "Enter an existing AfuChat recovery address (username@afuchat.com)." };
  }

  const recoveryAddressExists = await isExistingAfuChatAddress(normalizedRecoveryEmail);
  if (recoveryAddressExists.error) {
    return { error: recoveryAddressExists.error };
  }
  if (!recoveryAddressExists.exists) {
    return { error: "That AfuChat address does not exist yet. Create the account before linking it." };
  }

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) return { error: signUpError.message };

  const userId = data.user?.id;
  if (!userId) return { error: "Registration failed. Please try again." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
    })
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  const { error: recoveryError } = await supabase.rpc("set_recovery_email", {
    _email: normalizedRecoveryEmail,
  });
  if (recoveryError) {
    await supabase.auth.signOut();
    return { error: recoveryError.message };
  }

  return { userId };
}

export async function sendPasswordReset(
  recoveryEmail: string
): Promise<{ error?: string; recoveryEmail?: string; maskedRecoveryEmail?: string }> {
  const normalizedEmail = normalizeAfuChatEmail(recoveryEmail);
  if (!normalizedEmail) {
    return { error: "Please enter the linked AfuChat recovery address (username@afuchat.com)." };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: "request", afuchatRecoveryEmail: normalizedEmail }),
    });
    const data = await res.json() as {
      ok?: boolean;
      error?: string;
      recoveryEmail?: string;
      maskedRecoveryEmail?: string;
    };
    if (!res.ok) return { error: data.error ?? "Failed to send reset email. Please try again." };
    // Keep the normalized address for the confirm request. The API may return
    // a masked address for display, but that value cannot be used for lookup.
    return {
      recoveryEmail: normalizedEmail,
      maskedRecoveryEmail: data.maskedRecoveryEmail ?? data.recoveryEmail,
    };
  } catch {
    return { error: "Network error. Please check your connection and try again." };
  }
}

export async function confirmPasswordReset(
  recoveryEmail: string,
  code: string,
  newPassword: string,
): Promise<{ error?: string }> {
  const normalizedEmail = normalizeAfuChatEmail(recoveryEmail);
  if (!normalizedEmail) {
    return { error: "Please enter the linked AfuChat recovery address (username@afuchat.com)." };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: "confirm",
        afuchatRecoveryEmail: normalizedEmail,
        code: code.trim(),
        newPassword,
      }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok) return { error: data.error ?? "Could not reset your password. Please try again." };
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

export async function saveRecoveryEmail(
  userId: string,
  recoveryUsername: string
): Promise<{ error?: string }> {
  if (!recoveryUsername.trim()) {
    const { error } = await supabase
      .from("profiles")
      .update({ recovery_email_address_id: null })
      .eq("id", userId);
    if (error) return { error: error.message };
    return {};
  }

  const normalized = recoveryUsername.trim().toLowerCase();
  const full = normalized.includes("@") ? normalized : `${normalized}@afuchat.com`;
  if (!normalizeAfuChatEmail(full)) {
    return { error: "Use an existing AfuChat recovery address (username@afuchat.com)." };
  }
  const { error } = await supabase.rpc("set_recovery_email", { _email: full });
  if (error) return { error: error.message };
  return {};
}

export async function isExistingAfuChatAddress(
  email: string,
): Promise<{ exists: boolean; error?: string }> {
  const normalized = normalizeAfuChatEmail(email);
  if (!normalized) {
    return { exists: false, error: "Use an existing AfuChat address (username@afuchat.com)." };
  }

  const { data, error } = await supabase.rpc("afuchat_email_exists", {
    _email: normalized,
  });
  if (error) {
    console.warn("AfuChat address check error:", error.message);
    return { exists: false, error: "We could not verify that AfuChat address. Please try again." };
  }
  return { exists: data === true };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const [{ data, error }, address, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    getPreferredEmailAddress(userId),
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (error || !data) return null;

  let recoveryEmail: string | null = null;
  if (data.recovery_email_address_id) {
    const { data: recovery } = await supabase
      .from("email_addresses")
      .select("full_email")
      .eq("id", data.recovery_email_address_id)
      .maybeSingle();
    const candidate = recovery?.full_email ?? null;
    recoveryEmail = candidate && normalizeAfuChatEmail(candidate) ? candidate : null;
  }

  return {
    id: userId,
    username: address?.local_part ?? "",
    full_name: data.full_name ?? "",
    email: address?.full_email ?? (address ? `${address.local_part}@${address.domain}` : ""),
    phone_number: data.phone_number ?? null,
    recovery_email: recoveryEmail,
    signature: settings?.email_signature ?? "",
    vacation_reply_enabled: settings?.vacation_reply_enabled ?? false,
    vacation_reply_message: settings?.vacation_reply_message ?? "",
    preferences: data.preferences ?? {},
    recent_searches: data.recent_searches ?? [],
    created_at: data.created_at,
  };
}

export async function signInUser(
  email: string,
  password: string
): Promise<{ error?: string }> {
  if (!normalizeAfuChatEmail(email)) {
    return { error: "Sign in with your @afuchat.com AfuMail address." };
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { error: error.message };
  return {};
}

export async function saveSignature(
  userId: string,
  signature: string
): Promise<{ error?: string }> {
  const address = await getPreferredEmailAddress(userId);
  if (!address) return { error: "Primary AfuMail address not found." };
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, email_address_id: address.id, email_signature: signature }, {
      onConflict: "user_id",
    });
  if (error) return { error: error.message };
  return {};
}

export async function saveVacationReply(
  userId: string,
  enabled: boolean,
  message: string
): Promise<{ error?: string }> {
  const address = await getPreferredEmailAddress(userId);
  if (!address) return { error: "Primary AfuMail address not found." };
  const { error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: userId,
      email_address_id: address.id,
      vacation_reply_enabled: enabled,
      vacation_reply_message: message,
    }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  return {};
}

export async function getEmailStats(userId: string): Promise<{
  total: number;
  byFolder: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from("emails")
    .select("folder_id, folders!emails_folder_id_fkey(type)")
    .eq("user_id", userId);

  if (error || !data) return { total: 0, byFolder: {} };

  const byFolder: Record<string, number> = {};
  for (const row of data) {
    const f = ((row.folders as { type?: string } | null)?.type ?? "inbox");
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

type PendingCalendarOperation =
  | { type: "create"; event: CalendarEvent }
  | { type: "delete"; id: string };

const CALENDAR_CACHE_PREFIX = "afumail:calendar:";
const CALENDAR_QUEUE_PREFIX = "afumail:calendar-queue:";

function calendarCacheKey(userId: string, year: number, month: number): string {
  return `${CALENDAR_CACHE_PREFIX}${userId}:${year}-${String(month + 1).padStart(2, "0")}`;
}

function calendarQueueKey(userId: string): string {
  return `${CALENDAR_QUEUE_PREFIX}${userId}`;
}

async function readCalendarCache(
  userId: string,
  year: number,
  month: number,
): Promise<CalendarEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(calendarCacheKey(userId, year, month));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as CalendarEvent[] : [];
  } catch {
    return [];
  }
}

async function writeCalendarCache(
  userId: string,
  year: number,
  month: number,
  events: CalendarEvent[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(calendarCacheKey(userId, year, month), JSON.stringify(events));
  } catch (error) {
    console.warn("calendar cache write error:", error);
  }
}

async function readCalendarQueue(userId: string): Promise<PendingCalendarOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(calendarQueueKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as PendingCalendarOperation[] : [];
  } catch {
    return [];
  }
}

async function writeCalendarQueue(
  userId: string,
  operations: PendingCalendarOperation[],
): Promise<void> {
  if (operations.length === 0) {
    await AsyncStorage.removeItem(calendarQueueKey(userId));
    return;
  }
  await AsyncStorage.setItem(calendarQueueKey(userId), JSON.stringify(operations));
}

async function applyPendingCalendarOperations(userId: string): Promise<void> {
  const operations = await readCalendarQueue(userId);
  if (operations.length === 0) return;

  const remaining: PendingCalendarOperation[] = [];
  for (const operation of operations) {
    try {
      if (operation.type === "create") {
        const { data, error } = await supabase
          .from("calendar_events")
          .insert({
            owner_id: userId,
            title: operation.event.title,
            event_date: operation.event.event_date,
            event_time: operation.event.event_time,
            duration: operation.event.duration,
            color: operation.event.color,
            note: operation.event.note,
          })
          .select()
          .single();
        if (error || !data) throw error ?? new Error("Calendar event sync returned no row.");

        // Replace the temporary local ID in the month cache with Supabase's ID.
        const event = data as CalendarEvent;
        const cached = await readCalendarCache(
          userId,
          Number(operation.event.event_date.slice(0, 4)),
          Number(operation.event.event_date.slice(5, 7)) - 1,
        );
        await writeCalendarCache(
          userId,
          Number(operation.event.event_date.slice(0, 4)),
          Number(operation.event.event_date.slice(5, 7)) - 1,
          cached.map((item) => item.id === operation.event.id ? event : item),
        );
      } else {
        const { error } = await supabase.from("calendar_events").delete().eq("id", operation.id);
        if (error) throw error;
      }
    } catch {
      remaining.push(operation);
    }
  }
  await writeCalendarQueue(userId, remaining);
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

  const cached = await readCalendarCache(userId, year, month);

  // A successful request is also our connectivity signal. Replaying queued
  // changes before loading makes offline edits durable after reconnecting.
  try {
    await applyPendingCalendarOperations(userId);
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("owner_id", userId)
      .gte("event_date", startDate)
      .lt("event_date", endDate)
      .order("event_date");

    if (error || !data) throw error ?? new Error("Calendar query returned no data.");
    const events = data as CalendarEvent[];
    await writeCalendarCache(userId, year, month, events);
    return events;
  } catch {
    return cached;
  }
}

export async function createCalendarEvent(
  input: Omit<CalendarEvent, "id" | "created_at">
): Promise<CalendarEvent> {
  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert(input)
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Calendar event was not created.");
    const event = data as CalendarEvent;
    const year = Number(event.event_date.slice(0, 4));
    const month = Number(event.event_date.slice(5, 7)) - 1;
    const cached = await readCalendarCache(input.owner_id, year, month);
    await writeCalendarCache(input.owner_id, year, month, [
      ...cached.filter((item) => item.id !== event.id),
      event,
    ]);
    return event;
  } catch {
    const event: CalendarEvent = {
      ...input,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    };
    const year = Number(event.event_date.slice(0, 4));
    const month = Number(event.event_date.slice(5, 7)) - 1;
    const cached = await readCalendarCache(input.owner_id, year, month);
    await writeCalendarCache(input.owner_id, year, month, [...cached, event]);
    const queue = await readCalendarQueue(input.owner_id);
    await writeCalendarQueue(input.owner_id, [...queue, { type: "create", event }]);
    return event;
  }
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) throw error;
    return;
  } catch {
    // The caller only has an ID, so remove it from cached months and queue the
    // delete. A later calendar read will replay it after connectivity returns.
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((key) => key.startsWith(CALENDAR_CACHE_PREFIX));
    const entries = await AsyncStorage.multiGet(cacheKeys);
    await Promise.all(entries.map(async ([key, raw]) => {
      if (!raw) return;
      try {
        const events = JSON.parse(raw) as CalendarEvent[];
        await AsyncStorage.setItem(key, JSON.stringify(events.filter((event) => event.id !== id)));
      } catch {}
    }));

    const ownerIds = cacheKeys
      .map((key) => key.slice(CALENDAR_CACHE_PREFIX.length).split(":")[0])
      .filter(Boolean);
    for (const ownerId of ownerIds) {
      const queue = await readCalendarQueue(ownerId);
      const withoutLocalCreate = queue.filter(
        (operation) => !(operation.type === "create" && operation.event.id === id),
      );
      if (withoutLocalCreate.length !== queue.length) {
        await writeCalendarQueue(ownerId, withoutLocalCreate);
        continue;
      }
      await writeCalendarQueue(ownerId, [...withoutLocalCreate, { type: "delete", id }]);
    }
  }
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
