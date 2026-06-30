import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  recovery_email: string | null;
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
  fullName: string
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
  });

  if (profileError) return { error: profileError.message };
  return { userId };
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

export async function resetPasswordByRecoveryEmail(
  recoveryInput: string
): Promise<{ error?: string }> {
  const normalized = recoveryInput.trim().toLowerCase();
  const full = normalized.includes("@") ? normalized : `${normalized}@afuchat.com`;

  const { data, error: findError } = await supabase
    .from("profiles")
    .select("email")
    .eq("recovery_email", full)
    .maybeSingle();

  if (findError || !data) {
    return { error: "No account is linked to that recovery email." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(data.email as string);
  if (error) return { error: error.message };
  return {};
}
