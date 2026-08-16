const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

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

export interface AuthUser {
  id: string;
  phoneNumber: string;
  name: string;
  role: "FARMER" | "ADMIN";
}

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  requiresProfileSetup: boolean;
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
