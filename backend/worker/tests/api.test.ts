import { env } from 'cloudflare:workers';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import worker from '../src/index';
import { users } from '../src/db/schema';

type WorkerEnv = Parameters<typeof worker.fetch>[1];
const testEnv = env as unknown as WorkerEnv;

async function makeDealer(userId: string) {
  const db = drizzle(testEnv.DB);
  await db.update(users).set({ role: 'DEALER' }).where(eq(users.id, userId));
}

async function makeAdmin(userId: string) {
  const db = drizzle(testEnv.DB);
  await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, userId));
}

type ApiBody = {
  success: boolean;
  data?: any;
  message?: string;
  code?: string;
};

type ApiResult = {
  status: number;
  body: ApiBody;
};

const OTP_CODE = '123456';

async function api(path: string, init?: RequestInit): Promise<ApiResult> {
  const request = new Request(`http://localhost${path}`, init);
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, testEnv, ctx);
  await waitOnExecutionContext(ctx);
  const body = (await response.json().catch(() => null)) as ApiBody;
  return { status: response.status, body };
}

function json(method: string, payload: unknown, token?: string): RequestInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { method, headers, body: JSON.stringify(payload) };
}

function authorized(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function registerAndLogin(phone: string) {
  const send = await api('/api/auth/send-otp', json('POST', { phoneNumber: phone }));
  expect(send.status).toBe(200);

  const verify = await api(
    '/api/auth/verify-otp',
    json('POST', { phoneNumber: phone, code: OTP_CODE }),
  );
  expect(verify.status).toBe(200);
  return verify.body.data;
}

describe('health', () => {
  it('returns ok without authentication', async () => {
    const res = await api('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'ok' });
  });
});

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    const res = await api('/api/livestock');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('sends an OTP and verifies it into a session', async () => {
    const data = await registerAndLogin('99001122');

    expect(data.accessToken).toBeTruthy();
    expect(data.refreshToken).toBeTruthy();
    expect(data.user.phoneNumber).toBe('99001122');
    expect(data.user.role).toBe('FARMER');
    expect(data.requiresProfileSetup).toBe(true);
  });

  it('returns the OTP code in the response when EXPOSE_OTP is enabled', async () => {
    const res = await api('/api/auth/send-otp', json('POST', { phoneNumber: '99002233' }));
    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe(OTP_CODE);
  });

  it('locks an OTP after 5 wrong attempts', async () => {
    const phone = '99003344';
    await api('/api/auth/send-otp', json('POST', { phoneNumber: phone }));

    let last: ApiResult | undefined;
    for (let i = 0; i < 5; i += 1) {
      last = await api('/api/auth/verify-otp', json('POST', { phoneNumber: phone, code: '000000' }));
    }

    expect(last!.status).toBe(429);
    expect(last!.body.code).toBe('OTP_TOO_MANY_ATTEMPTS');

    const afterLock = await api(
      '/api/auth/verify-otp',
      json('POST', { phoneNumber: phone, code: OTP_CODE }),
    );
    expect(afterLock.status).toBe(400);
  });

  it('rejects a wrong OTP code', async () => {
    const phone = '99004455';
    await api('/api/auth/send-otp', json('POST', { phoneNumber: phone }));

    const res = await api('/api/auth/verify-otp', json('POST', { phoneNumber: phone, code: '111111' }));
    expect(res.status).toBe(400);
  });
});

describe('refresh token rotation', () => {
  it('rotates on refresh and revokes every session when an old token is reused', async () => {
    const tokens = await registerAndLogin('99005566');
    const first = tokens.refreshToken;

    const rotated = await api('/api/auth/refresh', json('POST', { refreshToken: first }));
    expect(rotated.status).toBe(200);
    const second = rotated.body.data.refreshToken;
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);

    const reuse = await api('/api/auth/refresh', json('POST', { refreshToken: first }));
    expect(reuse.status).toBe(401);

    const afterTheft = await api('/api/auth/refresh', json('POST', { refreshToken: second }));
    expect(afterTheft.status).toBe(401);
  });
});

describe('logout', () => {
  it('keeps a session active until logout and revokes it immediately afterwards', async () => {
    const tokens = await registerAndLogin('99005667');
    const payloadPart = tokens.accessToken.split('.')[1];
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
    expect(payload.exp).toBeUndefined();
    expect(payload.sid).toBeTruthy();

    const before = await api('/api/auth/me', authorized(tokens.accessToken));
    expect(before.status).toBe(200);

    const loggedOut = await api(
      '/api/auth/logout',
      json('POST', {}, tokens.accessToken),
    );
    expect(loggedOut.status).toBe(200);
    expect(loggedOut.body.data).toEqual({ loggedOut: true });

    const after = await api('/api/auth/me', authorized(tokens.accessToken));
    expect(after.status).toBe(401);
    expect(after.body.code).toBe('SESSION_REVOKED');

    const refresh = await api(
      '/api/auth/refresh',
      json('POST', { refreshToken: tokens.refreshToken }),
    );
    expect(refresh.status).toBe(401);
  });
});

