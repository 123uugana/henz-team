import { clearSession, getSession, saveSession } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

type AuthTokenResolver = () => Promise<string | null>;

let authTokenResolver: AuthTokenResolver | null = null;

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
      signOut?: (options?: { redirectUrl?: string }) => Promise<void>;
    };
  }
}

export function setAuthTokenResolver(resolver: AuthTokenResolver | null) {
  authTokenResolver = resolver;
}

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

// Refresh tokens are single-use: two calls racing on the same expired
// access token would otherwise both submit it, and the loser gets flagged
// as token reuse and logged out. Sharing one in-flight request avoids that.
let refreshInFlight: Promise<string | null> | null = null;

function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const session = getSession();
  if (!session) return Promise.resolve(null);

  refreshInFlight = (async () => {
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
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function authorizedFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const clerkToken = await getClerkToken();
  const preferClerkToken = path.startsWith("/api/admin");
  const session = getSession();

  if (!session && !clerkToken) {
    throw new ApiError(401, "Нэвтрэх шаардлагатай.", "UNAUTHORIZED");
  }

  const accessToken = preferClerkToken
    ? clerkToken ?? session?.accessToken
    : session?.accessToken ?? clerkToken;

  try {
    return await apiFetch<T>(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...init?.headers,
      },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401 || !session || preferClerkToken) throw err;

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

async function getClerkToken() {
  if (authTokenResolver) {
    const token = await authTokenResolver();
    if (token) return token;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkPublishableKey) {
    return null;
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const token = await window.Clerk?.session?.getToken();
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return null;
}

// --- Auth --------------------------------------------------------------------

export interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string;
  imageUrl: string | null;
  role: "FARMER" | "ADMIN" | "DEALER";
}

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  requiresProfileSetup: boolean;
}

export async function sendOtp(phoneNumber: string, mode?: "seller" | "dealer") {
  const result = await apiFetch<{ phoneNumber: string; code?: string }>(
    "/api/auth/send-otp",
    { method: "POST", body: JSON.stringify({ phoneNumber, ...(mode ? { mode } : {}) }) },
  );

  if (result.code) {
    // Only present when the backend has EXPOSE_OTP=true (local/dev testing).
    console.log(`[dev] OTP code for ${phoneNumber}: ${result.code}`);
  }

  return result;
}

export function verifyOtp(phoneNumber: string, code: string, mode?: "seller" | "dealer") {
  return apiFetch<VerifyOtpResult>("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, code, ...(mode ? { mode } : {}) }),
  });
}

export function getMe() {
  return authorizedFetch<AuthUser>("/api/auth/me");
}

export async function logout() {
  try {
    return await authorizedFetch<{ loggedOut: boolean }>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });
  } finally {
    clearSession();
  }
}

export function updateProfile(input: { name?: string; imageUrl?: string | null }) {
  return authorizedFetch<AuthUser>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(input),
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
  /** True when this EPC is registered to a livestock owned by a different user. */
  foreignOwner: boolean;
}

/** Recent scans across all readers, including ones whose tag isn't one of mine. */
export function listScans() {
  return authorizedFetch<RecentScan[]>("/api/scans");
}

export interface ArrivedTag {
  epc: string;
  scannedAt: string;
  /** True when this EPC is registered to a livestock owned by a different user. */
  foreignOwner: boolean;
}

/**
 * All of my currently-unclaimed tag sightings (one row per EPC). Unlike
 * listScans(), this isn't capped to the most recent N raw scan events, so
 * the "Ирсэн" counts stay accurate even once a reader has picked up more
 * distinct unclaimed tags than the recent-activity feed can hold.
 */
export function getArrivedTags() {
  return authorizedFetch<ArrivedTag[]>("/api/reports/arrived");
}

export interface ScanInput {
  epc: string;
  direction?: "ENTER" | "EXIT" | "UNKNOWN";
  readerId?: string;
  rssi?: number;
  antennaId?: string;
}

