import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_PREFERENCES,
  getPreferences,
  setPref,
  type Preferences,
} from "@/lib/preferences";

interface PreferencesContextValue {
  preferences: Preferences;
  isLoading: boolean;
  updatePreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  isLoading: false,
  updatePreference: async () => {},
  refreshPreferences: async () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPreferences = useCallback(async () => {
    if (!user?.id) {
      setPreferences(DEFAULT_PREFERENCES);
      return;
    }

    setIsLoading(true);
    try {
      setPreferences(await getPreferences(user.id));
    } catch (error) {
      console.warn("Failed to load preferences:", error);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshPreferences();
  }, [refreshPreferences]);

  const updatePreference = useCallback(
    async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      if (!user?.id) return;
      const previous = preferences;
      const next = { ...previous, [key]: value };
      setPreferences(next);
      try {
        await setPref(user.id, key, value);
      } catch (error) {
        setPreferences(previous);
        throw error;
      }
    },
    [preferences, user?.id],
  );

  return (
    <PreferencesContext.Provider value={{ preferences, isLoading, updatePreference, refreshPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}