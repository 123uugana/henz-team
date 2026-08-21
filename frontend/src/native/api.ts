import Constants from "expo-constants";
import { Platform } from "react-native";

import { clearSession, getSession, saveSession } from "@/native/session";

function getDebuggerHost() {
  const constants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    manifest?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
  };

  return (
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoGo?.debuggerHost ??
    constants.manifest?.debuggerHost
  );
}

function getApiBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit;

  const host = getDebuggerHost()?.split(":")[0];
  if (Platform.OS === "android") return "http://10.0.2.2:8787";
  if (host) return `http://${host}:8787`;

  return "http://localhost:8787";
}

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; message: string; code?: string };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Сервертэй холбогдож чадсангүй.", "NETWORK_ERROR");
  }

  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!json || !json.success) {
    throw new ApiError(
      response.status,
      json?.success === false ? json.message : "Сервертэй холбогдож чадсангүй.",
      json?.success === false ? json.code : undefined
    );
  }

  return json.data;
}

async function tryRefresh(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;

  try {
    const result = await apiFetch<{ accessToken: string; refreshToken: string }>(
      "/api/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) }
    );
    await saveSession({ ...session, accessToken: result.accessToken, refreshToken: result.refreshToken });
    return result.accessToken;
  } catch {
    return null;
  }
}

async function authorizedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();

  if (!session) {
    throw new ApiError(401, "Нэвтрэх шаардлагатай.", "UNAUTHORIZED");
  }

  try {
    return await apiFetch<T>(path, {
      ...init,
      headers: { Authorization: `Bearer ${session.accessToken}`, ...init?.headers },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    const accessToken = await tryRefresh();
    if (!accessToken) {
      await clearSession();
      throw err;
    }

    return apiFetch<T>(path, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers },
    });
  }
}

export interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string;
  role: "FARMER" | "ADMIN" | "DEALER";
}

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  requiresProfileSetup: boolean;
}

export type Gender = "MALE" | "FEMALE" | "UNKNOWN";
export type Species = "SHEEP" | "GOAT";
export type LivestockStatus = "ACTIVE" | "MISSING" | "INACTIVE";

export interface Livestock {
  id: string;
  earNumber: string;
  name?: string;
  species: Species;
  gender: Gender;
  birthYear?: number;
  color?: string;
  markDescription?: string;
  imageUrl: string | null;
  status: LivestockStatus;
  location: { latitude: number; longitude: number; updatedAt: string } | null;
  rfidTag: { id: string; epc: string } | null;
  lastScan: { scannedAt: string } | null;
}

export interface LivestockListResult {
  items: Livestock[];
  total: number;
}

export interface LivestockInput {
  earNumber: string;
  name?: string;
  species: Species;
  gender: Gender;
  birthYear?: number;
  color?: string;
  markDescription?: string;
  rfidEpc?: string;
}

export interface DashboardScan {
  id: string;
  scannedAt: string;
  direction: "ENTER" | "EXIT" | "UNKNOWN";
  epc: string;
  livestock: { id: string; earNumber: string; name?: string };
}

export interface Dashboard {
  totalLivestock: number;
  scannedToday: number;
  missingCount: number;
  unknownTagCount: number;
  sheepCount: number;
  goatCount: number;
  recentScans: DashboardScan[];
}

export interface MissingLivestockEntry {
  id: string;
  earNumber: string;
  name?: string;
  species: Species;
  markDescription?: string;
  imageUrl: string | null;
  lastSeenAt?: string;
}

export interface Alert {
  id: string;
  type: "MISSING" | "FOUND" | "SYSTEM";
  title: string;
  message: string;
  isRead: boolean;
  livestockId?: string | null;
  createdAt: string;
}

export function sendOtp(phoneNumber: string) {
  return apiFetch<{ phoneNumber: string; code?: string }>("/api/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export function verifyOtp(phoneNumber: string, code: string) {
  return apiFetch<VerifyOtpResult>("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, code }),
  });
}

export function getMe() {
  return authorizedFetch<AuthUser>("/api/auth/me");
}

export function updateProfile(name: string) {
  return authorizedFetch<AuthUser>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function getDashboard() {
  return authorizedFetch<Dashboard>("/api/dashboard");
}

export function listLivestock(params: { search?: string; status?: LivestockStatus; page?: number; limit?: number }) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 50),
  });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);

  return authorizedFetch<LivestockListResult>(`/api/livestock?${query.toString()}`);
}

export function createLivestock(input: LivestockInput) {
  return authorizedFetch<Livestock>("/api/livestock", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLivestockStatus(id: string, status: LivestockStatus) {
  return authorizedFetch<Livestock>(`/api/livestock/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getMissingLivestock() {
  return authorizedFetch<MissingLivestockEntry[]>("/api/reports/missing");
}

export function listAlerts() {
  return authorizedFetch<Alert[]>("/api/alerts");
}

export function readAllAlerts() {
  return authorizedFetch<{ updated: boolean }>("/api/alerts/read-all", {
    method: "PATCH",
  });
}
