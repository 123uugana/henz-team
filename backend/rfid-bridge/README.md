# RFID bridge

Connects the two Hopeland UHF readers to the backend and forwards every tag
read to `POST /api/devices/scans`:

- **HL7202K8** — Bluetooth UHF handheld reader (Indy R2000)
  https://www.hopelandrfid.com/product/Handheld-and-PDA-Bluetooth-UHF-Handheld-Reader.html
- **Wing HY820** — Android handheld/PDA reader (Impinj E710)
  https://www.hopelandrfid.com/product/handheld-and-PDA-rfid-reader-wing-HY820.html

It's a Windows/Linux/macOS PC script built on the vendor's official
`RFIDReaderAPI` Python SDK (`PythonSDK_V1.5_20260123.zip` at the repo root).
It runs both reader connections concurrently, batches tag reads for ~1.5s,
and POSTs them as scans.

## 1. Install the vendor SDK

```bash
# from the repo root
unzip PythonSDK_V1.5_20260123.zip -d backend/rfid-bridge/vendor
pip install -r backend/rfid-bridge/requirements.txt
pip install backend/rfid-bridge/vendor/libs/RFIDReaderAPI-1.5-py3-none-any.whl
```

## 2. Register both readers on the backend

Each reader needs an id + secret registered against your account (any logged
in user works; readers stay linked to the user that registered them). Sub in
your bearer token and a strong per-device secret:

```bash
BASE=http://127.0.0.1:8787
AUTH="Authorization: Bearer <your access token>"

curl -X POST $BASE/api/devices/readers -H "$AUTH" -H 'Content-Type: application/json' -d '{
  "id": "hl7202k8-01",
  "name": "HL7202K8 Bluetooth reader",
  "deviceSecret": "change-me-hl7202k8-secret"
}'

curl -X POST $BASE/api/devices/readers -H "$AUTH" -H 'Content-Type: application/json' -d '{
  "id": "hy820-01",
  "name": "Wing HY820 PDA",
  "deviceSecret": "change-me-hy820-secret"
}'
```

## 3. Configure

```bash
cp backend/rfid-bridge/.env.example backend/rfid-bridge/.env
```

Fill in `BACKEND_URL` and match the reader ids/secrets to what you just
registered, then set each device's connection string.

### HL7202K8 (Bluetooth)

1. Pair it in Windows Settings > Bluetooth & devices as you would any SPP
   device.
2. Open Device Manager > Ports (COM & LPT) and note the
   "Standard Serial over Bluetooth link (COMx)" port it was assigned.
3. Set `READER_HL7202K8_CONNECTION=Serial:COM<x>:115200` (115200 is the
   reader's default baud rate; lower it if the connection is flaky).

### Wing HY820 (Android PDA)

The HY820 is a full Android device, not a plain peripheral — it runs its own
reader firmware/app. There are two ways to get its scans into the backend:

- **Preferred, no PC needed:** put the HY820's onboard reader app into its
  HTTP-push mode and point it directly at
  `POST {BACKEND_URL}/api/devices/scans` with body
  `{"readerId":"hy820-01","secret":"...","scans":[{"epc":"..."}]}`. This is
  what the backend's `/api/devices/readers` + `/api/devices/scans` pair was
  built for (see `backend/worker/README.md`), and it works over Wi-Fi/4G
  without this bridge script running at all.
- **Via this bridge:** if you'd rather drive it from a PC, put the HY820's
  reader module into TCP-server mode on the same Wi-Fi network as this
  machine (check the on-device RFID app's connection settings for its IP and
  port), then set `READER_HY820_CONNECTION=TCP:<device-ip>:<port>` (the SDK's
  own demos default to port `9090`).

Set `READER_HY820_ENABLED=false` in `.env` if you're using the direct
HTTP-push route instead.

## 4. Run

```bash
python backend/rfid-bridge/rfid_bridge.py
```

Each configured reader connects, starts continuous inventory, and its tag
reads are batched and uploaded every `UPLOAD_INTERVAL_SECONDS`. Console
output shows connect/disconnect events and upload results; scans are
retried automatically if a connection drops or an upload fails. Ctrl+C stops
both readers cleanly.
