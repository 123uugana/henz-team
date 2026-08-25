/// <reference types="@cloudflare/workers-types" />

import { and, count, desc, eq, gte, inArray, isNotNull, isNull, like, lt, ne, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { z } from 'zod';
import {
  alerts,
  dealerRegistrations,
  devicePushTokens,
  livestock,
  livestockRemovals,
  otpCodes,
  refreshSessions,
  rfidReaders,
  rfidScans,
  rfidTagRegistry,
  rfidTags,
  rfidUnknownEpcs,
  users,
} from './db/schema';

type Env = {
  DB: D1Database;
  ACCESS_TOKEN_SECRET?: string;
  OTP_CODE?: string;
  EXPOSE_OTP?: string;
  SMS_PROVIDER?: 'log' | 'infobip';
  INFOBIP_BASE_URL?: string;
  INFOBIP_API_KEY?: string;
  INFOBIP_SENDER?: string;
};

type AuthUser = {
  id: string;
  phoneNumber: string;
  name: string;
  imageUrl: string | null;
  role: 'FARMER' | 'ADMIN' | 'DEALER';
  sessionId: string | null;
};

type TokenPayload = {
  sub: string;
  sid?: string;
  exp?: number;
};

const OTP_RESEND_COOLDOWN_MS = 60_000;
const OTP_MAX_ATTEMPTS = 5;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const RECENT_SCANS_LIMIT = 50;
const DUPLICATE_SCAN_WINDOW_MS = 30_000;

const jsonHeaders = {
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const sendOtpSchema = z.object({
  phoneNumber: z.string().regex(/^\d{8}$/),
});

const verifyOtpSchema = sendOtpSchema.extend({
  code: z.string().regex(/^\d{6}$/),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Нэр хамгийн багадаа 2 тэмдэгт байна.').optional(),
    imageUrl: z
      .string()
      .refine(
        (value) => value.startsWith('data:image/') || /^https?:\/\//i.test(value),
        'Зургийн холбоос буруу байна.',
      )
      .nullable()
      .optional(),
  })
  .refine((input) => input.name !== undefined || input.imageUrl !== undefined);

const updateLivestockStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'MISSING', 'INACTIVE']),
});

const livestockInputSchema = z.object({
  earNumber: z.string().trim().min(1),
  name: z.string().trim().optional(),
  species: z.enum(['SHEEP', 'GOAT']),
  gender: z.enum(['MALE', 'FEMALE', 'UNKNOWN']),
  birthYear: z.number().int().optional(),
  color: z.string().trim().optional(),
  markDescription: z.string().trim().optional(),
  rfidEpc: z.string().trim().optional(),
  imageUrl: z.string().nullable().optional(),
});

const pushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']),
});

const registerReaderSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  location: z.string().trim().optional(),
  deviceSecret: z.string().min(8).optional(),
});

const scanInputSchema = z.object({
  epc: z.string().trim().min(1),
  direction: z.enum(['ENTER', 'EXIT', 'UNKNOWN']).optional(),
  readerId: z.string().trim().optional(),
  scannedAt: z.string().trim().optional(),
});

const ingestScansSchema = z.object({
  scans: z.array(scanInputSchema).min(1),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const claimTagSchema = z.object({
  epc: z.string().trim().min(1),
});

const dealerRegistrationInputSchema = z.object({
  orgName: z.string().trim().min(1),
  contact: z.string().trim().min(1),
  prefixRequested: z.string().trim().min(1),
});

const decideDealerRegistrationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

const addFarmerSchema = z.object({
  phoneNumber: z.string().regex(/^\d{8}$/),
  name: z.string().trim().min(2, 'Нэр хамгийн багадаа 2 тэмдэгт байна.'),
  aimag: z.string().trim().optional(),
  sum: z.string().trim().optional(),
});

const HISTORY_RANGES = ['7d', '1m', '3m', '6m', '1y'] as const;
const HISTORY_RANGE_DAYS: Record<(typeof HISTORY_RANGES)[number], number> = {
  '7d': 7,
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

const deviceIngestScansSchema = z.object({
  readerId: z.string().trim().min(1),
  secret: z.string().min(1),
  scans: z.array(scanInputSchema.omit({ readerId: true })).min(1),
});

class ApiFailure extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

function now() {
  return new Date().toISOString();
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function createOtpCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return value.toString().padStart(6, '0');
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function apiResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify({ success: true, data }), {
    ...init,
    headers: jsonHeaders,
  });
}

function apiError(error: unknown) {
  if (error instanceof ApiFailure) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
        code: error.code,
      }),
      { status: error.status, headers: jsonHeaders },
    );
  }

  console.error(error);
  return new Response(
    JSON.stringify({
      success: false,
      message: 'Сервертэй холбогдож чадсангүй.',
      code: 'INTERNAL_ERROR',
    }),
    { status: 500, headers: jsonHeaders },
  );
}

async function parseJson<T>(request: Request, schema: z.ZodType<T>) {
  const payload = await request.json().catch(() => undefined);
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ApiFailure(400, 'Илгээсэн өгөгдөл буруу байна.', 'BAD_REQUEST');
  }

  return result.data;
}

