import AsyncStorage from "@react-native-async-storage/async-storage";

const PREF_KEY = "@afumail:preferences";

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

export async function getPreferences(): Promise<Preferences> {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setPref<K extends keyof Preferences>(
  key: K,
  value: Preferences[K]
): Promise<void> {
  const current = await getPreferences();
  await AsyncStorage.setItem(PREF_KEY, JSON.stringify({ ...current, [key]: value }));
}
