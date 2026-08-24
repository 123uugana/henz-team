import { clearSession, getSession, saveSession } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
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

  const json = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  if (!json || !json.success) {
    throw new ApiError(
      response.status,
      json?.success === false ? json.message : "Сервертэй холбогдож чадсангүй.",
      json?.success === false ? json.code : undefined,
    );
  }

  return json.data;
}

async function tryRefresh(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;

  try {
    const result = await apiFetch<{
      accessToken: string;
      refreshToken: string;
    }>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    saveSession({
      ...session,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return result.accessToken;
  } catch {
    return null;
  }
}

async function authorizedFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const session = getSession();

  if (!session) {
    throw new ApiError(401, "Нэвтрэх шаардлагатай.", "UNAUTHORIZED");
  }

  try {
    return await apiFetch<T>(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        ...init?.headers,
      },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    const accessToken = await tryRefresh();
    if (!accessToken) {
      clearSession();
      throw err;
    }

    return apiFetch<T>(path, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers },
    });
  }
}

// --- Auth --------------------------------------------------------------------

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

export async function sendOtp(phoneNumber: string) {
  const result = await apiFetch<{ phoneNumber: string; code?: string }>(
    "/api/auth/send-otp",
    { method: "POST", body: JSON.stringify({ phoneNumber }) },
  );

  if (result.code) {
    // Only present when the backend has EXPOSE_OTP=true (local/dev testing).
    console.log(`[dev] OTP code for ${phoneNumber}: ${result.code}`);
  }

  return result;
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

// --- Livestock -----------------------------------------------------------------

export type Gender = "MALE" | "FEMALE" | "UNKNOWN";
export type Species = "SHEEP" | "GOAT";
export type LivestockStatus = "ACTIVE" | "MISSING" | "INACTIVE";

export interface LivestockLocation {
  latitude: number;
  longitude: number;
  updatedAt: string;
}

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
  location: LivestockLocation | null;
  rfidTag: { id: string; epc: string } | null;
  lastScan: { scannedAt: string } | null;
}

export interface LivestockListResult {
  items: Livestock[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
  imageUrl?: string | null;
}

export interface ScanRecord {
  id: string;
  epc: string;
  direction: "ENTER" | "EXIT" | "UNKNOWN";
  scannedAt: string;
  reader: { id: string; name: string } | null;
}

export function listLivestock(params: {
  search?: string;
  status?: LivestockStatus;
  species?: Species;
  gender?: Gender;
  page: number;
  limit: number;
}) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.species) query.set("species", params.species);
  if (params.gender) query.set("gender", params.gender);

  return authorizedFetch<LivestockListResult>(
    `/api/livestock?${query.toString()}`,
  );
}

export function getLivestock(id: string) {
  return authorizedFetch<Livestock>(`/api/livestock/${id}`);
}