describe('profile', () => {
  it('updates the profile name', async () => {
    const tokens = await registerAndLogin('99006677');
    const res = await api(
      '/api/auth/me',
      json('PATCH', { name: 'Бат' }, tokens.accessToken),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Бат');
    expect(res.body.data.requiresProfileSetup).toBeUndefined();
  });

  it('returns the current user', async () => {
    const tokens = await registerAndLogin('99007788');
    const res = await api('/api/auth/me', authorized(tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.phoneNumber).toBe('99007788');
    expect(res.body.data.imageUrl).toBeNull();
  });

  it('uploads and persists a profile image without changing the name', async () => {
    const tokens = await registerAndLogin('99007889');
    const auth = tokens.accessToken;
    await api('/api/auth/me', json('PATCH', { name: 'Саруул' }, auth));

    const form = new FormData();
    form.append('file', new File([new Uint8Array([137, 80, 78, 71])], 'avatar.png', { type: 'image/png' }));
    const uploaded = await api('/api/uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}` },
      body: form,
    });
    expect(uploaded.status).toBe(200);
    expect(uploaded.body.data.url).toBe('data:image/png;base64,iVBORw==');

    const updated = await api(
      '/api/auth/me',
      json('PATCH', { imageUrl: uploaded.body.data.url }, auth),
    );
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Саруул');
    expect(updated.body.data.imageUrl).toBe(uploaded.body.data.url);

    const me = await api('/api/auth/me', authorized(auth));
    expect(me.body.data.imageUrl).toBe(uploaded.body.data.url);
  });
});

describe('livestock CRUD', () => {
  it('creates, lists, updates and deletes livestock', async () => {
    const tokens = await registerAndLogin('99008899');
    const auth = tokens.accessToken;

    const created = await api(
      '/api/livestock',
      json('POST', { earNumber: 'A-100', species: 'SHEEP', gender: 'FEMALE', name: 'Хонь', rfidEpc: 'E280-0001' }, auth),
    );
    expect(created.status).toBe(200);
    const id = created.body.data.id;
    expect(created.body.data.earNumber).toBe('A-100');
    expect(created.body.data.rfidTag).toEqual({ id: expect.any(String), epc: 'E280-0001' });
    expect(created.body.data.lastScan).toBeNull();

    const dupEar = await api(
      '/api/livestock',
      json('POST', { earNumber: 'A-100', species: 'SHEEP', gender: 'MALE' }, auth),
    );
    expect(dupEar.status).toBe(409);
    expect(dupEar.body.code).toBe('DUPLICATE_EAR_NUMBER');

    const dupEpc = await api(
      '/api/livestock',
      json('POST', { earNumber: 'A-101', species: 'SHEEP', gender: 'MALE', rfidEpc: 'E280-0001' }, auth),
    );
    expect(dupEpc.status).toBe(409);
    expect(dupEpc.body.code).toBe('DUPLICATE_EPC');

    const list = await api('/api/livestock', authorized(auth));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const single = await api(`/api/livestock/${id}`, authorized(auth));
    expect(single.status).toBe(200);
    expect(single.body.data.earNumber).toBe('A-100');

    const updated = await api(
      `/api/livestock/${id}`,
      json('PATCH', { earNumber: 'A-100', species: 'SHEEP', gender: 'FEMALE', name: 'Улаан хонь' }, auth),
    );
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Улаан хонь');
    expect(updated.body.data.rfidTag).toBeNull();
    const released = await api('/api/rfid/tags/E280-0001', authorized(auth));
    expect(released.body.data.status).toBe('AVAILABLE');

    const deleted = await api(`/api/livestock/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth}` } });
    expect(deleted.status).toBe(200);
    expect(deleted.body.data).toEqual({ id, deleted: true });

    const after = await api('/api/livestock', authorized(auth));
    expect(after.body.data).toHaveLength(0);
  });

  it('returns 404 for a livestock that belongs to another user', async () => {
    const tokens = await registerAndLogin('99110011');
    const res = await api('/api/livestock/does-not-exist', authorized(tokens.accessToken));
    expect(res.status).toBe(404);
  });

  it('paginates the list with page/limit', async () => {
    const tokens = await registerAndLogin('99112233');
    const auth = tokens.accessToken;

    for (let i = 0; i < 3; i += 1) {
      const created = await api(
        '/api/livestock',
        json('POST', { earNumber: `C-${i}`, species: 'SHEEP', gender: 'FEMALE' }, auth),
      );
      expect(created.status).toBe(200);
    }

    const res = await api('/api/livestock?page=1&limit=2', authorized(auth));
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.totalPages).toBe(2);
  });

  it('filters by status, species and gender', async () => {
    const tokens = await registerAndLogin('99113344');
    const auth = tokens.accessToken;

    await api('/api/livestock', json('POST', { earNumber: 'F-1', species: 'SHEEP', gender: 'FEMALE' }, auth));
    const goat = await api('/api/livestock', json('POST', { earNumber: 'F-2', species: 'GOAT', gender: 'MALE' }, auth));
    await api(`/api/livestock/${goat.body.data.id}/status`, json('PATCH', { status: 'MISSING' }, auth));

    const bySpecies = await api('/api/livestock?species=GOAT&page=1&limit=10', authorized(auth));
    expect(bySpecies.body.data.items).toHaveLength(1);
    expect(bySpecies.body.data.items[0].earNumber).toBe('F-2');

    const byStatus = await api('/api/livestock?status=MISSING&page=1&limit=10', authorized(auth));
    expect(byStatus.body.data.items).toHaveLength(1);
    expect(byStatus.body.data.items[0].earNumber).toBe('F-2');

    const byGender = await api('/api/livestock?gender=FEMALE&page=1&limit=10', authorized(auth));
    expect(byGender.body.data.items).toHaveLength(1);
    expect(byGender.body.data.items[0].earNumber).toBe('F-1');
  });

  it('normalizes RFID EPCs and blocks tags claimed by another user', async () => {
    const owner = await registerAndLogin('99400011');
    await api('/api/rfid/tags/claim', json('POST', { epc: 'hh-4004' }, owner.accessToken));

    const created = await api(
      '/api/livestock',
      json(
        'POST',
        { earNumber: 'RFID-1', species: 'SHEEP', gender: 'FEMALE', rfidEpc: 'hh-4004' },
        owner.accessToken,
      ),
    );
    expect(created.status).toBe(200);
    expect(created.body.data.rfidTag.epc).toBe('HH-4004');

    const other = await registerAndLogin('99400022');
    const blocked = await api(
      '/api/livestock',
      json(
        'POST',
        { earNumber: 'RFID-2', species: 'GOAT', gender: 'MALE', rfidEpc: 'HH-4004' },
        other.accessToken,
      ),
    );
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('TAG_ALREADY_CLAIMED');
  });
});

