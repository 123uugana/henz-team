import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthUser } from "@/native/api";

const STORAGE_KEY = "hents-hurga-session";

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

let cachedSession: Session | null = null;

export async function loadSession() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    cachedSession = null;
    return null;
  }

  try {
    cachedSession = JSON.parse(raw) as Session;
    return cachedSession;
  } catch {
    cachedSession = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function getSession() {
  return cachedSession;
}

export async function saveSession(session: Session) {
  cachedSession = session;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function clearSession() {
  cachedSession = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
}