function base64UrlFromBytes(bytes: Uint8Array) {
  return base64FromBytes(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function base64FromBytes(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64UrlFromString(value: string) {
  return base64UrlFromBytes(new TextEncoder().encode(value));
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );
  return base64UrlFromBytes(new Uint8Array(signature));
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return base64UrlFromBytes(new Uint8Array(hash));
}

function accessTokenSecret(env: Env) {
  const secret = env.ACCESS_TOKEN_SECRET;

  if (!secret || secret === 'replace-this-secret-before-production' || secret.length < 32) {
    throw new ApiFailure(
      500,
      'ACCESS_TOKEN_SECRET тохируулаагүй байна.',
      'ACCESS_TOKEN_SECRET_NOT_CONFIGURED',
    );
  }

  return secret;
}

function smsProvider(env: Env) {
  if (env.SMS_PROVIDER === 'log' || env.SMS_PROVIDER === 'infobip') {
    return env.SMS_PROVIDER;
  }

  throw new ApiFailure(
    500,
    'SMS тохиргоо дутуу байна.',
    'SMS_PROVIDER_NOT_CONFIGURED',
  );
}

async function sendInfobipSms(env: Env, to: string, body: string) {
  const apiKey = env.INFOBIP_API_KEY;
  const baseUrl = env.INFOBIP_BASE_URL;

  if (!apiKey || !baseUrl) {
    throw new ApiFailure(
      500,
      'SMS тохиргоо дутуу байна.',
      'SMS_PROVIDER_NOT_CONFIGURED',
    );
  }

  const response = await fetch(`https://${baseUrl}/sms/2/text/advanced`, {
    method: 'POST',
    headers: {
      Authorization: `App ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          from: env.INFOBIP_SENDER ?? 'HentsHurga',
          destinations: [{ to }],
          text: body,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('Infobip SMS failed', response.status, details);
    throw new ApiFailure(502, 'SMS илгээж чадсангүй.', 'SMS_SEND_FAILED');
  }
}

async function sendOtpSms(env: Env, phoneNumber: string, code: string) {
  const body = `Хэнц Хурга баталгаажуулах код: ${code}. Код 10 минут хүчинтэй.`;

  if (smsProvider(env) === 'infobip') {
    await sendInfobipSms(env, `976${phoneNumber}`, body);
    return;
  }

  console.info(`OTP code for +976${phoneNumber}: ${code}`);
}

async function createAccessToken(env: Env, userId: string, sessionId: string) {
  const header = base64UrlFromString(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlFromString(
    JSON.stringify({
      sub: userId,
      sid: sessionId,
    }),
  );
  const signature = await hmac(accessTokenSecret(env), `${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

async function verifyAccessToken(env: Env, token: string): Promise<TokenPayload> {
  const [header, payload, signature] = token.split('.');

  if (!header || !payload || !signature) {
    throw new ApiFailure(401, 'Нэвтрэх эрх буруу байна.', 'INVALID_TOKEN');
  }

  const expectedSignature = await hmac(accessTokenSecret(env), `${header}.${payload}`);

  if (signature !== expectedSignature) {
    throw new ApiFailure(401, 'Нэвтрэх эрх буруу байна.', 'INVALID_TOKEN');
  }

  const tokenPayload = JSON.parse(decodeBase64Url(payload)) as TokenPayload;

  // Keep accepting older tokens until their original expiry so existing
  // clients can use the refresh flow once and receive a non-expiring session.
  if (tokenPayload.exp !== undefined && tokenPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new ApiFailure(401, 'Нэвтрэх эрхийн хугацаа дууссан байна.', 'TOKEN_EXPIRED');
  }

  return tokenPayload;
}

async function createSession(db: ReturnType<typeof drizzle>, env: Env, userId: string) {
  const sessionId = createId('session');
  const refreshToken = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const accessToken = await createAccessToken(env, userId, sessionId);
  const refreshTokenHash = await sha256(refreshToken);
  const createdAt = now();

  await db.insert(refreshSessions).values({
    id: sessionId,
    userId,
    refreshTokenHash,
    expiresAt: '9999-12-31T23:59:59.999Z',
    createdAt,
  });

  return {
    accessToken,
    refreshToken,
  };
}

async function getAuthUser(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const authorization = request.headers.get('Authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;

  if (!token) {
    throw new ApiFailure(401, 'Нэвтрэх шаардлагатай.', 'UNAUTHORIZED');
  }

  const payload = await verifyAccessToken(env, token);

  if (payload.sid) {
    const activeSession = await db
      .select({ id: refreshSessions.id })
      .from(refreshSessions)
      .where(
        and(
          eq(refreshSessions.id, payload.sid),
          eq(refreshSessions.userId, payload.sub),
          isNull(refreshSessions.revokedAt),
        ),
      )
      .get();

    if (!activeSession) {
      throw new ApiFailure(401, 'Нэвтрэх эрх хүчингүй болсон байна.', 'SESSION_REVOKED');
    }
  }

  const user = await db.select().from(users).where(eq(users.id, payload.sub)).get();

  if (!user) {
    throw new ApiFailure(401, 'Нэвтрэх эрх буруу байна.', 'INVALID_TOKEN');
  }

  return { ...user, sessionId: payload.sid ?? null } as AuthUser;
}

function cleanOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeEpc(epc: string) {
  return epc.trim().toUpperCase();
}

function normalizeReaderId(readerId?: string | null) {
  return cleanOptionalText(readerId) ?? null;
}

function scanTimestamp(value: string | undefined, fallback: number) {
  if (!value) {
    return new Date(fallback).toISOString();
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    throw new ApiFailure(400, 'Scan timestamp буруу байна.', 'BAD_SCAN_TIMESTAMP');
  }

  return timestamp.toISOString();
}

function livestockResponse(
  row: typeof livestock.$inferSelect,
  tag?: typeof rfidTags.$inferSelect | null,
  lastScan?: typeof rfidScans.$inferSelect | null,
) {
  return {
    id: row.id,
    earNumber: row.earNumber,
    name: row.name ?? undefined,
    species: row.species,
    gender: row.gender,
    birthYear: row.birthYear ?? undefined,
    color: row.color ?? undefined,
    markDescription: row.markDescription ?? undefined,
    imageUrl: row.imageUrl,
    status: row.status,
    location:
      row.latitude != null && row.longitude != null
        ? {
            latitude: row.latitude,
            longitude: row.longitude,
            updatedAt: row.locationUpdatedAt,
          }
        : null,
    rfidTag: tag
      ? {
          id: tag.id,
          epc: tag.epc,
        }
      : null,
    lastScan: lastScan
      ? {
          scannedAt: lastScan.scannedAt,
        }
      : null,
  };
}

async function mapLivestock(db: ReturnType<typeof drizzle>, row: typeof livestock.$inferSelect) {
  const tag = await db
    .select()
    .from(rfidTags)
    .where(eq(rfidTags.livestockId, row.id))
    .get();
  const lastScan = await db
    .select()
    .from(rfidScans)
    .where(eq(rfidScans.livestockId, row.id))
    .orderBy(desc(rfidScans.scannedAt))
    .limit(1)
    .get();

  return livestockResponse(row, tag, lastScan);
}

async function mapLivestockList(
  db: ReturnType<typeof drizzle>,
  rows: (typeof livestock.$inferSelect)[],
) {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const [tags, scans] = await Promise.all([
    db.select().from(rfidTags).where(inArray(rfidTags.livestockId, ids)).all(),
    db
      .select()
      .from(rfidScans)
      .where(inArray(rfidScans.livestockId, ids))
      .orderBy(desc(rfidScans.scannedAt))
      .all(),
  ]);

  const tagByLivestockId = new Map(tags.map((tag) => [tag.livestockId, tag]));
  const lastScanByLivestockId = new Map<string, (typeof scans)[number]>();

  for (const scan of scans) {
    if (scan.livestockId && !lastScanByLivestockId.has(scan.livestockId)) {
      lastScanByLivestockId.set(scan.livestockId, scan);
    }
  }

  return rows.map((row) =>
    livestockResponse(
      row,
      tagByLivestockId.get(row.id),
      lastScanByLivestockId.get(row.id),
    ),
  );
}

async function ensureUniqueEarNumber(
  db: ReturnType<typeof drizzle>,
  userId: string,
  earNumber: string,
  excludeLivestockId?: string,
) {
  const existing = await db
    .select()
    .from(livestock)
    .where(
      and(
        eq(livestock.userId, userId),
        eq(livestock.earNumber, earNumber),
        ...(excludeLivestockId ? [ne(livestock.id, excludeLivestockId)] : []),
      ),
    )
    .get();

  if (existing) {
    throw new ApiFailure(409, 'Энэ дугаартай мал бүртгэгдсэн байна.', 'DUPLICATE_EAR_NUMBER');
  }
}

async function ensureUniqueEpc(
  db: ReturnType<typeof drizzle>,
  epc: string,
  excludeLivestockId?: string,
) {
  const existing = await db
    .select()
    .from(rfidTags)
    .where(
      and(
        sql`lower(${rfidTags.epc}) = ${epc.toLowerCase()}`,
        ...(excludeLivestockId ? [ne(rfidTags.livestockId, excludeLivestockId)] : []),
      ),
    )
    .get();

  if (existing) {
    throw new ApiFailure(409, 'Энэ RFID EPC бүртгэгдсэн байна.', 'DUPLICATE_EPC');
  }
}

async function upsertRfidTag(
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
  epc?: string | null,
) {
  await db.delete(rfidTags).where(eq(rfidTags.livestockId, livestockId));

  if (!epc) {
    return;
  }

  const timestamp = now();
  await db.insert(rfidTags).values({
    id: createId('tag'),
    userId,
    livestockId,
    epc,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function releaseRegistryTag(
  db: ReturnType<typeof drizzle>,
  userId: string,
  epc: string,
) {
  const registryTag = await findRegistryTag(db, epc);
  if (registryTag?.claimedByUserId !== userId) return;

  await db
    .update(rfidTagRegistry)
    .set({ status: 'AVAILABLE', claimedByUserId: null, claimedAt: null, updatedAt: now() })
    .where(eq(rfidTagRegistry.epc, registryTag.epc));
}

async function sendAlertPush(
  env: Env,
  db: ReturnType<typeof drizzle>,
  userId: string,
  input: {
    title: string;
    message: string;
    livestockId?: string | null;
  },
) {
  const tokens = await db
    .select({ token: devicePushTokens.token })
    .from(devicePushTokens)
    .where(eq(devicePushTokens.userId, userId))
    .all();

  if (tokens.length === 0) {
    return;
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(
      tokens.map(({ token }) => ({
        to: token,
        title: input.title,
        body: input.message,
        sound: 'default',
        ...(input.livestockId ? { data: { livestockId: input.livestockId } } : {}),
      })),
    ),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('Expo push send failed', response.status, details);
  }
}

async function createAlert(
  db: ReturnType<typeof drizzle>,
  env: Env,
  ctx: ExecutionContext,
  userId: string,
  input: {
    type: 'MISSING' | 'FOUND' | 'SYSTEM';
    title: string;
    message: string;
    livestockId?: string | null;
  },
) {
  await db.insert(alerts).values({
    id: createId('alert'),
    userId,
    livestockId: input.livestockId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    isRead: false,
    createdAt: now(),
  });

  ctx.waitUntil(
    sendAlertPush(env, db, userId, {
      title: input.title,
      message: input.message,
      livestockId: input.livestockId,
    }),
  );
}

async function handleSendOtp(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const input = await parseJson(request, sendOtpSchema);
  const timestamp = now();

  const latestOtp = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phoneNumber, input.phoneNumber), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .get();

  if (latestOtp) {
    const elapsed = Date.now() - new Date(latestOtp.createdAt).getTime();

    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const seconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new ApiFailure(
        429,
        `Кодыг дахин илгээхийн тулд ${seconds} секунд хүлээнэ үү.`,
        'OTP_RESEND_TOO_SOON',
      );
    }

    await db
      .update(otpCodes)
      .set({ consumedAt: timestamp })
      .where(eq(otpCodes.phoneNumber, input.phoneNumber));
  }

  await db
    .delete(otpCodes)
    .where(
      and(
        eq(otpCodes.phoneNumber, input.phoneNumber),
        or(isNotNull(otpCodes.consumedAt), lt(otpCodes.expiresAt, timestamp)),
      ),
    );

  const code =
    env.SMS_PROVIDER === 'log' && env.OTP_CODE ? env.OTP_CODE : createOtpCode();

  await db.insert(otpCodes).values({
    id: createId('otp'),
    phoneNumber: input.phoneNumber,
    code,
    expiresAt: minutesFromNow(10),
    attemptCount: 0,
    createdAt: timestamp,
  });

  await sendOtpSms(env, input.phoneNumber, code);

  return apiResponse({
    phoneNumber: input.phoneNumber,
    ...(env.EXPOSE_OTP === 'true' ? { code } : {}),
  });
}

async function handleVerifyOtp(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const input = await parseJson(request, verifyOtpSchema);
  const otp = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phoneNumber, input.phoneNumber), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .get();

  if (!otp || otp.expiresAt < now()) {
    throw new ApiFailure(400, 'Баталгаажуулах код буруу эсвэл хугацаа дууссан байна.');
  }

  if (otp.attemptCount >= OTP_MAX_ATTEMPTS) {
    await db.update(otpCodes).set({ consumedAt: now() }).where(eq(otpCodes.id, otp.id));
    throw new ApiFailure(
      429,
      'Оролдлогын хязгаар давсан тул код хүчингүй боллоо. Дахин код авах шаардлагатай.',
      'OTP_TOO_MANY_ATTEMPTS',
    );
  }

  if (otp.code !== input.code) {
    const attempts = otp.attemptCount + 1;

    if (attempts >= OTP_MAX_ATTEMPTS) {
      await db
        .update(otpCodes)
        .set({ attemptCount: attempts, consumedAt: now() })
        .where(eq(otpCodes.id, otp.id));
      throw new ApiFailure(
        429,
        'Оролдлогын хязгаар давсан тул код хүчингүй боллоо. Дахин код авах шаардлагатай.',
        'OTP_TOO_MANY_ATTEMPTS',
      );
    }

    await db.update(otpCodes).set({ attemptCount: attempts }).where(eq(otpCodes.id, otp.id));
    throw new ApiFailure(400, 'Баталгаажуулах код буруу байна.');
  }

  await db.update(otpCodes).set({ consumedAt: now() }).where(eq(otpCodes.id, otp.id));

  let user = await db
    .select()
    .from(users)
    .where(eq(users.phoneNumber, input.phoneNumber))
    .get();

  if (!user) {
    const timestamp = now();
    user = {
      id: createId('user'),
      phoneNumber: input.phoneNumber,
      name: '',
      imageUrl: null,
      role: 'FARMER' as const,
      aimag: null,
      sum: null,
      dealerId: null,
      status: 'ACTIVE' as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.insert(users).values(user);
  }

  const tokens = await createSession(db, env, user.id);

  return apiResponse({
    ...tokens,
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      imageUrl: user.imageUrl,
      role: user.role,
    },
    requiresProfileSetup: user.name.trim().length === 0,
  });
}

async function handleRefresh(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const input = await parseJson(request, refreshSchema);
  const refreshTokenHash = await sha256(input.refreshToken);
  const session = await db
    .select()
    .from(refreshSessions)
    .where(
      and(
        eq(refreshSessions.refreshTokenHash, refreshTokenHash),
        isNull(refreshSessions.revokedAt),
      ),
    )
    .get();

  if (!session) {
    const existing = await db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.refreshTokenHash, refreshTokenHash))
      .get();

    if (existing) {
      await db
        .update(refreshSessions)
        .set({ revokedAt: now() })
        .where(eq(refreshSessions.userId, existing.userId));
    }

    throw new ApiFailure(401, 'Refresh token expired.', 'REFRESH_TOKEN_EXPIRED');
  }

  if (session.expiresAt < now()) {
    await db
      .update(refreshSessions)
      .set({ revokedAt: now() })
      .where(eq(refreshSessions.id, session.id));

    throw new ApiFailure(401, 'Refresh token expired.', 'REFRESH_TOKEN_EXPIRED');
  }

  const user = await db.select().from(users).where(eq(users.id, session.userId)).get();

  if (!user) {
    throw new ApiFailure(401, 'Refresh token expired.', 'REFRESH_TOKEN_EXPIRED');
  }

  await db
    .update(refreshSessions)
    .set({ revokedAt: now() })
    .where(eq(refreshSessions.id, session.id));

  await db.delete(refreshSessions).where(lt(refreshSessions.expiresAt, now()));

  return apiResponse(await createSession(db, env, user.id));
}

async function handleLogout(db: ReturnType<typeof drizzle>, user: AuthUser) {
  const timestamp = now();

  if (user.sessionId) {
    await db
      .update(refreshSessions)
      .set({ revokedAt: timestamp })
      .where(and(eq(refreshSessions.id, user.sessionId), eq(refreshSessions.userId, user.id)));
  } else {
    // Older access tokens did not carry a session id, so revoke every refresh
    // session belonging to that user when they explicitly sign out.
    await db
      .update(refreshSessions)
      .set({ revokedAt: timestamp })
      .where(eq(refreshSessions.userId, user.id));
  }

  return apiResponse({ loggedOut: true });
}

async function handleGetMe(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const user = await getAuthUser(request, db, env);
  return apiResponse({
    id: user.id,
    phoneNumber: user.phoneNumber,
    name: user.name,
    imageUrl: user.imageUrl,
    role: user.role,
  });
}

async function handleUpdateMe(request: Request, db: ReturnType<typeof drizzle>, env: Env) {
  const user = await getAuthUser(request, db, env);
  const input = await parseJson(request, updateProfileSchema);

  await db
    .update(users)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      updatedAt: now(),
    })
    .where(eq(users.id, user.id));

  return apiResponse({
    id: user.id,
    phoneNumber: user.phoneNumber,
    name: input.name?.trim() ?? user.name,
    imageUrl: input.imageUrl === undefined ? user.imageUrl : input.imageUrl,
    role: user.role,
  });
}

async function handleListLivestock(request: Request, db: ReturnType<typeof drizzle>, userId: string) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim();
  const statusParam = url.searchParams.get('status');
  const speciesParam = url.searchParams.get('species');
  const genderParam = url.searchParams.get('gender');
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit');
  const paginated = pageParam !== null || limitParam !== null;
  const page = Math.max(1, Number(pageParam) || 1);
  const limit = Math.min(100, Math.max(1, Number(limitParam) || 20));

  const filters = [eq(livestock.userId, userId)];

  if (search) {
    filters.push(
      or(
        like(livestock.earNumber, `%${search}%`),
        like(livestock.name, `%${search}%`),
        like(livestock.color, `%${search}%`),
        like(rfidTags.epc, `%${search}%`),
      )!,
    );
  }

  if (statusParam && ['ACTIVE', 'MISSING', 'INACTIVE'].includes(statusParam)) {
    filters.push(eq(livestock.status, statusParam as 'ACTIVE' | 'MISSING' | 'INACTIVE'));
  }

  if (speciesParam && ['SHEEP', 'GOAT'].includes(speciesParam)) {
    filters.push(eq(livestock.species, speciesParam as 'SHEEP' | 'GOAT'));
  }

  if (genderParam && ['MALE', 'FEMALE', 'UNKNOWN'].includes(genderParam)) {
    filters.push(eq(livestock.gender, genderParam as 'MALE' | 'FEMALE' | 'UNKNOWN'));
  }

  const conditions = and(...filters);

  const totalRow = await db
    .select({ value: count() })
    .from(livestock)
    .leftJoin(rfidTags, eq(rfidTags.livestockId, livestock.id))
    .where(conditions)
    .get();

  const rows = await db
    .select({ animal: livestock })
    .from(livestock)
    .leftJoin(rfidTags, eq(rfidTags.livestockId, livestock.id))
    .where(conditions)
    .orderBy(livestock.earNumber)
    .limit(paginated ? limit : 500)
    .offset(paginated ? (page - 1) * limit : 0)
    .all();

  const uniqueRows = [...new Map(rows.map((row) => [row.animal.id, row.animal])).values()];
  const data = await mapLivestockList(db, uniqueRows);

  if (paginated) {
    return apiResponse({
      items: data,
      total: totalRow?.value ?? 0,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil((totalRow?.value ?? 0) / limit)),
    });
  }

  return apiResponse(data);
}

async function handleCreateLivestock(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
) {
  const input = await parseJson(request, livestockInputSchema);
  const timestamp = now();
  const livestockId = createId('livestock');
  const earNumber = input.earNumber.trim();
  const epc = cleanOptionalText(input.rfidEpc);
  const normalizedEpc = epc ? normalizeEpc(epc) : null;

  await ensureUniqueEarNumber(db, userId, earNumber);
  if (normalizedEpc) {
    await ensureTagClaimable(db, userId, normalizedEpc);
    await ensureUniqueEpc(db, normalizedEpc);
  }

  await db.insert(livestock).values({
    id: livestockId,
    userId,
    earNumber,
    name: cleanOptionalText(input.name),
    species: input.species,
    gender: input.gender,
    birthYear: input.birthYear ?? null,
    color: cleanOptionalText(input.color),
    markDescription: cleanOptionalText(input.markDescription),
    imageUrl: input.imageUrl ?? null,
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await upsertRfidTag(db, userId, livestockId, normalizedEpc);
  if (normalizedEpc) {
    await claimTagForUser(db, userId, normalizedEpc);
  }

  const created = await db.select().from(livestock).where(eq(livestock.id, livestockId)).get();
  return apiResponse(await mapLivestock(db, created!));
}

async function handleGetLivestock(
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
) {
  const row = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.id, livestockId), eq(livestock.userId, userId)))
    .get();

  if (!row) {
    throw new ApiFailure(404, 'Малын мэдээлэл олдсонгүй.', 'NOT_FOUND');
  }

  return apiResponse(await mapLivestock(db, row));
}

async function handleUpdateLivestock(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
) {
  const input = await parseJson(request, livestockInputSchema);
  const existing = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.id, livestockId), eq(livestock.userId, userId)))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Малын мэдээлэл олдсонгүй.', 'NOT_FOUND');
  }

  const existingTag = await db
    .select()
    .from(rfidTags)
    .where(eq(rfidTags.livestockId, livestockId))
    .get();

  const earNumber = input.earNumber.trim();
  const epc = cleanOptionalText(input.rfidEpc);
  const normalizedEpc = epc ? normalizeEpc(epc) : null;

  await ensureUniqueEarNumber(db, userId, earNumber, livestockId);
  if (normalizedEpc) {
    await ensureTagClaimable(db, userId, normalizedEpc);
    await ensureUniqueEpc(db, normalizedEpc, livestockId);
  }

  await db
    .update(livestock)
    .set({
      earNumber,
      name: cleanOptionalText(input.name),
      species: input.species,
      gender: input.gender,
      birthYear: input.birthYear ?? null,
      color: cleanOptionalText(input.color),
      markDescription: cleanOptionalText(input.markDescription),
      imageUrl: input.imageUrl ?? null,
      updatedAt: now(),
    })
    .where(eq(livestock.id, livestockId));
  await upsertRfidTag(db, userId, livestockId, normalizedEpc);
  if (existingTag && existingTag.epc !== normalizedEpc) {
    await releaseRegistryTag(db, userId, existingTag.epc);
  }
  if (normalizedEpc) {
    await claimTagForUser(db, userId, normalizedEpc);
  }

  const updated = await db.select().from(livestock).where(eq(livestock.id, livestockId)).get();
  return apiResponse(await mapLivestock(db, updated!));
}

