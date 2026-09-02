-- Demo data for Cloudflare D1 Studio.
-- Run after migrations. Re-running this file refreshes only demo rows.

DELETE FROM alerts WHERE id LIKE 'alert-demo-%';
DELETE FROM rfid_unknown_epcs WHERE id LIKE 'unknown-demo-%';
DELETE FROM rfid_scans WHERE id LIKE 'scan-demo-%';
DELETE FROM rfid_tags WHERE id LIKE 'tag-demo-%';
DELETE FROM rfid_readers WHERE id IN ('hh100-gate-01', 'hl7202k8-handheld-01');
DELETE FROM livestock WHERE id LIKE 'livestock-demo-%';
DELETE FROM users WHERE id = 'user_demo_1';
DELETE FROM users WHERE id = 'admin_demo_1';

INSERT INTO users (
  id,
  phone_number,
  name,
  role,
  aimag,
  sum,
  status,
  created_at,
  updated_at
) VALUES (
  'user_demo_1',
  '99112233',
  'ууганбаяр',
  'FARMER',
  'Хэнтий',
  'Өндөрхаан',
  'ACTIVE',
  date('now') || 'T00:00:00.000Z',
  date('now') || 'T00:00:00.000Z'
);

INSERT INTO users (
  id,
  phone_number,
  name,
  role,
  aimag,
  sum,
  status,
  created_at,
  updated_at
) VALUES (
  'admin_demo_1',
  '99001122',
  'Admin User',
  'ADMIN',
  'Улаанбаатар',
  'СБД',
  'ACTIVE',
  date('now') || 'T00:00:00.000Z',
  date('now') || 'T00:00:00.000Z'
);

INSERT INTO livestock (
  id,
  user_id,
  ear_number,
  name,
  species,
  gender,
  birth_year,
  color,
  mark_description,
  image_url,
  status,
  created_at,
  updated_at
) VALUES
  (
    'livestock-demo-001',
    'user_demo_1',
    'A-001',
    'Хүрэн үнээ',
    'SHEEP',
    'FEMALE',
    2021,
    'Хүрэн',
    'Баруун чих цагаан тэмдэгтэй',
    NULL,
    'ACTIVE',
    date('now') || 'T00:05:00.000Z',
    date('now') || 'T00:05:00.000Z'
  ),
  (
    'livestock-demo-002',
    'user_demo_1',
    'A-002',
    'Алаг тугал',
    'SHEEP',
    'FEMALE',
    2024,
    'Алаг',
    'Духан дээр цагаан толботой',
    NULL,
    'ACTIVE',
    date('now') || 'T00:06:00.000Z',
    date('now') || 'T00:06:00.000Z'
  ),
  (
    'livestock-demo-003',
    'user_demo_1',
    'A-003',
    'Хар бух',
    'GOAT',
    'MALE',
    2020,
    'Хар',
    'Зүүн эвэр богино',
    NULL,
    'ACTIVE',
    date('now') || 'T00:07:00.000Z',
    date('now') || 'T00:07:00.000Z'
  ),
  (
    'livestock-demo-004',
    'user_demo_1',
    'A-004',
    'Шар үнээ',
    'SHEEP',
    'FEMALE',
    2022,
    'Шар',
    'Сүүлний үзүүр цагаан',
    NULL,
    'MISSING',
    date('now') || 'T00:08:00.000Z',
    date('now') || 'T00:08:00.000Z'
  ),
  (
    'livestock-demo-005',
    'user_demo_1',
    'A-005',
    'Бор тугал',
    'GOAT',
    'UNKNOWN',
    2025,
    'Бор',
    'RFID tag суулгаагүй',
    NULL,
    'ACTIVE',
    date('now') || 'T00:09:00.000Z',
    date('now') || 'T00:09:00.000Z'
  ),
  (
    'livestock-demo-006',
    'user_demo_1',
    'A-006',
    'Цагаан үнээ',
    'SHEEP',
    'FEMALE',
    2021,
    'Цагаан',
    'Хүзүүндээ хар толботой',
    NULL,
    'ACTIVE',
    date('now') || 'T00:10:00.000Z',
    date('now') || 'T00:10:00.000Z'
  );

