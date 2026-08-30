"""
Bridges Hopeland UHF RFID readers to the henz-team backend.

Connects to readers using the vendor "RFIDReaderAPI" Python SDK
(PythonSDK_V1.5_20260123.zip at the repo root -> libs/RFIDReaderAPI-1.5-py3-none-any.whl)
and forwards every tag read to `POST {BACKEND_URL}/api/devices/scans`.

Configured out of the box for the two hopelandrfid.com devices:
  - HL7202K8  Bluetooth UHF handheld reader (paired -> Windows COM port)
  - Wing HY820  Android handheld/PDA reader (Wi-Fi TCP)

See README.md in this folder for setup instructions.
"""
from __future__ import annotations

import os
import queue
import signal
import sys
import threading
import time
from dataclasses import dataclass

import requests
from dotenv import load_dotenv

from com.rfid.Reader import Reader
from com.rfid.interface import IAsynchronousMessage
from com.rfid.enumeration.EReaderResult import EReaderResult

load_dotenv()

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8787").rstrip("/")
UPLOAD_INTERVAL_SECONDS = float(os.environ.get("UPLOAD_INTERVAL_SECONDS", "1.5"))
RECONNECT_DELAY_SECONDS = 5.0
HTTP_TIMEOUT_SECONDS = 5

shutdown_event = threading.Event()


@dataclass
class ReaderConfig:
    label: str
    reader_id: str
    secret: str
    connection: str


def load_reader_configs() -> list[ReaderConfig]:
    configs: list[ReaderConfig] = []
    for prefix, label in (("READER_HL7202K8", "HL7202K8"), ("READER_HY820", "Wing HY820")):
        if os.environ.get(f"{prefix}_ENABLED", "true").lower() not in ("1", "true", "yes"):
            continue
        reader_id = os.environ.get(f"{prefix}_ID")
        secret = os.environ.get(f"{prefix}_SECRET")
        connection = os.environ.get(f"{prefix}_CONNECTION")
        if not (reader_id and secret and connection):
            print(f"[{label}] skipped: missing {prefix}_ID / _SECRET / _CONNECTION in .env")
            continue
        configs.append(ReaderConfig(label=label, reader_id=reader_id, secret=secret, connection=connection))
    return configs


class TagSink(IAsynchronousMessage):
    """Receives async callbacks from one Reader connection and queues tag reads for upload."""

    def __init__(self, label: str):
        self.label = label
        self.tag_queue: "queue.Queue[dict]" = queue.Queue()
        self.connected = threading.Event()

    def WriteDebugMsg(self, connID, msg):
        pass

    def WriteLog(self, connID, msg):
        pass

    def PortConnecting(self, connID):
        print(f"[{self.label}] connecting: {connID}")

    def PortClosing(self, connID):
        print(f"[{self.label}] disconnected: {connID}")
        self.connected.clear()

    def OutputTags(self, tag):
        try:
            self.tag_queue.put(
                {
                    "epc": tag._EPC,
                    "antennaId": str(tag._ANT_NUM) if tag._ANT_NUM else None,
                    "rssi": int(tag._RSSI) if tag._RSSI else None,
                }
            )
        except Exception as exc:
            print(f"[{self.label}] failed to read tag: {exc}")

    def OutputTagsOver(self, connID):
        pass

    def GPIControlMsg(self, connID, gpi_model):
        pass

    def OutputScanData(self, connID, scandata):
        pass


def upload_batch(config: ReaderConfig, scans: list[dict]) -> bool:
    payload = {"readerId": config.reader_id, "secret": config.secret, "scans": scans}
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/devices/scans",
            json=payload,
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        print(f"[{config.label}] upload failed: {exc}")
        return False

    if response.status_code >= 300:
        print(f"[{config.label}] upload rejected ({response.status_code}): {response.text[:300]}")
        return False

    body = response.json()
    print(
        f"[{config.label}] uploaded {len(scans)} scan(s): "
        f"{body.get('data', body)}"
    )
    return True


def uploader_loop(config: ReaderConfig, sink: TagSink):
    pending: list[dict] = []
    while not shutdown_event.is_set():
        try:
            item = sink.tag_queue.get(timeout=UPLOAD_INTERVAL_SECONDS)
            pending.append(item)
            while True:
                try:
                    pending.append(sink.tag_queue.get_nowait())
                except queue.Empty:
                    break
        except queue.Empty:
            pass

        if pending:
            if upload_batch(config, pending):
                pending = []
            else:
                time.sleep(1.0)


def reader_loop(config: ReaderConfig):
    sink = TagSink(config.label)
    uploader = threading.Thread(target=uploader_loop, args=(config, sink), daemon=True)
    uploader.start()

    reader = Reader()
    while not shutdown_event.is_set():
        print(f"[{config.label}] connecting to {config.connection} ...")
        if not reader.initReader(config.connection, sink):
            print(f"[{config.label}] connection failed, retrying in {RECONNECT_DELAY_SECONDS}s")
            shutdown_event.wait(RECONNECT_DELAY_SECONDS)
            continue

        sink.connected.set()
        print(f"[{config.label}] connected, starting inventory")
        result = reader.inventory()
        if result != EReaderResult.RT_OK:
            print(f"[{config.label}] inventory start failed: {result}")

        while sink.connected.is_set() and not shutdown_event.is_set():
            shutdown_event.wait(1.0)

        try:
            reader.stop()
            reader.closeConnect()
        except Exception:
            pass

        if not shutdown_event.is_set():
            print(f"[{config.label}] reconnecting in {RECONNECT_DELAY_SECONDS}s")
            shutdown_event.wait(RECONNECT_DELAY_SECONDS)


def main():
    configs = load_reader_configs()
    if not configs:
        print("No readers configured. Copy .env.example to .env and fill in at least one reader.")
        sys.exit(1)

    def handle_sigint(signum, frame):
        print("\nShutting down...")
        shutdown_event.set()

    signal.signal(signal.SIGINT, handle_sigint)

    threads = [threading.Thread(target=reader_loop, args=(config,), daemon=True) for config in configs]
    for t in threads:
        t.start()

    while not shutdown_event.is_set():
        shutdown_event.wait(1.0)

    for t in threads:
        t.join(timeout=5.0)


if __name__ == "__main__":
    main()