describe('status alerts', () => {
  it('creates MISSING and FOUND alerts and marks them read', async () => {
    const tokens = await registerAndLogin('99123344');
    const auth = tokens.accessToken;

    const created = await api(
      '/api/livestock',
      json('POST', { earNumber: 'B-200', species: 'SHEEP', gender: 'MALE' }, auth),
    );
    const id = created.body.data.id;

    const missing = await api(
      `/api/livestock/${id}/status`,
      json('PATCH', { status: 'MISSING' }, auth),
    );
    expect(missing.status).toBe(200);
    expect(missing.body.data.status).toBe('MISSING');

    const alerts = await api('/api/alerts', authorized(auth));
    expect(alerts.status).toBe(200);
    expect(alerts.body.data).toHaveLength(1);
    expect(alerts.body.data[0]).toMatchObject({
      type: 'MISSING',
      livestockId: id,
      isRead: false,
    });

    const alertId = alerts.body.data[0].id;
    const read = await api(`/api/alerts/${alertId}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${auth}` } });
    expect(read.status).toBe(200);
    expect(read.body.data.isRead).toBe(true);

    const found = await api(
      `/api/livestock/${id}/status`,
      json('PATCH', { status: 'ACTIVE' }, auth),
    );
    expect(found.status).toBe(200);

    const alertsAfter = await api('/api/alerts', authorized(auth));
    expect(alertsAfter.body.data).toHaveLength(2);
    expect(alertsAfter.body.data[0].type).toBe('FOUND');
  });

  it('sends a search signal only when livestock is marked missing', async () => {
    const tokens = await registerAndLogin('99124455');
    const auth = tokens.accessToken;

    const empty = await api('/api/search-signal', json('POST', {}, auth));
    expect(empty.status).toBe(409);
    expect(empty.body.code).toBe('NO_MISSING_LIVESTOCK');

    const created = await api(
      '/api/livestock',
      json('POST', { earNumber: 'SEARCH-1', species: 'SHEEP', gender: 'FEMALE' }, auth),
    );
    await api(
      `/api/livestock/${created.body.data.id}/status`,
      json('PATCH', { status: 'MISSING' }, auth),
    );

    const signal = await api('/api/search-signal', json('POST', {}, auth));
    expect(signal.status).toBe(200);
    expect(signal.body.data).toEqual({ missingCount: 1, dealerNotified: false });

    const alerts = await api('/api/alerts', authorized(auth));
    expect(alerts.body.data.some((item: any) => item.title === 'Хайлтын дохио илгээгдлээ')).toBe(true);
  });
});