export interface IngestScansResult {
  accepted: number;
  inserted: number;
  duplicates: number;
  known: number;
  unknown: number;
  unknownEpcs: string[];
  scans: Array<{
    epc: string;
    matched: boolean;
    duplicate: boolean;
    scanId: string;
    livestock: { id: string; earNumber: string; name?: string } | null;
  }>;
}

/** Submits scans read by a Bluetooth-paired handheld reader under the logged-in user. */
export function ingestScans(scans: ScanInput[]) {
  return authorizedFetch<IngestScansResult>("/api/scans", {
    method: "POST",
    body: JSON.stringify({ scans }),
  });
}

// --- Dashboard / reports -------------------------------------------------------

export interface DashboardScan {
  id: string;
  scannedAt: string;
  direction: "ENTER" | "EXIT" | "UNKNOWN";
  epc: string;
  livestock: { id: string; earNumber: string; name?: string } | null;
}

export interface Dashboard {
  totalLivestock: number;
  scannedToday: number;
  missingCount: number;
  unknownTagCount: number;
  sheepCount: number;
  goatCount: number;
  readerCount: number;
  activeReaderCount: number;
  today: {
    date: string;
    totalScans: number;
    scannedLivestock: number;
    unscannedLivestock: number;
    entered: number;
    exited: number;
    unknown: number;
    unknownEpcs: string[];
    lastScan: {
      id: string;
      epc: string;
      livestockId: string | null;
      readerId: string | null;
      direction: "ENTER" | "EXIT" | "UNKNOWN";
      source: "APP" | "DEVICE";
      scannedAt: string;
    } | null;
  };
  readers: Array<{
    id: string;
    name: string;
    location?: string;
    deviceSecretSet: boolean;
    lastScanAt?: string;
    lastDirection?: "ENTER" | "EXIT" | "UNKNOWN";
    lastEpc?: string;
    isActiveToday: boolean;
  }>;
  recentScans: DashboardScan[];
}

export function getDashboard() {
  return authorizedFetch<Dashboard>("/api/dashboard");
}

export interface AdminStatistics {
  totalUsers: number;
  totalLivestock: number;
  scannedToday: number;
  missingCount: number;
  unknownTagCount: number;
  readerCount?: number;
  damagedTagCount?: number;
  missingLivestock: Array<{
    id: string;
    earNumber: string;
    name?: string | null;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    createdAt: string;
  }>;
}

