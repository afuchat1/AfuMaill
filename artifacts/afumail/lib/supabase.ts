import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config";

// The AfuMail Supabase project credentials are stored in supabase-config.ts.
// The anon key is an intentionally public client-side key — safe with RLS enabled.
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
): Promise<{ error?: string }> {
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
  });

  if (profileError) return { error: profileError.message };
  return {};
}

export async function signInUser(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return {};
}