describe('rfid device integration', () => {
  it('registers and re-registers a reader', async () => {
    const tokens = await registerAndLogin('99156677');
    const auth = tokens.accessToken;

    const first = await api(
      '/api/devices/readers',
      json('POST', { id: 'hh100-01', name: 'Хашаа 1 уншигч' }, auth),
    );
    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ id: 'hh100-01', name: 'Хашаа 1 уншигч' });

    const second = await api(
      '/api/devices/readers',
      json('POST', { id: 'hh100-01', name: 'Хашаа шинэ уншигч' }, auth),
    );
    expect(second.status).toBe(200);
    expect(second.body.data.name).toBe('Хашаа шинэ уншигч');
  });

  it('rejects a reader registered by another user', async () => {
    const tokensA = await registerAndLogin('99167788');
    const res = await api(
      '/api/devices/readers',
      json('POST', { id: 'hl7202-01', name: 'Гар уншигч' }, tokensA.accessToken),
    );
    expect(res.status).toBe(200);

    const tokensB = await registerAndLogin('99178899');
    const conflict = await api(
      '/api/devices/readers',
      json('POST', { id: 'hl7202-01', name: 'Гар уншигч' }, tokensB.accessToken),
    );
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('READER_ALREADY_REGISTERED');
  });

  it('ingests scans and separates known from unknown EPCs', async () => {
    const tokens = await registerAndLogin('99189900');
    const auth = tokens.accessToken;

    const created = await api(
      '/api/livestock',
      json('POST', { earNumber: 'D-300', species: 'SHEEP', gender: 'FEMALE', rfidEpc: 'E280-1160' }, auth),
    );
    expect(created.status).toBe(200);
    const livestockId = created.body.data.id;

    const ingest = await api(
      '/api/scans',
      json(
        'POST',
        {
          scans: [
            { epc: 'e280-1160', direction: 'ENTER', readerId: 'hh100-01' },
            { epc: 'E280-9999', direction: 'EXIT', readerId: 'hh100-01' },
            { epc: 'E280-1160', readerId: 'hl7202-01' },
          ],
        },
        auth,
      ),
    );
    expect(ingest.status).toBe(200);
    expect(ingest.body.data.accepted).toBe(3);
    expect(ingest.body.data.known).toBe(2);
    expect(ingest.body.data.unknown).toBe(1);
    expect(ingest.body.data.unknownEpcs).toEqual(['E280-9999']);

    const recent = await api('/api/scans', authorized(auth));
    expect(recent.status).toBe(200);
    expect(recent.body.data).toHaveLength(3);
    expect(recent.body.data[0].epc).toBe('E280-1160');
    expect(recent.body.data[0].livestock).toMatchObject({
      id: livestockId,
      earNumber: 'D-300',
    });
    const unknownScan = recent.body.data.find((scan: any) => scan.epc === 'E280-9999');
    expect(unknownScan.livestock).toBeNull();

    const livestockScans = await api(`/api/livestock/${livestockId}/scans`, authorized(auth));
    expect(livestockScans.status).toBe(200);
    expect(livestockScans.body.data).toHaveLength(2);
  });

  it('accepts device scans, filters duplicates and summarizes daily counts', async () => {
    const tokens = await registerAndLogin('99398877');
    const auth = tokens.accessToken;
    const readerId = 'hh100-gate-summary';
    const countDate = new Date().toISOString().slice(0, 10);

    const reader = await api(
      '/api/devices/readers',
      json(
        'POST',
        {
          id: readerId,
          name: 'Зүүн хаалга',
          location: 'Зүүн хашаа',
          deviceSecret: 'device-secret-123',
        },
        auth,
      ),
    );
    expect(reader.status).toBe(200);
    expect(reader.body.data).toMatchObject({
      id: readerId,
      location: 'Зүүн хашаа',
      deviceSecretSet: true,
    });

    const tagged = await api(
      '/api/livestock',
      json(
        'POST',
        { earNumber: 'S-100', species: 'SHEEP', gender: 'FEMALE', rfidEpc: 'E280-SUMMARY-1' },
        auth,
      ),
    );
    expect(tagged.status).toBe(200);

    const untagged = await api(
      '/api/livestock',
      json('POST', { earNumber: 'S-101', species: 'GOAT', gender: 'MALE' }, auth),
    );
    expect(untagged.status).toBe(200);

    const badSecret = await api(
      '/api/devices/scans',
      json('POST', { readerId, secret: 'wrong-secret', scans: [{ epc: 'E280-SUMMARY-1' }] }),
    );
    expect(badSecret.status).toBe(401);

    const ingest = await api(
      '/api/devices/scans',
      json('POST', {
        readerId,
        secret: 'device-secret-123',
        scans: [
          { epc: 'e280-summary-1', direction: 'ENTER', scannedAt: `${countDate}T00:00:00.000Z` },
          { epc: 'E280-SUMMARY-1', direction: 'EXIT', scannedAt: `${countDate}T00:00:10.000Z` },
          {
            epc: 'E280-SUMMARY-UNKNOWN',
            direction: 'EXIT',
            scannedAt: `${countDate}T00:01:00.000Z`,
          },
        ],
      }),
    );
    expect(ingest.status).toBe(200);
    expect(ingest.body.data).toMatchObject({
      accepted: 3,
      inserted: 2,
      duplicates: 1,
      known: 1,
      unknown: 1,
      unknownEpcs: ['E280-SUMMARY-UNKNOWN'],
    });

    const summary = await api(`/api/counts/daily?date=${countDate}`, authorized(auth));
    expect(summary.status).toBe(200);
    expect(summary.body.data).toMatchObject({
      date: countDate,
      totalLivestock: 2,
      scannedLivestock: 1,
      unscannedLivestock: 1,
      entered: 1,
      exited: 1,
      unknown: 1,
      unknownEpcs: ['E280-SUMMARY-UNKNOWN'],
    });
    expect(summary.body.data.lastScan).toMatchObject({
      epc: 'E280-SUMMARY-UNKNOWN',
      readerId,
      direction: 'EXIT',
    });

    const dashboard = await api('/api/dashboard', authorized(auth));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data).toMatchObject({
      totalLivestock: 2,
      scannedToday: 2,
      readerCount: 1,
      activeReaderCount: 1,
      today: {
        date: countDate,
        totalScans: 2,
        scannedLivestock: 1,
        unscannedLivestock: 1,
        entered: 1,
        exited: 1,
        unknown: 1,
        unknownEpcs: ['E280-SUMMARY-UNKNOWN'],
      },
      readers: [
        {
          id: readerId,
          name: 'Зүүн хаалга',
          location: 'Зүүн хашаа',
          deviceSecretSet: true,
          isActiveToday: true,
        },
      ],
    });
    expect(dashboard.body.data.today.lastScan).toMatchObject({
      epc: 'E280-SUMMARY-UNKNOWN',
      readerId,
      direction: 'EXIT',
      source: 'DEVICE',
    });
    expect(dashboard.body.data.recentScans[0]).toMatchObject({
      epc: 'E280-SUMMARY-UNKNOWN',
      livestock: null,
    });
  });

  it('rejects an invalid batch', async () => {
    const tokens = await registerAndLogin('99210011');
    const auth = tokens.accessToken;

    const empty = await api('/api/scans', json('POST', { scans: [] }, auth));
    expect(empty.status).toBe(400);

    const badDirection = await api(
      '/api/scans',
      json('POST', { scans: [{ epc: 'E280-0001', direction: 'LEFT' }] }, auth),
    );
    expect(badDirection.status).toBe(400);
  });

  it('auto-creates a reader referenced by a scan instead of failing the insert', async () => {
    const tokens = await registerAndLogin('99245566');
    const auth = tokens.accessToken;

    const ingest = await api(
      '/api/scans',
      json('POST', { scans: [{ epc: 'E280-7777', readerId: 'never-registered-01' }] }, auth),
    );
    expect(ingest.status).toBe(200);
    expect(ingest.body.data.accepted).toBe(1);

    const recent = await api('/api/scans', authorized(auth));
    expect(recent.body.data[0].reader).toEqual({ id: 'never-registered-01', name: 'RFID уншигч' });
  });

  it("stores the scan without a reader link when the reader belongs to another user", async () => {
    const ownerTokens = await registerAndLogin('99256611');
    await api(
      '/api/devices/readers',
      json('POST', { id: 'shared-reader-01', name: 'Original owner' }, ownerTokens.accessToken),
    );

    const otherTokens = await registerAndLogin('99267722');
    const ingest = await api(
      '/api/scans',
      json('POST', { scans: [{ epc: 'E280-8888', readerId: 'shared-reader-01' }] }, otherTokens.accessToken),
    );
    expect(ingest.status).toBe(200);

    const recent = await api('/api/scans', authorized(otherTokens.accessToken));
    expect(recent.body.data[0].reader).toBeNull();
  });

  it('returns real reader metadata and enforces livestock ownership in scan history', async () => {
    const owner = await registerAndLogin('99410011');
    const created = await api(
      '/api/livestock',
      json(
        'POST',
        { earNumber: 'SCAN-1', species: 'SHEEP', gender: 'FEMALE', rfidEpc: 'E280-SCAN-HISTORY' },
        owner.accessToken,
      ),
    );
    const livestockId = created.body.data.id;

    await api(
      '/api/devices/readers',
      json('POST', { id: 'history-reader-1', name: 'Зүүн хаалганы уншигч' }, owner.accessToken),
    );
    await api(
      '/api/scans',
      json(
        'POST',
        { scans: [{ epc: 'e280-scan-history', readerId: 'history-reader-1', direction: 'ENTER' }] },
        owner.accessToken,
      ),
    );

    const history = await api(`/api/livestock/${livestockId}/scans`, authorized(owner.accessToken));
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].reader).toEqual({
      id: 'history-reader-1',
      name: 'Зүүн хаалганы уншигч',
    });

    const other = await registerAndLogin('99410022');
    const hidden = await api(`/api/livestock/${livestockId}/scans`, authorized(other.accessToken));
    expect(hidden.status).toBe(404);
  });
});