async function handleUpdateLivestockStatus(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
  env: Env,
  ctx: ExecutionContext,
) {
  const input = await parseJson(request, updateLivestockStatusSchema);
  const existing = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.id, livestockId), eq(livestock.userId, userId)))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Малын мэдээлэл олдсонгүй.', 'NOT_FOUND');
  }

  if (existing.status !== input.status) {
    await db
      .update(livestock)
      .set({ status: input.status, updatedAt: now() })
      .where(eq(livestock.id, livestockId));

    if (input.status === 'MISSING') {
      await createAlert(db, env, ctx, userId, {
        type: 'MISSING',
        title: 'Мал дутуу',
        message: `${existing.earNumber} дугаартай мал дутуу болсон.`,
        livestockId: existing.id,
      });
    } else if (existing.status === 'MISSING' && input.status === 'ACTIVE') {
      await createAlert(db, env, ctx, userId, {
        type: 'FOUND',
        title: 'Мал олдлоо',
        message: `${existing.earNumber} дугаартай мал олдсон.`,
        livestockId: existing.id,
      });
    }
  }

  const updated = await db.select().from(livestock).where(eq(livestock.id, livestockId)).get();
  return apiResponse(await mapLivestock(db, updated!));
}

async function handleUpdateLivestockLocation(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
) {
  const input = await parseJson(request, updateLocationSchema);
  const existing = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.id, livestockId), eq(livestock.userId, userId)))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Малын мэдээлэл олдсонгүй.', 'NOT_FOUND');
  }

  const timestamp = now();
  await db
    .update(livestock)
    .set({
      latitude: input.latitude,
      longitude: input.longitude,
      locationUpdatedAt: timestamp,
      updatedAt: timestamp,
    })
    .where(eq(livestock.id, livestockId));

  const updated = await db.select().from(livestock).where(eq(livestock.id, livestockId)).get();
  return apiResponse(await mapLivestock(db, updated!));
}

