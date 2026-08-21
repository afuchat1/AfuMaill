import type { Session } from "@supabase/supabase-js";
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
  isPasswordRecovery: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isPasswordRecovery: false,
  logout: async () => {},
  refreshUser: async () => {},
  clearPasswordRecovery: () => {},
});

async function loadProfile(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Profile load error:", error.message);
    return null;
  }
  if (!data) {
    console.warn("Profile load returned no row for authenticated user.");
    return null;
  }

  return {
    id: userId,
    name: data.full_name as string,
    email: data.email as string,
    username: data.username as string,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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

      // A Supabase Auth session is the source of truth for authentication.
      // Do not turn a profile/RLS/network issue into an apparent login failure.
      // The profile query below only enriches the authenticated identity.
      setUser(sessionFallback(session));
      setIsLoading(false);

      const profile = await loadProfile(session.user.id);
      if (profile) setUser(profile);
    } catch (err) {
      console.warn("AuthContext hydrate error:", err);
      if (session?.user) setUser(sessionFallback(session));
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
      (event, session) => {
        if (!mounted) return;
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
          hydrate(session);
        } else {
          hydrate(session);
        }
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
      const profile = await loadProfile(session.user.id);
      if (profile) setUser(profile);
    }
  }

  function clearPasswordRecovery() {
    setIsPasswordRecovery(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isPasswordRecovery,
        logout,
        refreshUser,
        clearPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
