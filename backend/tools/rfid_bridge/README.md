# HH100 Cloudflare RFID Bridge

This bridge connects a Hopeland HH100 / PC RFID reader to the Worker endpoint:

`POST /api/rfid/scan`

The Cloudflare Worker stores scans in D1. The SDK cannot run inside a Worker because it needs local TCP/serial/USB access to the reader, so this bridge runs on a PC or on the Android handheld environment and forwards reads over HTTPS.

## SDK Choice

- `PythonSDK_V1.5_20260123.zip` is the best fit for a quick local bridge. It supports TCP client and TCP server modes and exposes EPC, RSSI, antenna, reader name/SN, and read time.
- `PCReaderJava_V2.11_` is useful for a Java/Android app later, but adding a native Android app is a larger separate change.
- `Linux_c_api_1.1.2.2.zip` is for embedded Linux or native C services.
- `PC reader SDK 4.57-net-C#.zip` downloaded as a tiny archive and did not extract usable files.

## Setup on Windows

Run from `backend`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\rfid_bridge\install-sdk.ps1
Copy-Item .\tools\rfid_bridge\.env.example .\tools\rfid_bridge\.env
notepad .\tools\rfid_bridge\.env
```

Set `RFID_DEVICE_KEY` to the same value you saved with:

```powershell
npx.cmd wrangler secret put RFID_DEVICE_KEY --config wrangler.toml
```

Do not commit `tools/rfid_bridge/.env`.

## Server Mode

Use this when the reader/HH100 connects to the PC.

`.env`:

```ini
RFID_CONNECT_MODE=server
RFID_SERVER_HOST=0.0.0.0
RFID_SERVER_PORT=9090
RFID_READER_ID=hh100-raw-01
RFID_INVENTORY_RETRY_SECONDS=5
RFID_SEND_INVENTORY_COMMAND=true
```

Start:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\rfid_bridge\run-bridge.ps1
```

On the HH100, configure TCP Client / DeviceConnection to the PC LAN IP and port `9090`, then start inventory/read tags.

If the bridge connects but shows `inventory start: EReaderResult.RT_TIMEOUT_ERR`, keep the bridge running and press Read/Inventory on the HH100. If the HH100 app uploads tags by itself and does not accept PC inventory commands, set:

```ini
RFID_SEND_INVENTORY_COMMAND=false
```

## Client Mode

Use this when the PC can connect to the reader IP and port.

`.env`:

```ini
RFID_CONNECT_MODE=client
RFID_READER_CONN=TCP:192.168.1.116:9090
RFID_READER_ID=hh100-raw-01
```

Start:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\rfid_bridge\run-bridge.ps1
```

## Verify Cloudflare

In another terminal:

```powershell
npx.cmd wrangler tail hents-hurga-api --config wrangler.toml
```

Read one ear tag. You should see `[RFID] Received scan` in Worker logs, then D1 rows in `rfid_scans`.