describe('push tokens', () => {
  it('registers and upserts a push token', async () => {
    const tokens = await registerAndLogin('99134455');
    const auth = tokens.accessToken;

    const first = await api(
      '/api/devices/push-token',
      json('POST', { token: 'ExponentPushToken[abc123]', platform: 'android' }, auth),
    );
    expect(first.status).toBe(200);

    const second = await api(
      '/api/devices/push-token',
      json('POST', { token: 'ExponentPushToken[abc123]', platform: 'ios' }, auth),
    );
    expect(second.status).toBe(200);
  });
});

describe('uploads', () => {
  it('rejects non-image files', async () => {
    const tokens = await registerAndLogin('99223344');

    const form = new FormData();
    form.append('file', new File(['hello'], 'note.txt', { type: 'text/plain' }));
    const res = await api('/api/uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: form,
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects files larger than 5MB', async () => {
    const tokens = await registerAndLogin('99224455');

    const form = new FormData();
    form.append(
      'file',
      new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' }),
    );
    const res = await api('/api/uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: form,
    });
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });
});

describe('admin', () => {
  it('rejects non-admin users', async () => {
    const tokens = await registerAndLogin('99145566');
    const res = await api('/api/admin/statistics', authorized(tokens.accessToken));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('rejects non-admins from the tag registry and dealer registration endpoints', async () => {
    const tokens = await registerAndLogin('99245566');
    const auth = tokens.accessToken;

    const tags = await api('/api/admin/tags', authorized(auth));
    expect(tags.status).toBe(403);

    const unlock = await api('/api/admin/tags/HH-0001/unlock', { method: 'PATCH', headers: { Authorization: `Bearer ${auth}` } });
    expect(unlock.status).toBe(403);

    const registrations = await api('/api/admin/dealer-registrations', authorized(auth));
    expect(registrations.status).toBe(403);

    const decide = await api(
      '/api/admin/dealer-registrations/does-not-exist',
      json('PATCH', { status: 'APPROVED' }, auth),
    );
    expect(decide.status).toBe(403);
  });
});

describe('movement history', () => {
  it('reports point totals and an added count over the range', async () => {
    const tokens = await registerAndLogin('99256677');
    const auth = tokens.accessToken;

    await api('/api/livestock', json('POST', { earNumber: 'H-1', species: 'SHEEP', gender: 'FEMALE' }, auth));
    await api('/api/livestock', json('POST', { earNumber: 'H-2', species: 'SHEEP', gender: 'MALE' }, auth));

    const res = await api('/api/reports/history?range=7d', authorized(auth));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.points)).toBe(true);
    expect(res.body.data.points.length).toBeGreaterThan(0);
    expect(res.body.data.points.at(-1).total).toBe(2);
    expect(res.body.data.added).toBe(2);
  });

  it('records deletion as a removal and keeps historical totals consistent', async () => {
    const tokens = await registerAndLogin('99257788');
    const auth = tokens.accessToken;
    const first = await api('/api/livestock', json('POST', { earNumber: 'HR-1', species: 'SHEEP', gender: 'FEMALE' }, auth));
    await api('/api/livestock', json('POST', { earNumber: 'HR-2', species: 'GOAT', gender: 'MALE' }, auth));
    await api(`/api/livestock/${first.body.data.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth}` } });

    const history = await api('/api/reports/history?range=7d', authorized(auth));
    expect(history.body.data.added).toBe(2);
    expect(history.body.data.removed).toBe(1);
    expect(history.body.data.todayDelta).toBe(1);
    expect(history.body.data.points.at(-1).total).toBe(1);
  });

  it('falls back to 7d for an unknown range', async () => {
    const tokens = await registerAndLogin('99267788');
    const res = await api('/api/reports/history?range=nonsense', authorized(tokens.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.points.length).toBeLessThanOrEqual(8);
  });
});