async function handleDeleteLivestock(
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
) {
  const existing = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.id, livestockId), eq(livestock.userId, userId)))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Малын мэдээлэл олдсонгүй.', 'NOT_FOUND');
  }

  const tag = await db
    .select()
    .from(rfidTags)
    .where(eq(rfidTags.livestockId, livestockId))
    .get();

  await db.insert(livestockRemovals).values({
    id: createId('removal'),
    userId,
    livestockId,
    livestockCreatedAt: existing.createdAt,
    removedAt: now(),
  });

  await db.delete(rfidTags).where(eq(rfidTags.livestockId, livestockId));
  await db.update(rfidScans).set({ livestockId: null }).where(eq(rfidScans.livestockId, livestockId));
  await db.update(alerts).set({ livestockId: null }).where(eq(alerts.livestockId, livestockId));
  await db.delete(livestock).where(eq(livestock.id, livestockId));

  if (tag) await releaseRegistryTag(db, userId, tag.epc);

  return apiResponse({ id: livestockId, deleted: true });
}

async function handleLivestockScans(
  db: ReturnType<typeof drizzle>,
  userId: string,
  livestockId: string,
) {
  const animal = await db
    .select({ id: livestock.id })
    .from(livestock)
    .where(and(eq(livestock.id, livestockId), eq(livestock.userId, userId)))
    .get();

  if (!animal) {
    throw new ApiFailure(404, 'Малын мэдээлэл олдсонгүй.', 'NOT_FOUND');
  }

  const rows = await db
    .select({
      id: rfidScans.id,
      epc: rfidScans.epc,
      direction: rfidScans.direction,
      scannedAt: rfidScans.scannedAt,
      readerId: rfidReaders.id,
      readerName: rfidReaders.name,
    })
    .from(rfidScans)
    .leftJoin(rfidReaders, eq(rfidReaders.id, rfidScans.readerId))
    .where(and(eq(rfidScans.userId, userId), eq(rfidScans.livestockId, livestockId)))
    .orderBy(desc(rfidScans.scannedAt))
    .all();

  return apiResponse(
    rows.map((scan) => ({
      id: scan.id,
      epc: scan.epc,
      direction: scan.direction,
      scannedAt: scan.scannedAt,
      reader:
        scan.readerId && scan.readerName
          ? { id: scan.readerId, name: scan.readerName }
          : null,
    })),
  );
}

