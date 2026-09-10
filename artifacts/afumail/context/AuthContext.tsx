import type { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

const PROFILE_CACHE_PREFIX = "afumail:profile:";

function profileCacheKey(userId: string): string {
  return `${PROFILE_CACHE_PREFIX}${userId}`;
}

async function readCachedProfile(userId: string): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(profileCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (
      parsed.id !== userId ||
      typeof parsed.name !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.username !== "string"
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      username: parsed.username,
    };
  } catch {
    return null;
  }
}

async function writeCachedProfile(profile: AuthUser): Promise<void> {
  try {
    await AsyncStorage.setItem(profileCacheKey(profile.id), JSON.stringify(profile));
  } catch (error) {
    console.warn("profile cache write error:", error);
  }
}

async function loadProfile(userId: string): Promise<AuthUser | null> {
  const [{ data, error }, { data: address, error: addressError }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase
      .from("email_addresses")
      .select("local_part,domain,full_email")
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (error || addressError) {
    console.warn("Profile load error:", error?.message ?? addressError?.message);
    return null;
  }
  if (!data) {
    console.warn("Profile load returned no profile for authenticated user.");
    return null;
  }

  // Keep the authenticated session identity when legacy data has no
  // email_addresses row. This prevents a valid session from being replaced
  // with an empty sender address while the account is repaired.
  const sessionEmail = (await supabase.auth.getUser()).data.user?.email ?? "";
  const email = address?.full_email
    ?? (address ? `${address.local_part}@${address.domain}` : sessionEmail);
  return {
    id: userId,
    name: data.full_name ?? address?.local_part ?? sessionEmail.split("@")[0] ?? "AfuMail user",
    email,
    username: address?.local_part ?? sessionEmail.split("@")[0] ?? "",
  };
}

function isAfuChatSession(session: Session): boolean {
  const email = session.user.email?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@afuchat\.com$/.test(email);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function sessionFallback(session: Session): AuthUser {
    const email = session.user.email ?? "";
    const username = email.toLowerCase().endsWith("@afuchat.com")
      ? email.slice(0, -"@afuchat.com".length)
      : email.split("@")[0] ?? "";

    return {
      id: session.user.id,
      name:
        (session.user.user_metadata?.full_name as string | undefined) ??
        (session.user.user_metadata?.name as string | undefined) ??
        username,
      email,
      username,
    };
  }

  async function hydrate(session: Session | null) {
    try {
      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (!isAfuChatSession(session)) {
        await supabase.auth.signOut();
        setUser(null);
        setIsLoading(false);
        return;
      }

      // A Supabase Auth session is the source of truth for authentication.
      // Do not turn a profile/RLS/network issue into an apparent login failure.
      // The profile query below only enriches the authenticated identity.
      setUser(sessionFallback(session));
      setIsLoading(false);

      const cachedProfile = await readCachedProfile(session.user.id);
      if (cachedProfile) setUser(cachedProfile);

      const profile = await loadProfile(session.user.id);
      if (profile) {
        setUser(profile);
        void writeCachedProfile(profile);
      }
    } catch (err) {
      console.warn("AuthContext hydrate error:", err);
      if (session?.user && isAfuChatSession(session)) setUser(sessionFallback(session));
      else setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (mounted) hydrate(session);
      })
      .catch((err) => {
        console.warn("getSession error:", err);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        hydrate(session);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function refreshUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(sessionFallback(session));
      const cachedProfile = await readCachedProfile(session.user.id);
      if (cachedProfile) setUser(cachedProfile);
      const profile = await loadProfile(session.user.id);
      if (profile) {
        setUser(profile);
        void writeCachedProfile(profile);
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