export function createLivestock(input: LivestockInput) {
  return authorizedFetch<Livestock>("/api/livestock", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLivestock(id: string, input: LivestockInput) {
  return authorizedFetch<Livestock>(`/api/livestock/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteLivestock(id: string) {
  return authorizedFetch<{ id: string; deleted: boolean }>(
    `/api/livestock/${id}`,
    {
      method: "DELETE",
    },
  );
}

export function updateLivestockStatus(id: string, status: LivestockStatus) {
  return authorizedFetch<Livestock>(`/api/livestock/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateLivestockLocation(
  id: string,
  latitude: number,
  longitude: number,
) {
  return authorizedFetch<Livestock>(`/api/livestock/${id}/location`, {
    method: "PATCH",
    body: JSON.stringify({ latitude, longitude }),
  });
}

export function getLivestockScans(id: string) {
  return authorizedFetch<ScanRecord[]>(`/api/livestock/${id}/scans`);
}

export interface RecentScan {
  id: string;
  epc: string;
  direction: "ENTER" | "EXIT" | "UNKNOWN";
  scannedAt: string;
  reader: { id: string; name: string } | null;
  livestock: { id: string; earNumber: string; name?: string } | null;
}

/** Recent scans across all readers, including ones whose tag isn't one of mine. */
export function listScans() {
  return authorizedFetch<RecentScan[]>("/api/scans");
}

// --- Dashboard / reports -------------------------------------------------------

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

export function getDashboard() {
  return authorizedFetch<Dashboard>("/api/dashboard");
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

export function getMissingLivestock() {
  return authorizedFetch<MissingLivestockEntry[]>("/api/reports/missing");
}

export type HistoryRangeKey = "7d" | "1m" | "3m" | "6m" | "1y";

export interface HistoryPoint {
  label: string;
  total: number;
}

export interface HistoryReport {
  points: HistoryPoint[];
  added: number;
  removed: number;
  todayDelta: number;
}

export function getHistory(range: HistoryRangeKey) {
  return authorizedFetch<HistoryReport>(`/api/reports/history?range=${range}`);
}

// --- Alerts ----------------------------------------------------------------------

export interface Alert {
  id: string;
  type: "MISSING" | "FOUND" | "SYSTEM";
  title: string;
  message: string;
  isRead: boolean;
  livestockId?: string | null;
  createdAt: string;
}

export function listAlerts() {
  return authorizedFetch<Alert[]>("/api/alerts");
}

export function readAlert(id: string) {
  return authorizedFetch<{ id: string; isRead: boolean }>(
    `/api/alerts/${id}/read`,
    {
      method: "PATCH",
    },
  );
}

export function readAllAlerts() {
  return authorizedFetch<{ updated: boolean }>("/api/alerts/read-all", {
    method: "PATCH",
  });
}

// --- RFID tag registry -------------------------------------------------------------

export type TagStatus = "AVAILABLE" | "CLAIMED" | "LOCKED" | "DAMAGED";

export interface TagRegistryEntry {
  epc: string;
  status: TagStatus;
  claimedByUserId?: string;
  claimedAt?: string;
}

export function getTag(epc: string) {
  return authorizedFetch<TagRegistryEntry>(
    `/api/rfid/tags/${encodeURIComponent(epc)}`,
  );
}

export function claimTag(epc: string) {
  return authorizedFetch<TagRegistryEntry>("/api/rfid/tags/claim", {
    method: "POST",
    body: JSON.stringify({ epc }),
  });
}

export function listAdminTags() {
  return authorizedFetch<TagRegistryEntry[]>("/api/admin/tags");
}

export function unlockTag(epc: string) {
  return authorizedFetch<TagRegistryEntry>(
    `/api/admin/tags/${encodeURIComponent(epc)}/unlock`,
    { method: "PATCH" },
  );
}

// --- Dealer registrations ---------------------------------------------------------

export type DealerRegistrationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DealerRegistration {
  id: string;
  orgName: string;
  contact: string;
  prefixRequested: string;
  status: DealerRegistrationStatus;
  createdAt: string;
  decidedAt?: string;
}

export function createDealerRegistration(input: {
  orgName: string;
  contact: string;
  prefixRequested: string;
}) {
  return authorizedFetch<DealerRegistration>("/api/dealer-registrations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listDealerRegistrations() {
  return authorizedFetch<DealerRegistration[]>(
    "/api/admin/dealer-registrations",
  );
}

export function decideDealerRegistration(
  id: string,
  status: "APPROVED" | "REJECTED",
) {
  return authorizedFetch<DealerRegistration>(
    `/api/admin/dealer-registrations/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

// --- Dealer farmers ----------------------------------------------------------------

export interface Farmer {
  id: string;
  phoneNumber: string;
  name: string;
  aimag?: string;
  sum?: string;
  status: "ACTIVE" | "SUSPENDED";
  livestockCount: number;
  createdAt: string;
}

export interface FarmerListResult {
  items: Farmer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function listFarmers(
  params: {
    search?: string;
    aimag?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 50),
  });
  if (params.search) query.set("search", params.search);
  if (params.aimag) query.set("aimag", params.aimag);

  return authorizedFetch<FarmerListResult>(
    `/api/dealer/farmers?${query.toString()}`,
  );
}

export function addFarmer(input: {
  phoneNumber: string;
  name: string;
  aimag?: string;
  sum?: string;
}) {
  return authorizedFetch<Farmer>("/api/dealer/farmers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function removeFarmer(id: string) {
  return authorizedFetch<{ id: string; removed: boolean }>(
    `/api/dealer/farmers/${id}`,
    {
      method: "DELETE",
    },
  );
}

// --- Uploads -----------------------------------------------------------------------

export async function uploadImage(file: File) {
  const session = getSession();
  if (!session) {
    throw new ApiError(401, "Нэвтрэх шаардлагатай.", "UNAUTHORIZED");
  }

  const form = new FormData();
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: form,
    });
  } catch {
    throw new ApiError(0, "Сервертэй холбогдож чадсангүй.", "NETWORK_ERROR");
  }

  const json = (await response.json().catch(() => null)) as ApiEnvelope<{
    url: string;
  }> | null;

  if (!json || !json.success) {
    throw new ApiError(
      response.status,
      json?.success === false ? json.message : "Зураг илгээж чадсангүй.",
      json?.success === false ? json.code : undefined,
    );
  }

  return json.data;
}