async function handleRegisterReader(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
) {
  const input = await parseJson(request, registerReaderSchema);
  const timestamp = now();
  const readerId = input.id.trim();
  const readerName = input.name.trim();
  const location = cleanOptionalText(input.location);
  const deviceSecretHash = input.deviceSecret ? await sha256(input.deviceSecret) : undefined;

  const existing = await db.select().from(rfidReaders).where(eq(rfidReaders.id, readerId)).get();

  if (existing && existing.userId !== userId) {
    throw new ApiFailure(409, 'Энэ уншигч бүртгэгдсэн байна.', 'READER_ALREADY_REGISTERED');
  }

  if (existing) {
    await db
      .update(rfidReaders)
      .set({
        name: readerName,
        location,
        ...(deviceSecretHash ? { deviceSecretHash } : {}),
        updatedAt: timestamp,
      })
      .where(eq(rfidReaders.id, readerId));
  } else {
    await db.insert(rfidReaders).values({
      id: readerId,
      userId,
      name: readerName,
      location,
      deviceSecretHash: deviceSecretHash ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return apiResponse({
    id: readerId,
    name: readerName,
    ...(location ? { location } : {}),
    ...(deviceSecretHash ? { deviceSecretSet: true } : {}),
  });
}

async function findRecentDuplicateScan(
  db: ReturnType<typeof drizzle>,
  userId: string,
  readerId: string | null,
  epc: string,
  scannedAt: string,
) {
  const cutoff = new Date(
    new Date(scannedAt).getTime() - DUPLICATE_SCAN_WINDOW_MS,
  ).toISOString();

  return db
    .select()
    .from(rfidScans)
    .where(
      and(
        eq(rfidScans.userId, userId),
        readerId ? eq(rfidScans.readerId, readerId) : isNull(rfidScans.readerId),
        sql`lower(${rfidScans.epc}) = ${epc.toLowerCase()}`,
        sql`${rfidScans.scannedAt} >= ${cutoff}`,
      ),
    )
    .orderBy(desc(rfidScans.scannedAt))
    .limit(1)
    .get();
}

async function trackUnknownEpc(
  db: ReturnType<typeof drizzle>,
  userId: string,
  epc: string,
  readerId: string | null,
  scannedAt: string,
) {
  const existing = await db
    .select()
    .from(rfidUnknownEpcs)
    .where(and(eq(rfidUnknownEpcs.userId, userId), eq(rfidUnknownEpcs.epc, epc)))
    .get();

  if (existing) {
    await db
      .update(rfidUnknownEpcs)
      .set({
        readerId,
        lastSeenAt: scannedAt,
        seenCount: existing.seenCount + 1,
      })
      .where(eq(rfidUnknownEpcs.id, existing.id));
    return;
  }

  await db.insert(rfidUnknownEpcs).values({
    id: createId('unknown_epc'),
    userId,
    epc,
    readerId,
    firstSeenAt: scannedAt,
    lastSeenAt: scannedAt,
    seenCount: 1,
  });
}

async function ingestScanBatch(
  db: ReturnType<typeof drizzle>,
  userId: string,
  scans: z.infer<typeof scanInputSchema>[],
  options?: {
    source?: 'APP' | 'DEVICE';
    readerId?: string;
  },
) {
  const normalizedScans = scans.map((scan) => ({
    ...scan,
    epc: normalizeEpc(scan.epc),
    readerId: normalizeReaderId(options?.readerId ?? scan.readerId),
  }));
  const lowerEpcs = [...new Set(normalizedScans.map((scan) => scan.epc.toLowerCase()))];

  const tags = await db
    .select()
    .from(rfidTags)
    .where(and(eq(rfidTags.userId, userId), inArray(sql`lower(${rfidTags.epc})`, lowerEpcs)))
    .all();

  const tagByLowerEpc = new Map(tags.map((tag) => [tag.epc.toLowerCase(), tag]));

  // Resolve reader ids referenced by this batch: auto-create ones seen for
  // the first time (readerId is a foreign key, so an unregistered id would
  // otherwise fail the insert), and drop the link — but keep the scan — for
  // a reader id already owned by a different user rather than reassigning it.
  const readerIds = [
    ...new Set(normalizedScans.map((scan) => scan.readerId).filter((id): id is string => !!id)),
  ];
  const resolvedReaderId = new Map<string, string | null>();

  if (readerIds.length > 0) {
    const existingReaders = await db
      .select()
      .from(rfidReaders)
      .where(inArray(rfidReaders.id, readerIds))
      .all();
    const existingById = new Map(existingReaders.map((reader) => [reader.id, reader]));
    const timestamp = now();

    for (const readerId of readerIds) {
      const existing = existingById.get(readerId);

      if (existing) {
        resolvedReaderId.set(readerId, existing.userId === userId ? readerId : null);
        continue;
      }

      await db.insert(rfidReaders).values({
        id: readerId,
        userId,
        name: readerId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      resolvedReaderId.set(readerId, readerId);
    }
  }

  const baseTime = Date.now();
  let known = 0;
  let unknown = 0;
  let inserted = 0;
  let duplicates = 0;
  const unknownEpcs: string[] = [];

  for (let i = 0; i < normalizedScans.length; i += 1) {
    const scan = normalizedScans[i];
    const tag = tagByLowerEpc.get(scan.epc.toLowerCase());
    const scannedAt = scanTimestamp(scan.scannedAt, baseTime + i);
    const duplicate = await findRecentDuplicateScan(
      db,
      userId,
      scan.readerId,
      scan.epc,
      scannedAt,
    );

    if (duplicate) {
      duplicates += 1;
      continue;
    }

    await db.insert(rfidScans).values({
      id: createId('scan'),
      userId,
      livestockId: tag?.livestockId ?? null,
      readerId: scan.readerId ? (resolvedReaderId.get(scan.readerId) ?? null) : null,
      epc: scan.epc,
      direction: scan.direction ?? 'UNKNOWN',
      source: options?.source ?? 'APP',
      duplicateOfScanId: null,
      scannedAt,
    });
    inserted += 1;

    if (tag) {
      known += 1;
    } else {
      unknown += 1;
      if (!unknownEpcs.includes(scan.epc)) {
        unknownEpcs.push(scan.epc);
      }
      await trackUnknownEpc(db, userId, scan.epc, scan.readerId, scannedAt);
    }
  }

  return apiResponse({
    accepted: scans.length,
    inserted,
    duplicates,
    known,
    unknown,
    unknownEpcs,
  });
}

async function handleIngestScans(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
) {
  const input = await parseJson(request, ingestScansSchema);
  return ingestScanBatch(db, userId, input.scans);
}

async function handleDeviceIngestScans(request: Request, db: ReturnType<typeof drizzle>) {
  const input = await parseJson(request, deviceIngestScansSchema);
  const readerId = input.readerId.trim();
  const reader = await db.select().from(rfidReaders).where(eq(rfidReaders.id, readerId)).get();

  if (!reader?.deviceSecretHash) {
    throw new ApiFailure(401, 'Төхөөрөмжийн эрх буруу байна.', 'INVALID_DEVICE_SECRET');
  }

  const secretHash = await sha256(input.secret);

  if (secretHash !== reader.deviceSecretHash) {
    throw new ApiFailure(401, 'Төхөөрөмжийн эрх буруу байна.', 'INVALID_DEVICE_SECRET');
  }

  return ingestScanBatch(db, reader.userId, input.scans, {
    source: 'DEVICE',
    readerId,
  });
}

async function handleListScans(db: ReturnType<typeof drizzle>, userId: string) {
  const rows = await db
    .select({
      id: rfidScans.id,
      epc: rfidScans.epc,
      direction: rfidScans.direction,
      scannedAt: rfidScans.scannedAt,
      readerId: rfidScans.readerId,
      livestockId: rfidScans.livestockId,
      earNumber: livestock.earNumber,
      name: livestock.name,
    })
    .from(rfidScans)
    .leftJoin(livestock, eq(livestock.id, rfidScans.livestockId))
    .where(eq(rfidScans.userId, userId))
    .orderBy(desc(rfidScans.scannedAt))
    .limit(RECENT_SCANS_LIMIT)
    .all();

  return apiResponse(
    rows.map((scan) => ({
      id: scan.id,
      epc: scan.epc,
      direction: scan.direction,
      scannedAt: scan.scannedAt,
      reader: scan.readerId ? { id: scan.readerId, name: 'RFID уншигч' } : null,
      livestock: scan.livestockId
        ? {
            id: scan.livestockId,
            earNumber: scan.earNumber,
            name: scan.name ?? undefined,
          }
        : null,
    })),
  );
}

async function handleListAlerts(db: ReturnType<typeof drizzle>, userId: string) {
  const rows = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      title: alerts.title,
      message: alerts.message,
      isRead: alerts.isRead,
      livestockId: alerts.livestockId,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .where(eq(alerts.userId, userId))
    .orderBy(desc(alerts.createdAt))
    .limit(50)
    .all();

  return apiResponse(rows);
}

async function handleReadAlert(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
  alertId: string,
) {
  const existing = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Мэдэгдэл олдсонгүй.', 'NOT_FOUND');
  }

  await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, alertId));
  return apiResponse({ id: alertId, isRead: true });
}

async function handleReadAllAlerts(db: ReturnType<typeof drizzle>, userId: string) {
  await db.update(alerts).set({ isRead: true }).where(eq(alerts.userId, userId));
  return apiResponse({ updated: true });
}

async function handleMissingLivestock(db: ReturnType<typeof drizzle>, userId: string) {
  const rows = await db
    .select()
    .from(livestock)
    .where(and(eq(livestock.userId, userId), eq(livestock.status, 'MISSING')))
    .orderBy(livestock.earNumber)
    .all();

  const data = await Promise.all(
    rows.map(async (row) => {
      const lastScan = await db
        .select()
        .from(rfidScans)
        .where(eq(rfidScans.livestockId, row.id))
        .orderBy(desc(rfidScans.scannedAt))
        .limit(1)
        .get();

      return {
        id: row.id,
        earNumber: row.earNumber,
        name: row.name ?? undefined,
        species: row.species,
        markDescription: row.markDescription ?? undefined,
        imageUrl: row.imageUrl,
        lastSeenAt: lastScan?.scannedAt,
      };
    }),
  );

  return apiResponse(data);
}

async function handleSearchSignal(
  db: ReturnType<typeof drizzle>,
  env: Env,
  ctx: ExecutionContext,
  user: AuthUser,
) {
  const missingRows = await db
    .select({ id: livestock.id, earNumber: livestock.earNumber })
    .from(livestock)
    .where(and(eq(livestock.userId, user.id), eq(livestock.status, 'MISSING')))
    .all();

  if (missingRows.length === 0) {
    throw new ApiFailure(409, 'Дутуу гэж тэмдэглэсэн мал алга байна.', 'NO_MISSING_LIVESTOCK');
  }

  await createAlert(db, env, ctx, user.id, {
    type: 'SYSTEM',
    title: 'Хайлтын дохио илгээгдлээ',
    message: `${missingRows.length} малын хайлтын хүсэлт бүртгэгдлээ.`,
  });

  const owner = await db
    .select({ dealerId: users.dealerId })
    .from(users)
    .where(eq(users.id, user.id))
    .get();

  if (owner?.dealerId) {
    await createAlert(db, env, ctx, owner.dealerId, {
      type: 'MISSING',
      title: 'Мал хайх хүсэлт',
      message: `${user.name || user.phoneNumber} ${missingRows.length} дутуу малын хайлтын дохио илгээлээ.`,
    });
  }

  return apiResponse({
    missingCount: missingRows.length,
    dealerNotified: Boolean(owner?.dealerId),
  });
}

async function handleHistory(request: Request, db: ReturnType<typeof drizzle>, userId: string) {
  const url = new URL(request.url);
  const rangeParam = url.searchParams.get('range') ?? '7d';
  const range = (HISTORY_RANGES as readonly string[]).includes(rangeParam)
    ? (rangeParam as (typeof HISTORY_RANGES)[number])
    : '7d';
  const days = HISTORY_RANGE_DAYS[range];

  const [rows, removals] = await Promise.all([
    db
      .select({ createdAt: livestock.createdAt })
      .from(livestock)
      .where(eq(livestock.userId, userId))
      .all(),
    db
      .select({
        createdAt: livestockRemovals.livestockCreatedAt,
        removedAt: livestockRemovals.removedAt,
      })
      .from(livestockRemovals)
      .where(eq(livestockRemovals.userId, userId))
      .all(),
  ]);

  const nowMs = Date.now();
  const startIso = new Date(nowMs - days * 24 * 60 * 60_000).toISOString();

  const pointCount = Math.min(days, 30);
  const stepDays = Math.max(1, Math.floor(days / pointCount));
  const points: { label: string; total: number }[] = [];

  for (let i = pointCount; i >= 0; i -= 1) {
    const bucketDate = new Date(nowMs - i * stepDays * 24 * 60 * 60_000);
    const cutoff = bucketDate.toISOString();
    const total =
      rows.filter((row) => row.createdAt <= cutoff).length +
      removals.filter((row) => row.createdAt <= cutoff && row.removedAt > cutoff).length;
    points.push({
      label: bucketDate.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' }),
      total,
    });
  }

  const added =
    rows.filter((row) => row.createdAt >= startIso).length +
    removals.filter((row) => row.createdAt >= startIso).length;
  const removed = removals.filter((row) => row.removedAt >= startIso).length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const addedToday =
    rows.filter((row) => row.createdAt.startsWith(todayIso)).length +
    removals.filter((row) => row.createdAt.startsWith(todayIso)).length;
  const removedToday = removals.filter((row) => row.removedAt.startsWith(todayIso)).length;
  const todayDelta = addedToday - removedToday;

  return apiResponse({ points, added, removed, todayDelta });
}

async function handleDashboard(db: ReturnType<typeof drizzle>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [
    total,
    missing,
    untagged,
    sheepCount,
    goatCount,
    scansToday,
    recentScans,
    readers,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(livestock)
      .where(eq(livestock.userId, userId))
      .get(),
    db
      .select({ value: count() })
      .from(livestock)
      .where(and(eq(livestock.userId, userId), eq(livestock.status, 'MISSING')))
      .get(),
    db
      .select({ value: count() })
      .from(livestock)
      .leftJoin(rfidTags, eq(rfidTags.livestockId, livestock.id))
      .where(and(eq(livestock.userId, userId), isNull(rfidTags.id)))
      .get(),
    db
      .select({ value: count() })
      .from(livestock)
      .where(and(eq(livestock.userId, userId), eq(livestock.species, 'SHEEP')))
      .get(),
    db
      .select({ value: count() })
      .from(livestock)
      .where(and(eq(livestock.userId, userId), eq(livestock.species, 'GOAT')))
      .get(),
    db
      .select()
      .from(rfidScans)
      .where(and(eq(rfidScans.userId, userId), like(rfidScans.scannedAt, `${today}%`)))
      .orderBy(desc(rfidScans.scannedAt))
      .all(),
    db
      .select({
        id: rfidScans.id,
        scannedAt: rfidScans.scannedAt,
        readerId: rfidScans.readerId,
        epc: rfidScans.epc,
        direction: rfidScans.direction,
        source: rfidScans.source,
        livestockId: rfidScans.livestockId,
        earNumber: livestock.earNumber,
        name: livestock.name,
      })
      .from(rfidScans)
      .leftJoin(livestock, eq(livestock.id, rfidScans.livestockId))
      .where(eq(rfidScans.userId, userId))
      .orderBy(desc(rfidScans.scannedAt))
      .limit(6)
      .all(),
    db
      .select()
      .from(rfidReaders)
      .where(eq(rfidReaders.userId, userId))
      .orderBy(rfidReaders.name)
      .all(),
  ]);

  const totalLivestock = total?.value ?? 0;
  const scannedLivestockIds = new Set(
    scansToday
      .map((scan) => scan.livestockId)
      .filter((livestockId): livestockId is string => Boolean(livestockId)),
  );
  const unknownEpcsToday = [
    ...new Set(scansToday.filter((scan) => !scan.livestockId).map((scan) => scan.epc)),
  ];

  const readersWithStatus = await Promise.all(
    readers.map(async (reader) => {
      const lastScan = await db
        .select({
          scannedAt: rfidScans.scannedAt,
          direction: rfidScans.direction,
          epc: rfidScans.epc,
        })
        .from(rfidScans)
        .where(and(eq(rfidScans.userId, userId), eq(rfidScans.readerId, reader.id)))
        .orderBy(desc(rfidScans.scannedAt))
        .limit(1)
        .get();

      return {
        id: reader.id,
        name: reader.name,
        location: reader.location ?? undefined,
        deviceSecretSet: Boolean(reader.deviceSecretHash),
        lastScanAt: lastScan?.scannedAt,
        lastDirection: lastScan?.direction,
        lastEpc: lastScan?.epc,
        isActiveToday: Boolean(lastScan?.scannedAt.startsWith(today)),
      };
    }),
  );

  return apiResponse({
    totalLivestock,
    scannedToday: scansToday.length,
    missingCount: missing?.value ?? 0,
    sheepCount: sheepCount?.value ?? 0,
    goatCount: goatCount?.value ?? 0,
    unknownTagCount: untagged?.value ?? 0,
    readerCount: readers.length,
    activeReaderCount: readersWithStatus.filter((reader) => reader.isActiveToday).length,
    today: {
      date: today,
      totalScans: scansToday.length,
      scannedLivestock: scannedLivestockIds.size,
      unscannedLivestock: Math.max(totalLivestock - scannedLivestockIds.size, 0),
      entered: scansToday.filter((scan) => scan.direction === 'ENTER').length,
      exited: scansToday.filter((scan) => scan.direction === 'EXIT').length,
      unknown: unknownEpcsToday.length,
      unknownEpcs: unknownEpcsToday,
      lastScan: scansToday[0]
        ? {
            id: scansToday[0].id,
            epc: scansToday[0].epc,
            livestockId: scansToday[0].livestockId,
            readerId: scansToday[0].readerId,
            direction: scansToday[0].direction,
            source: scansToday[0].source,
            scannedAt: scansToday[0].scannedAt,
          }
        : null,
    },
    readers: readersWithStatus,
    recentScans: recentScans.map((scan) => ({
      id: scan.id,
      epc: scan.epc,
      readerId: scan.readerId,
      direction: scan.direction,
      source: scan.source,
      scannedAt: scan.scannedAt,
      livestock: scan.livestockId
        ? {
            id: scan.livestockId,
            earNumber: scan.earNumber,
            name: scan.name ?? undefined,
          }
        : null,
    })),
  });
}

async function handleDailyCounts(request: Request, db: ReturnType<typeof drizzle>, userId: string) {
  const requestedDate = new URL(request.url).searchParams.get('date');
  const date = requestedDate ?? new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiFailure(400, 'Огноо буруу байна.', 'BAD_DATE');
  }

  const [livestockRows, scans, missing] = await Promise.all([
    db.select({ id: livestock.id }).from(livestock).where(eq(livestock.userId, userId)).all(),
    db
      .select()
      .from(rfidScans)
      .where(and(eq(rfidScans.userId, userId), like(rfidScans.scannedAt, `${date}%`)))
      .orderBy(desc(rfidScans.scannedAt))
      .all(),
    db
      .select({ value: count() })
      .from(livestock)
      .where(and(eq(livestock.userId, userId), eq(livestock.status, 'MISSING')))
      .get(),
  ]);

  const scannedLivestockIds = new Set(
    scans
      .map((scan) => scan.livestockId)
      .filter((livestockId): livestockId is string => Boolean(livestockId)),
  );
  const unknownEpcs = [...new Set(scans.filter((scan) => !scan.livestockId).map((scan) => scan.epc))];

  return apiResponse({
    date,
    totalLivestock: livestockRows.length,
    scannedLivestock: scannedLivestockIds.size,
    unscannedLivestock: Math.max(livestockRows.length - scannedLivestockIds.size, 0),
    entered: scans.filter((scan) => scan.direction === 'ENTER').length,
    exited: scans.filter((scan) => scan.direction === 'EXIT').length,
    unknown: unknownEpcs.length,
    unknownEpcs,
    missing: missing?.value ?? 0,
    lastScan: scans[0]
      ? {
          id: scans[0].id,
          epc: scans[0].epc,
          livestockId: scans[0].livestockId,
          readerId: scans[0].readerId,
          direction: scans[0].direction,
          scannedAt: scans[0].scannedAt,
        }
      : null,
  });
}

