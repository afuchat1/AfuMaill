import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

/**
 * Check if a username is available.
 * Queries the public profiles table (SELECT is open to anon).
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    console.warn("Username check error:", error.message);
    // If the profiles table doesn't exist yet, treat as available
    return true;
  }
  return data === null;
}

/**
 * Register a new user with Supabase Auth and insert a profile row.
 */
export async function registerUser(
  email: string,
  password: string,
  username: string,
  fullName: string
): Promise<{ error?: string }> {
  // 1. Create auth user
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { error: "Registration failed. Please try again." };
  }

  // 2. Insert profile row
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    username: username.toLowerCase().trim(),
    full_name: fullName,
    email,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  return {};
}

/**
 * Sign in an existing user.
 */
export async function signInUser(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return {};
}