describe('livestock location', () => {
  it('sets and returns latitude/longitude', async () => {
    const tokens = await registerAndLogin('99278899');
    const auth = tokens.accessToken;

    const created = await api('/api/livestock', json('POST', { earNumber: 'L-1', species: 'SHEEP', gender: 'MALE' }, auth));
    const id = created.body.data.id;
    expect(created.body.data.location).toBeNull();

    const located = await api(
      `/api/livestock/${id}/location`,
      json('PATCH', { latitude: 47.918, longitude: 106.917 }, auth),
    );
    expect(located.status).toBe(200);
    expect(located.body.data.location).toMatchObject({ latitude: 47.918, longitude: 106.917 });
    expect(located.body.data.location.updatedAt).toBeTruthy();
  });

  it('rejects out-of-range coordinates', async () => {
    const tokens = await registerAndLogin('99289900');
    const auth = tokens.accessToken;
    const created = await api('/api/livestock', json('POST', { earNumber: 'L-2', species: 'SHEEP', gender: 'MALE' }, auth));
    const id = created.body.data.id;

    const res = await api(
      `/api/livestock/${id}/location`,
      json('PATCH', { latitude: 999, longitude: 0 }, auth),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for another user\'s livestock', async () => {
    const ownerTokens = await registerAndLogin('99290011');
    const created = await api(
      '/api/livestock',
      json('POST', { earNumber: 'L-3', species: 'SHEEP', gender: 'MALE' }, ownerTokens.accessToken),
    );
    const id = created.body.data.id;

    const otherTokens = await registerAndLogin('99201122');
    const res = await api(
      `/api/livestock/${id}/location`,
      json('PATCH', { latitude: 1, longitude: 1 }, otherTokens.accessToken),
    );
    expect(res.status).toBe(404);
  });
});

describe('rfid tag registry', () => {
  it('reports AVAILABLE for a tag never seen before', async () => {
    const tokens = await registerAndLogin('99212233');
    const res = await api('/api/rfid/tags/HH-9999', authorized(tokens.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ epc: 'HH-9999', status: 'AVAILABLE' });
  });

  it('claims a tag and locks it to the claiming user', async () => {
    const tokens = await registerAndLogin('99223311');
    const auth = tokens.accessToken;

    const claimed = await api('/api/rfid/tags/claim', json('POST', { epc: 'HH-1001' }, auth));
    expect(claimed.status).toBe(200);
    expect(claimed.body.data.status).toBe('LOCKED');
    expect(claimed.body.data.claimedByUserId).toBe(tokens.user.id);

    const fetched = await api('/api/rfid/tags/HH-1001', authorized(auth));
    expect(fetched.body.data.status).toBe('LOCKED');
  });

  it('rejects claiming a tag another user already locked', async () => {
    const first = await registerAndLogin('99234411');
    await api('/api/rfid/tags/claim', json('POST', { epc: 'HH-2002' }, first.accessToken));

    const second = await registerAndLogin('99245511');
    const res = await api('/api/rfid/tags/claim', json('POST', { epc: 'HH-2002' }, second.accessToken));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TAG_ALREADY_CLAIMED');
  });

  it('lets the same user re-claim their own tag without conflict', async () => {
    const tokens = await registerAndLogin('99256611');
    const auth = tokens.accessToken;
    await api('/api/rfid/tags/claim', json('POST', { epc: 'HH-3003' }, auth));
    const again = await api('/api/rfid/tags/claim', json('POST', { epc: 'HH-3003' }, auth));
    expect(again.status).toBe(200);
  });

  it('normalizes tag EPC casing across claim and lookup', async () => {
    const tokens = await registerAndLogin('99420011');
    const claimed = await api(
      '/api/rfid/tags/claim',
      json('POST', { epc: 'hh-5005' }, tokens.accessToken),
    );
    expect(claimed.body.data.epc).toBe('HH-5005');

    const fetched = await api('/api/rfid/tags/hh-5005', authorized(tokens.accessToken));
    expect(fetched.body.data).toMatchObject({ epc: 'HH-5005', status: 'LOCKED' });
  });
});

describe('dealer registrations', () => {
  it('creates a pending request', async () => {
    const tokens = await registerAndLogin('99267711');
    const res = await api(
      '/api/dealer-registrations',
      json(
        'POST',
        { orgName: 'Баянгол Малын Хоршоо', contact: 'Б.Дамдин, 9911-2233', prefixRequested: 'EXT-' },
        tokens.accessToken,
      ),
    );
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.orgName).toBe('Баянгол Малын Хоршоо');

    const mine = await api('/api/dealer-registrations/me', authorized(tokens.accessToken));
    expect(mine.status).toBe(200);
    expect(mine.body.data.id).toBe(res.body.data.id);

    const duplicate = await api(
      '/api/dealer-registrations',
      json('POST', { orgName: 'Давхардсан', contact: '1', prefixRequested: 'DUP-' }, tokens.accessToken),
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('REGISTRATION_EXISTS');
  });

  it('rejects an incomplete request', async () => {
    const tokens = await registerAndLogin('99278811');
    const res = await api(
      '/api/dealer-registrations',
      json('POST', { orgName: '', contact: '', prefixRequested: '' }, tokens.accessToken),
    );
    expect(res.status).toBe(400);
  });

  it('promotes the requester to DEALER when an admin approves the request', async () => {
    const requester = await registerAndLogin('99430011');
    const registration = await api(
      '/api/dealer-registrations',
      json(
        'POST',
        { orgName: 'Хэнтий хоршоо', contact: '99430011', prefixRequested: 'EXT-' },
        requester.accessToken,
      ),
    );

    const admin = await registerAndLogin('99430022');
    await makeAdmin(admin.user.id);
    const decided = await api(
      `/api/admin/dealer-registrations/${registration.body.data.id}`,
      json('PATCH', { status: 'APPROVED' }, admin.accessToken),
    );
    expect(decided.status).toBe(200);
    expect(decided.body.data.status).toBe('APPROVED');

    const me = await api('/api/auth/me', authorized(requester.accessToken));
    expect(me.body.data.role).toBe('DEALER');

    const dealerFarmers = await api('/api/dealer/farmers', authorized(requester.accessToken));
    expect(dealerFarmers.status).toBe(200);

    const repeated = await api(
      `/api/admin/dealer-registrations/${registration.body.data.id}`,
      json('PATCH', { status: 'REJECTED' }, admin.accessToken),
    );
    expect(repeated.status).toBe(409);
    expect(repeated.body.code).toBe('REGISTRATION_ALREADY_DECIDED');
  });
});

describe('dealer farmers', () => {
  it('rejects non-dealer users from all farmer-management endpoints', async () => {
    const tokens = await registerAndLogin('99312233');
    const auth = tokens.accessToken;

    const list = await api('/api/dealer/farmers', authorized(auth));
    expect(list.status).toBe(403);

    const add = await api(
      '/api/dealer/farmers',
      json('POST', { phoneNumber: '99000001', name: 'Бат' }, auth),
    );
    expect(add.status).toBe(403);

    const remove = await api('/api/dealer/farmers/does-not-exist', { method: 'DELETE', headers: { Authorization: `Bearer ${auth}` } });
    expect(remove.status).toBe(403);
  });

  it('adds a new farmer by phone number and lists it back', async () => {
    const dealerTokens = await registerAndLogin('99323344');
    await makeDealer(dealerTokens.user.id);
    const auth = dealerTokens.accessToken;

    const added = await api(
      '/api/dealer/farmers',
      json('POST', { phoneNumber: '99334455', name: 'Б.Дорж', aimag: 'Төв', sum: 'Зуунмод' }, auth),
    );
    expect(added.status).toBe(200);
    expect(added.body.data).toMatchObject({
      phoneNumber: '99334455',
      name: 'Б.Дорж',
      aimag: 'Төв',
      sum: 'Зуунмод',
      status: 'ACTIVE',
      livestockCount: 0,
    });

    const list = await api('/api/dealer/farmers', authorized(auth));
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].phoneNumber).toBe('99334455');

    const farmerLogin = await registerAndLogin('99334455');
    expect(farmerLogin.requiresProfileSetup).toBe(false);
    expect(farmerLogin.user.name).toBe('Б.Дорж');
  });

  it('links an already-registered farmer instead of duplicating them', async () => {
    const dealerTokens = await registerAndLogin('99345566');
    await makeDealer(dealerTokens.user.id);
    const auth = dealerTokens.accessToken;

    const existingFarmer = await registerAndLogin('99356677');

    const added = await api(
      '/api/dealer/farmers',
      json('POST', { phoneNumber: '99356677', name: 'Ц.Сараа', aimag: 'Сэлэнгэ' }, auth),
    );
    expect(added.status).toBe(200);
    expect(added.body.data.id).toBe(existingFarmer.user.id);
    expect(added.body.data.aimag).toBe('Сэлэнгэ');
  });

  it('rejects linking a farmer already managed by another dealer', async () => {
    const dealerA = await registerAndLogin('99367788');
    await makeDealer(dealerA.user.id);
    await api(
      '/api/dealer/farmers',
      json('POST', { phoneNumber: '99378899', name: 'Farmer A' }, dealerA.accessToken),
    );

    const dealerB = await registerAndLogin('99389900');
    await makeDealer(dealerB.user.id);
    const res = await api(
      '/api/dealer/farmers',
      json('POST', { phoneNumber: '99378899', name: 'Farmer A' }, dealerB.accessToken),
    );
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('FARMER_ALREADY_LINKED');
  });

  it('removes a farmer by unlinking without deleting the user', async () => {
    const dealerTokens = await registerAndLogin('99390011');
    await makeDealer(dealerTokens.user.id);
    const auth = dealerTokens.accessToken;

    const added = await api(
      '/api/dealer/farmers',
      json('POST', { phoneNumber: '99301122', name: 'Х.Мөнх' }, auth),
    );
    const farmerId = added.body.data.id;

    const removed = await api(`/api/dealer/farmers/${farmerId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth}` } });
    expect(removed.status).toBe(200);
    expect(removed.body.data.removed).toBe(true);

    const list = await api('/api/dealer/farmers', authorized(auth));
    expect(list.body.data.items).toHaveLength(0);

    const farmerLogin = await registerAndLogin('99301122');
    expect(farmerLogin.user.name).toBe('Х.Мөнх');
  });

  it('returns 404 when removing a farmer not managed by this dealer', async () => {
    const dealerA = await registerAndLogin('99312244');
    await makeDealer(dealerA.user.id);
    const added = await api(
      '/api/dealer/farmers',
      json('POST', { phoneNumber: '99323355', name: 'Farmer' }, dealerA.accessToken),
    );
    const farmerId = added.body.data.id;

    const dealerB = await registerAndLogin('99334466');
    await makeDealer(dealerB.user.id);
    const res = await api(`/api/dealer/farmers/${farmerId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${dealerB.accessToken}` } });
    expect(res.status).toBe(404);
  });
});