INSERT INTO rfid_tags (
  id,
  user_id,
  livestock_id,
  epc,
  created_at,
  updated_at
) VALUES
  (
    'tag-demo-001',
    'user_demo_1',
    'livestock-demo-001',
    'E280116060000209ABCDE001',
    date('now') || 'T00:15:00.000Z',
    date('now') || 'T00:15:00.000Z'
  ),
  (
    'tag-demo-002',
    'user_demo_1',
    'livestock-demo-002',
    'E280116060000209ABCDE002',
    date('now') || 'T00:16:00.000Z',
    date('now') || 'T00:16:00.000Z'
  ),
  (
    'tag-demo-003',
    'user_demo_1',
    'livestock-demo-003',
    'E280116060000209ABCDE003',
    date('now') || 'T00:17:00.000Z',
    date('now') || 'T00:17:00.000Z'
  ),
  (
    'tag-demo-004',
    'user_demo_1',
    'livestock-demo-004',
    'E280116060000209ABCDE004',
    date('now') || 'T00:18:00.000Z',
    date('now') || 'T00:18:00.000Z'
  ),
  (
    'tag-demo-006',
    'user_demo_1',
    'livestock-demo-006',
    'E280116060000209ABCDE006',
    date('now') || 'T00:19:00.000Z',
    date('now') || 'T00:19:00.000Z'
  );

INSERT INTO rfid_readers (
  id,
  user_id,
  name,
  location,
  device_secret_hash,
  created_at,
  updated_at
) VALUES
  (
    'hh100-gate-01',
    'user_demo_1',
    'HH100 gate reader',
    'Зүүн хаалга',
    'azlYEYnpxkv4foxmzM02Ziy49NVG2l6wQsc1WT9k_Co',
    date('now') || 'T00:20:00.000Z',
    date('now') || 'T00:20:00.000Z'
  ),
  (
    'hl7202k8-handheld-01',
    'user_demo_1',
    'HL7202K8 handheld reader',
    'Гар уншигч',
    NULL,
    date('now') || 'T00:21:00.000Z',
    date('now') || 'T00:21:00.000Z'
  );

INSERT INTO rfid_scans (
  id,
  user_id,
  livestock_id,
  reader_id,
  epc,
  direction,
  source,
  duplicate_of_scan_id,
  scanned_at
) VALUES
  (
    'scan-demo-001',
    'user_demo_1',
    'livestock-demo-001',
    'hh100-gate-01',
    'E280116060000209ABCDE001',
    'ENTER',
    'DEVICE',
    NULL,
    date('now') || 'T08:10:00.000Z'
  ),
  (
    'scan-demo-002',
    'user_demo_1',
    'livestock-demo-002',
    'hh100-gate-01',
    'E280116060000209ABCDE002',
    'ENTER',
    'DEVICE',
    NULL,
    date('now') || 'T08:12:00.000Z'
  ),
  (
    'scan-demo-003',
    'user_demo_1',
    'livestock-demo-003',
    'hh100-gate-01',
    'E280116060000209ABCDE003',
    'EXIT',
    'DEVICE',
    NULL,
    date('now') || 'T10:34:00.000Z'
  ),
  (
    'scan-demo-004',
    'user_demo_1',
    'livestock-demo-006',
    'hl7202k8-handheld-01',
    'E280116060000209ABCDE006',
    'UNKNOWN',
    'APP',
    NULL,
    date('now') || 'T13:05:00.000Z'
  ),
  (
    'scan-demo-005',
    'user_demo_1',
    NULL,
    'hh100-gate-01',
    'E280116060000209ABCDE999',
    'ENTER',
    'DEVICE',
    NULL,
    date('now') || 'T13:15:00.000Z'
  );

INSERT INTO rfid_unknown_epcs (
  id,
  user_id,
  epc,
  reader_id,
  first_seen_at,
  last_seen_at,
  seen_count
) VALUES (
  'unknown-demo-001',
  'user_demo_1',
  'E280116060000209ABCDE999',
  'hh100-gate-01',
  date('now') || 'T13:15:00.000Z',
  date('now') || 'T13:15:00.000Z',
  1
);

INSERT INTO alerts (
  id,
  user_id,
  livestock_id,
  type,
  title,
  message,
  is_read,
  created_at
) VALUES
  (
    'alert-demo-001',
    'user_demo_1',
    'livestock-demo-004',
    'MISSING',
    'Мал олдохгүй байна',
    'A-004 дугаартай Шар үнээ өнөөдөр уншигдаагүй байна.',
    0,
    date('now') || 'T14:00:00.000Z'
  ),
  (
    'alert-demo-002',
    'user_demo_1',
    NULL,
    'SYSTEM',
    'Танихгүй EPC уншигдлаа',
    'E280116060000209ABCDE999 tag-ийг малтай холбоорой.',
    0,
    date('now') || 'T14:05:00.000Z'
  );