export function getAdminStatistics() {
  return authorizedFetch<AdminStatistics>("/api/admin/statistics");
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  phoneNumber: string;
  name: string;
  imageUrl: string | null;
  role: "FARMER" | "ADMIN" | "DEALER";
  aimag?: string;
  sum?: string;
  dealerId?: string;
  status: "ACTIVE" | "SUSPENDED";
  livestockCount: number;
  readerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDealer extends AdminUser {
  farmerCount: number;
  managedLivestockCount: number;
}

export interface AdminLivestock extends Livestock {
  owner: {
    id: string;
    name: string;
    phoneNumber: string;
    aimag?: string;
    sum?: string;
    status: "ACTIVE" | "SUSPENDED";
  } | null;
  lastScan: {
    scannedAt: string;
    direction: "ENTER" | "EXIT" | "UNKNOWN";
    readerId: string | null;
    readerName?: string;
    readerLocation?: string;
    rssi?: number;
    antennaId?: string;
  } | null;
}

export interface AdminDevice {
  id: string;
  name: string;
  location?: string;
  deviceSecretSet: boolean;
  owner: {
    id: string;
    name: string;
    phoneNumber: string;
    aimag?: string;
    sum?: string;
  } | null;
  status: "ONLINE" | "WARNING" | "OFFLINE";
  lastScanAt?: string;
  lastDirection?: "ENTER" | "EXIT" | "UNKNOWN";
  lastEpc?: string;
  rssi?: number;
  antennaId?: string;
  scanCount: number;
  offlineQueue: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTagPrefix {
  value: string;
  name: string;
  label: string;
  color: string;
}

export interface AdminActivity {
  id: string;
  type: "SCAN" | "USER";
  title: string;
  description: string;
  actor?: string;
  createdAt: string;
}

function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

export function listAdminUsers(params: {
  search?: string;
  role?: AuthUser["role"];
  status?: "ACTIVE" | "SUSPENDED";
  aimag?: string;
  page?: number;
  limit?: number;
} = {}) {
  return authorizedFetch<PaginatedResult<AdminUser>>(
    `/api/admin/users?${queryString(params)}`,
  );
}

export function createAdminUser(input: { email: string; name?: string }) {
  return authorizedFetch<AdminUser>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createAdminDealer(input: {
  phoneNumber: string;
  name: string;
  aimag?: string;
  sum?: string;
}) {
  return authorizedFetch<AdminDealer>("/api/admin/dealers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listAdminDealers(params: {
  search?: string;
  status?: "ACTIVE" | "SUSPENDED";
  page?: number;
  limit?: number;
} = {}) {
  return authorizedFetch<PaginatedResult<AdminDealer>>(
    `/api/admin/dealers?${queryString(params)}`,
  );
}

export function getAdminDealer(id: string) {
  return authorizedFetch<AdminDealer>(`/api/admin/dealers/${id}`);
}

export function updateAdminDealer(
  id: string,
  input: { phoneNumber?: string; name?: string; aimag?: string | null; sum?: string | null },
) {
  return authorizedFetch<AdminDealer>(`/api/admin/dealers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function listAdminDealerFarmers(
  id: string,
  params: { search?: string; aimag?: string; page?: number; limit?: number } = {},
) {
  const query = queryString({
    search: params.search,
    aimag: params.aimag,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });

  return authorizedFetch<FarmerListResult>(`/api/admin/dealers/${id}/farmers?${query}`);
}

export function listAdminLivestock(params: {
  search?: string;
  status?: LivestockStatus;
  species?: Species;
  aimag?: string;
  page?: number;
  limit?: number;
} = {}) {
  return authorizedFetch<PaginatedResult<AdminLivestock>>(
    `/api/admin/livestock?${queryString(params)}`,
  );
}

export function listAdminDevices(params: {
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  return authorizedFetch<PaginatedResult<AdminDevice>>(
    `/api/admin/devices?${queryString(params)}`,
  );
}

export function getAdminTagSettings() {
  return authorizedFetch<{ prefixes: AdminTagPrefix[] }>("/api/admin/tag-settings");
}

export function listAdminActivity() {
  return authorizedFetch<AdminActivity[]>("/api/admin/activity");
}

export function updateAdminUserStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
  return authorizedFetch<AdminUser>(`/api/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateAdminUserRole(id: string, role: AuthUser["role"]) {
  return authorizedFetch<AdminUser>(`/api/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function importAdminTags(tags: Array<{ epc: string; status?: TagStatus; claimedByUserId?: string }>) {
  return authorizedFetch<{ imported: number }>("/api/admin/tags/import", {
    method: "POST",
    body: JSON.stringify({ tags }),
  });
}

export function updateAdminTagStatus(epc: string, status: TagStatus, claimedByUserId?: string) {
  return authorizedFetch<TagRegistryEntry>(
    `/api/admin/tags/${encodeURIComponent(epc)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, claimedByUserId }),
    },
  );
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

export function sendSearchSignal() {
  return authorizedFetch<{ missingCount: number; dealerNotified: boolean }>("/api/search-signal", {
    method: "POST",
    body: JSON.stringify({}),
  });
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

export function getFarmer(id: string) {
  return authorizedFetch<Farmer>(`/api/dealer/farmers/${id}`);
}

export function updateFarmer(
  id: string,
  input: {
    phoneNumber?: string;
    name?: string;
    aimag?: string | null;
    sum?: string | null;
    status?: "ACTIVE" | "SUSPENDED";
  },
) {
  return authorizedFetch<Farmer>(`/api/dealer/farmers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function removeFarmer(id: string) {
  return authorizedFetch<{ removed: boolean; id: string }>(`/api/dealer/farmers/${id}`, {
    method: "DELETE",
  });
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