async function handleAdminStatistics(db: ReturnType<typeof drizzle>) {
  const today = new Date().toISOString().slice(0, 10);
  const totalUsers = await db.select({ value: count() }).from(users).get();
  const totalLivestock = await db.select({ value: count() }).from(livestock).get();
  const missing = await db
    .select({ value: count() })
    .from(livestock)
    .where(eq(livestock.status, 'MISSING'))
    .get();
  const unknownTags = await db
    .select({ value: count() })
    .from(livestock)
    .leftJoin(rfidTags, eq(rfidTags.livestockId, livestock.id))
    .where(isNull(rfidTags.id))
    .get();
  const scannedToday = await db
    .select({ value: count() })
    .from(rfidScans)
    .where(like(rfidScans.scannedAt, `${today}%`))
    .get();
  const missingLivestock = await db
    .select({
      id: livestock.id,
      earNumber: livestock.earNumber,
      name: livestock.name,
    })
    .from(livestock)
    .where(eq(livestock.status, 'MISSING'))
    .orderBy(livestock.earNumber)
    .all();
  const recentUsers = await db
    .select({
      id: users.id,
      name: users.name,
      phoneNumber: users.phoneNumber,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(5)
    .all();

  return apiResponse({
    totalUsers: totalUsers?.value ?? 0,
    totalLivestock: totalLivestock?.value ?? 0,
    scannedToday: scannedToday?.value ?? 0,
    missingCount: missing?.value ?? 0,
    unknownTagCount: unknownTags?.value ?? 0,
    missingLivestock,
    recentUsers,
  });
}

async function handlePushToken(request: Request, db: ReturnType<typeof drizzle>, userId: string) {
  const input = await parseJson(request, pushTokenSchema);
  const timestamp = now();

  await db
    .insert(devicePushTokens)
    .values({
      id: createId('device'),
      userId,
      token: input.token,
      platform: input.platform,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: devicePushTokens.token,
      set: {
        userId,
        platform: input.platform,
        updatedAt: timestamp,
      },
    });

  return apiResponse({ token: input.token });
}

function tagRegistryResponse(row: typeof rfidTagRegistry.$inferSelect) {
  return {
    epc: row.epc,
    status: row.status,
    claimedByUserId: row.claimedByUserId ?? undefined,
    claimedAt: row.claimedAt ?? undefined,
  };
}

async function findRegistryTag(db: ReturnType<typeof drizzle>, epc: string) {
  return db
    .select()
    .from(rfidTagRegistry)
    .where(sql`lower(${rfidTagRegistry.epc}) = ${epc.toLowerCase()}`)
    .get();
}

async function ensureTagClaimable(
  db: ReturnType<typeof drizzle>,
  userId: string,
  rawEpc: string,
) {
  const epc = normalizeEpc(rawEpc);
  const existing = await findRegistryTag(db, epc);

  if (existing && existing.status === 'DAMAGED') {
    throw new ApiFailure(409, 'Энэ шошго гэмтэлтэй тул ашиглах боломжгүй.', 'TAG_DAMAGED');
  }

  if (
    existing &&
    (existing.status === 'CLAIMED' || existing.status === 'LOCKED') &&
    existing.claimedByUserId !== userId
  ) {
    throw new ApiFailure(409, 'Энэ шошго өөр хэрэглэгчид бүртгэгдсэн байна.', 'TAG_ALREADY_CLAIMED');
  }

  return { epc, existing };
}

async function claimTagForUser(
  db: ReturnType<typeof drizzle>,
  userId: string,
  rawEpc: string,
) {
  const { epc, existing } = await ensureTagClaimable(db, userId, rawEpc);
  const timestamp = now();

  if (existing) {
    await db
      .update(rfidTagRegistry)
      .set({ status: 'LOCKED', claimedByUserId: userId, claimedAt: timestamp, updatedAt: timestamp })
      .where(eq(rfidTagRegistry.epc, existing.epc));
  } else {
    await db.insert(rfidTagRegistry).values({
      epc,
      status: 'LOCKED',
      claimedByUserId: userId,
      claimedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  const tag = await findRegistryTag(db, epc);
  return tag!;
}

async function handleClaimTag(request: Request, db: ReturnType<typeof drizzle>, userId: string) {
  const input = await parseJson(request, claimTagSchema);
  const tag = await claimTagForUser(db, userId, input.epc);
  return apiResponse(tagRegistryResponse(tag));
}

async function handleGetTag(db: ReturnType<typeof drizzle>, rawEpc: string) {
  const epc = normalizeEpc(rawEpc);
  const tag = await findRegistryTag(db, epc);

  if (!tag) {
    return apiResponse({ epc, status: 'AVAILABLE' as const });
  }

  return apiResponse(tagRegistryResponse(tag));
}

async function handleListTags(db: ReturnType<typeof drizzle>) {
  const rows = await db.select().from(rfidTagRegistry).orderBy(desc(rfidTagRegistry.updatedAt)).all();
  return apiResponse(rows.map(tagRegistryResponse));
}

async function handleUnlockTag(db: ReturnType<typeof drizzle>, rawEpc: string) {
  const epc = normalizeEpc(rawEpc);
  const existing = await findRegistryTag(db, epc);

  if (!existing) {
    throw new ApiFailure(404, 'Шошго олдсонгүй.', 'NOT_FOUND');
  }

  await db
    .update(rfidTagRegistry)
    .set({ status: 'AVAILABLE', claimedByUserId: null, claimedAt: null, updatedAt: now() })
    .where(eq(rfidTagRegistry.epc, existing.epc));

  const updated = await findRegistryTag(db, epc);
  return apiResponse(tagRegistryResponse(updated!));
}

function dealerRegistrationResponse(row: typeof dealerRegistrations.$inferSelect) {
  return {
    id: row.id,
    orgName: row.orgName,
    contact: row.contact,
    prefixRequested: row.prefixRequested,
    status: row.status,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt ?? undefined,
  };
}

async function handleCreateDealerRegistration(
  request: Request,
  db: ReturnType<typeof drizzle>,
  userId: string,
) {
  const input = await parseJson(request, dealerRegistrationInputSchema);
  const existing = await db
    .select()
    .from(dealerRegistrations)
    .where(eq(dealerRegistrations.requestedByUserId, userId))
    .orderBy(desc(dealerRegistrations.createdAt))
    .get();

  if (existing?.status === 'PENDING' || existing?.status === 'APPROVED') {
    throw new ApiFailure(409, 'Идэвхтэй хүсэлт өмнө нь бүртгэгдсэн байна.', 'REGISTRATION_EXISTS');
  }

  const id = createId('dealer');

  await db.insert(dealerRegistrations).values({
    id,
    requestedByUserId: userId,
    orgName: input.orgName.trim(),
    contact: input.contact.trim(),
    prefixRequested: input.prefixRequested.trim(),
    status: 'PENDING',
    createdAt: now(),
  });

  const created = await db
    .select()
    .from(dealerRegistrations)
    .where(eq(dealerRegistrations.id, id))
    .get();
  return apiResponse(dealerRegistrationResponse(created!));
}

async function handleGetMyDealerRegistration(db: ReturnType<typeof drizzle>, userId: string) {
  const registration = await db
    .select()
    .from(dealerRegistrations)
    .where(eq(dealerRegistrations.requestedByUserId, userId))
    .orderBy(desc(dealerRegistrations.createdAt))
    .get();

  return apiResponse(registration ? dealerRegistrationResponse(registration) : null);
}

async function handleListDealerRegistrations(db: ReturnType<typeof drizzle>) {
  const rows = await db
    .select()
    .from(dealerRegistrations)
    .orderBy(desc(dealerRegistrations.createdAt))
    .all();
  return apiResponse(rows.map(dealerRegistrationResponse));
}

async function handleDecideDealerRegistration(
  request: Request,
  db: ReturnType<typeof drizzle>,
  registrationId: string,
) {
  const input = await parseJson(request, decideDealerRegistrationSchema);
  const existing = await db
    .select()
    .from(dealerRegistrations)
    .where(eq(dealerRegistrations.id, registrationId))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Хүсэлт олдсонгүй.', 'NOT_FOUND');
  }

  if (existing.status !== 'PENDING') {
    throw new ApiFailure(409, 'Энэ хүсэлтийг өмнө шийдвэрлэсэн байна.', 'REGISTRATION_ALREADY_DECIDED');
  }

  await db
    .update(dealerRegistrations)
    .set({ status: input.status, decidedAt: now() })
    .where(eq(dealerRegistrations.id, registrationId));

  if (input.status === 'APPROVED') {
    await db
      .update(users)
      .set({ role: 'DEALER', updatedAt: now() })
      .where(eq(users.id, existing.requestedByUserId));
  }

  const updated = await db
    .select()
    .from(dealerRegistrations)
    .where(eq(dealerRegistrations.id, registrationId))
    .get();
  return apiResponse(dealerRegistrationResponse(updated!));
}

function farmerResponse(row: typeof users.$inferSelect, livestockCount: number) {
  return {
    id: row.id,
    phoneNumber: row.phoneNumber,
    name: row.name,
    aimag: row.aimag ?? undefined,
    sum: row.sum ?? undefined,
    status: row.status,
    livestockCount,
    createdAt: row.createdAt,
  };
}

async function handleListFarmers(request: Request, db: ReturnType<typeof drizzle>, dealerId: string) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim();
  const aimag = url.searchParams.get('aimag')?.trim();
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));

  const filters = [eq(users.dealerId, dealerId)];
  if (search) {
    filters.push(or(like(users.name, `%${search}%`), like(users.phoneNumber, `%${search}%`))!);
  }
  if (aimag) {
    filters.push(eq(users.aimag, aimag));
  }
  const conditions = and(...filters);

  const totalRow = await db.select({ value: count() }).from(users).where(conditions).get();
  const rows = await db
    .select()
    .from(users)
    .where(conditions)
    .orderBy(users.name)
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  const counts = await Promise.all(
    rows.map((row) =>
      db.select({ value: count() }).from(livestock).where(eq(livestock.userId, row.id)).get(),
    ),
  );

  return apiResponse({
    items: rows.map((row, i) => farmerResponse(row, counts[i]?.value ?? 0)),
    total: totalRow?.value ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((totalRow?.value ?? 0) / limit)),
  });
}

