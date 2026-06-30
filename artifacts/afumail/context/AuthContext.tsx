import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const stored = await AsyncStorage.getItem("afumail_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (_) {}
    setIsLoading(false);
  }

  async function login(email: string, password: string): Promise<boolean> {
    if (!email.trim() || !password.trim()) return false;
    const normalizedEmail = email.toLowerCase().trim();
    const finalEmail = normalizedEmail.includes("@")
      ? normalizedEmail
      : `${normalizedEmail}@afuchat.com`;
    const namePart = finalEmail.split("@")[0] ?? "";
    const displayName = namePart
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    const newUser: AuthUser = {
      id: "user_1",
      name: displayName || "User",
      email: finalEmail,
    };
    await AsyncStorage.setItem("afumail_user", JSON.stringify(newUser));
    setUser(newUser);
    return true;
  }

  async function logout() {
    await AsyncStorage.removeItem("afumail_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
