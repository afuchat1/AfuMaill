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

async function loadProfile(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

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

  async function hydrate(session: Session | null) {
    try {
      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const profile = await loadProfile(session.user.id);
      setUser(profile);
    } catch (err) {
      console.warn("AuthContext hydrate error:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    // Check existing session on mount
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

    // Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) hydrate(session);
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
      const profile = await loadProfile(session.user.id);
      setUser(profile);
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