async function handleAddFarmer(request: Request, db: ReturnType<typeof drizzle>, dealerId: string) {
  const input = await parseJson(request, addFarmerSchema);
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.phoneNumber, input.phoneNumber))
    .get();

  if (existing) {
    if (existing.role !== 'FARMER') {
      throw new ApiFailure(409, 'Энэ дугаар малчин бус хэрэглэгчид бүртгэгдсэн байна.', 'NOT_A_FARMER');
    }
    if (existing.dealerId && existing.dealerId !== dealerId) {
      throw new ApiFailure(409, 'Энэ дугаар өөр гэрээтэд бүртгэгдсэн байна.', 'FARMER_ALREADY_LINKED');
    }

    await db
      .update(users)
      .set({
        name: input.name.trim(),
        aimag: input.aimag ? input.aimag.trim() : existing.aimag,
        sum: input.sum ? input.sum.trim() : existing.sum,
        dealerId,
        status: 'ACTIVE',
        updatedAt: now(),
      })
      .where(eq(users.id, existing.id));

    const updated = await db.select().from(users).where(eq(users.id, existing.id)).get();
    const livestockCount = await db
      .select({ value: count() })
      .from(livestock)
      .where(eq(livestock.userId, existing.id))
      .get();
    return apiResponse(farmerResponse(updated!, livestockCount?.value ?? 0));
  }

  const timestamp = now();
  const id = createId('user');
  await db.insert(users).values({
    id,
    phoneNumber: input.phoneNumber,
    name: input.name.trim(),
    role: 'FARMER',
    aimag: input.aimag?.trim() ?? null,
    sum: input.sum?.trim() ?? null,
    dealerId,
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const created = await db.select().from(users).where(eq(users.id, id)).get();
  return apiResponse(farmerResponse(created!, 0));
}

async function handleRemoveFarmer(db: ReturnType<typeof drizzle>, dealerId: string, farmerId: string) {
  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.id, farmerId), eq(users.dealerId, dealerId)))
    .get();

  if (!existing) {
    throw new ApiFailure(404, 'Малчин олдсонгүй.', 'NOT_FOUND');
  }

  await db.update(users).set({ dealerId: null, updatedAt: now() }).where(eq(users.id, farmerId));
  return apiResponse({ id: farmerId, removed: true });
}

