import { getPreferencesRaw, savePreferencesRaw } from "./supabase";

export interface Preferences {
  fontSize: "Small" | "Medium" | "Large";
  emailDensity: "Compact" | "Comfortable";
  externalImages: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  fontSize: "Medium",
  emailDensity: "Comfortable",
  externalImages: true,
};

export async function getPreferences(userId: string): Promise<Preferences> {
  if (!userId) return { ...DEFAULT_PREFERENCES };
  const raw = await getPreferencesRaw(userId);
  return { ...DEFAULT_PREFERENCES, ...raw } as Preferences;
}

export async function setPref<K extends keyof Preferences>(
  userId: string,
  key: K,
  value: Preferences[K]
): Promise<void> {
  if (!userId) return;
  const current = await getPreferences(userId);
  const { error } = await savePreferencesRaw(userId, { ...current, [key]: value });
  if (error) throw new Error(error);
}

export function getFontScale(fontSize: Preferences["fontSize"]): number {
  if (fontSize === "Small") return 0.9;
  if (fontSize === "Large") return 1.1;
  return 1;
}
