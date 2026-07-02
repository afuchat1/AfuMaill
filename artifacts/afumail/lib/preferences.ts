import { getPreferencesRaw, savePreferencesRaw } from "./supabase";

export interface Preferences {
  fontSize: "Small" | "Medium" | "Large";
  emailDensity: "Compact" | "Comfortable";
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  pushNotifications: boolean;
  priorityNotifications: boolean;
  biometricLock: boolean;
  readReceipts: boolean;
  externalImages: boolean;
}

const DEFAULTS: Preferences = {
  fontSize: "Medium",
  emailDensity: "Comfortable",
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  pushNotifications: true,
  priorityNotifications: true,
  biometricLock: false,
  readReceipts: true,
  externalImages: true,
};

export async function getPreferences(userId: string): Promise<Preferences> {
  if (!userId) return { ...DEFAULTS };
  const raw = await getPreferencesRaw(userId);
  return { ...DEFAULTS, ...raw } as Preferences;
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