async function handleUpload(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new ApiFailure(400, 'Зураг олдсонгүй.', 'BAD_REQUEST');
  }

  if (!file.type || !file.type.startsWith('image/')) {
    throw new ApiFailure(400, 'Зөвхөн зураг файл илгээх боломжтой.', 'INVALID_FILE_TYPE');
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiFailure(413, 'Зургийн хэмжээ 5MB-с ихгүй байна.', 'FILE_TOO_LARGE');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return apiResponse({
    url: `data:${file.type};base64,${base64FromBytes(bytes)}`,
  });
}

async function route(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: jsonHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const db = drizzle(env.DB);

  if (request.method === 'GET' && path === '/api/health') {
    return apiResponse({ status: 'ok' });
  }

  if (request.method === 'POST' && path === '/api/auth/send-otp') {
    return handleSendOtp(request, db, env);
  }

  if (request.method === 'POST' && path === '/api/auth/verify-otp') {
    return handleVerifyOtp(request, db, env);
  }

  if (request.method === 'POST' && path === '/api/auth/refresh') {
    return handleRefresh(request, db, env);
  }

  if (request.method === 'POST' && path === '/api/devices/scans') {
    return handleDeviceIngestScans(request, db);
  }

  const user = await getAuthUser(request, db, env);

  if (request.method === 'GET' && path === '/api/auth/me') {
    return handleGetMe(request, db, env);
  }

  if (request.method === 'PATCH' && path === '/api/auth/me') {
    return handleUpdateMe(request, db, env);
  }

  if (request.method === 'POST' && path === '/api/auth/logout') {
    return handleLogout(db, user);
  }

  if (request.method === 'GET' && path === '/api/dashboard') {
    return handleDashboard(db, user.id);
  }

  if (request.method === 'GET' && path === '/api/counts/daily') {
    return handleDailyCounts(request, db, user.id);
  }

  if (request.method === 'GET' && path === '/api/reports/missing') {
    return handleMissingLivestock(db, user.id);
  }

  if (request.method === 'POST' && path === '/api/search-signal') {
    return handleSearchSignal(db, env, ctx, user);
  }

  if (request.method === 'GET' && path === '/api/reports/history') {
    return handleHistory(request, db, user.id);
  }

  if (request.method === 'GET' && path === '/api/admin/statistics') {
    if (user.role !== 'ADMIN') {
      throw new ApiFailure(403, 'Админ эрх шаардлагатай.', 'FORBIDDEN');
    }

    return handleAdminStatistics(db);
  }

  if (request.method === 'GET' && path === '/api/admin/tags') {
    if (user.role !== 'ADMIN') {
      throw new ApiFailure(403, 'Админ эрх шаардлагатай.', 'FORBIDDEN');
    }

    return handleListTags(db);
  }

  if (request.method === 'POST' && path === '/api/rfid/tags/claim') {
    return handleClaimTag(request, db, user.id);
  }

  if (request.method === 'GET' && path === '/api/admin/dealer-registrations') {
    if (user.role !== 'ADMIN') {
      throw new ApiFailure(403, 'Админ эрх шаардлагатай.', 'FORBIDDEN');
    }

    return handleListDealerRegistrations(db);
  }

  if (request.method === 'POST' && path === '/api/dealer-registrations') {
    return handleCreateDealerRegistration(request, db, user.id);
  }

  if (request.method === 'GET' && path === '/api/dealer-registrations/me') {
    return handleGetMyDealerRegistration(db, user.id);
  }

  if (request.method === 'GET' && path === '/api/dealer/farmers') {
    if (user.role !== 'DEALER') {
      throw new ApiFailure(403, 'Гэрээт эрх шаардлагатай.', 'FORBIDDEN');
    }

    return handleListFarmers(request, db, user.id);
  }

  if (request.method === 'POST' && path === '/api/dealer/farmers') {
    if (user.role !== 'DEALER') {
      throw new ApiFailure(403, 'Гэрээт эрх шаардлагатай.', 'FORBIDDEN');
    }

    return handleAddFarmer(request, db, user.id);
  }

  if (request.method === 'GET' && path === '/api/alerts') {
    return handleListAlerts(db, user.id);
  }

  if (request.method === 'PATCH' && path === '/api/alerts/read-all') {
    return handleReadAllAlerts(db, user.id);
  }

  if (request.method === 'POST' && path === '/api/devices/push-token') {
    return handlePushToken(request, db, user.id);
  }

  if (request.method === 'POST' && path === '/api/devices/readers') {
    return handleRegisterReader(request, db, user.id);
  }

  if (request.method === 'POST' && path === '/api/scans') {
    return handleIngestScans(request, db, user.id);
  }

  if (request.method === 'GET' && path === '/api/scans') {
    return handleListScans(db, user.id);
  }

  if (request.method === 'POST' && path === '/api/uploads') {
    return handleUpload(request);
  }

  if (path === '/api/livestock') {
    if (request.method === 'GET') {
      return handleListLivestock(request, db, user.id);
    }

    if (request.method === 'POST') {
      return handleCreateLivestock(request, db, user.id);
    }
  }

  const livestockScansMatch = path.match(/^\/api\/livestock\/([^/]+)\/scans$/);

  if (livestockScansMatch && request.method === 'GET') {
    return handleLivestockScans(db, user.id, livestockScansMatch[1]);
  }

  const livestockStatusMatch = path.match(/^\/api\/livestock\/([^/]+)\/status$/);

  if (livestockStatusMatch && request.method === 'PATCH') {
    return handleUpdateLivestockStatus(
      request,
      db,
      user.id,
      livestockStatusMatch[1],
      env,
      ctx,
    );
  }

  const livestockLocationMatch = path.match(/^\/api\/livestock\/([^/]+)\/location$/);

  if (livestockLocationMatch && request.method === 'PATCH') {
    return handleUpdateLivestockLocation(request, db, user.id, livestockLocationMatch[1]);
  }

  const alertReadMatch = path.match(/^\/api\/alerts\/([^/]+)\/read$/);

  if (alertReadMatch && request.method === 'PATCH') {
    return handleReadAlert(request, db, user.id, alertReadMatch[1]);
  }

  const tagUnlockMatch = path.match(/^\/api\/admin\/tags\/([^/]+)\/unlock$/);

  if (tagUnlockMatch && request.method === 'PATCH') {
    if (user.role !== 'ADMIN') {
      throw new ApiFailure(403, 'Админ эрх шаардлагатай.', 'FORBIDDEN');
    }

    return handleUnlockTag(db, decodeURIComponent(tagUnlockMatch[1]));
  }

  const tagGetMatch = path.match(/^\/api\/rfid\/tags\/([^/]+)$/);

  if (tagGetMatch && request.method === 'GET') {
    return handleGetTag(db, decodeURIComponent(tagGetMatch[1]));
  }

  const dealerRegistrationDecisionMatch = path.match(/^\/api\/admin\/dealer-registrations\/([^/]+)$/);

  if (dealerRegistrationDecisionMatch && request.method === 'PATCH') {
    if (user.role !== 'ADMIN') {
      throw new ApiFailure(403, 'Админ эрх шаардлагатай.', 'FORBIDDEN');
    }

    return handleDecideDealerRegistration(request, db, dealerRegistrationDecisionMatch[1]);
  }

  const dealerFarmerMatch = path.match(/^\/api\/dealer\/farmers\/([^/]+)$/);

  if (dealerFarmerMatch && request.method === 'DELETE') {
    if (user.role !== 'DEALER') {
      throw new ApiFailure(403, 'Гэрээт эрх шаардлагатай.', 'FORBIDDEN');
    }

    return handleRemoveFarmer(db, user.id, dealerFarmerMatch[1]);
  }

  const livestockMatch = path.match(/^\/api\/livestock\/([^/]+)$/);

  if (livestockMatch) {
    if (request.method === 'GET') {
      return handleGetLivestock(db, user.id, livestockMatch[1]);
    }

    if (request.method === 'PATCH') {
      return handleUpdateLivestock(request, db, user.id, livestockMatch[1]);
    }

    if (request.method === 'DELETE') {
      return handleDeleteLivestock(db, user.id, livestockMatch[1]);
    }
  }

  throw new ApiFailure(404, 'Endpoint олдсонгүй.', 'NOT_FOUND');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      return await route(request, env, ctx);
    } catch (error) {
      return apiError(error);
    }
  },
};
