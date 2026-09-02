#!/usr/bin/env python3
"""
Hopeland HH100 / PC RFID reader bridge.

This process talks to the Hopeland Python SDK, reads EPC tags, and forwards
each read to the Cloudflare Worker POST /api/rfid/scan endpoint.
"""

from __future__ import annotations

import argparse
import json
import os
import queue
import signal
import sys
import threading
import time
from dataclasses import dataclass
from typing import Any
from urllib import error, parse, request


try:
    from com.rfid.Reader import Reader
    from com.rfid.enumeration import EReaderEnum, EReaderResult
    from com.rfid.interface import IAsynchronousMessage
    from com.rfid.models import ReaderInfo_Model, ReaderWorkingAntSet_Model
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Hopeland RFIDReaderAPI is not installed. Run tools/rfid_bridge/install-sdk.ps1 first."
    ) from exc


DEFAULT_WORKER_URL = "https://hents-hurga-api.uuganbayrxx0716.workers.dev/api/rfid/scan"


@dataclass(frozen=True)
class BridgeConfig:
    worker_url: str
    device_key: str
    reader_id: str
    mode: str
    reader_conn: str
    server_host: str
    server_port: str
    antennas: list[int]
    inventory_seconds: float
    inventory_retry_seconds: float
    send_inventory_command: bool
    post_timeout_seconds: float


def load_dotenv(path: str) -> None:
    if not os.path.exists(path):
        return

    with open(path, "r", encoding="utf-8") as file:
        for raw_line in file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def env_value(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def int_list(value: str) -> list[int]:
    values: list[int] = []
    for item in value.split(","):
        item = item.strip()
        if not item:
            continue
        values.append(int(item))
    return values or [1]


def bool_value(value: str, default: bool) -> bool:
    if not value:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def read_config() -> BridgeConfig:
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    mode = env_value("RFID_CONNECT_MODE", "server").lower()
    if mode not in {"server", "client"}:
        raise SystemExit("RFID_CONNECT_MODE must be server or client.")

    device_key = env_value("RFID_DEVICE_KEY")
    if not device_key:
        raise SystemExit("RFID_DEVICE_KEY is required in tools/rfid_bridge/.env or environment.")

    reader_id = env_value("RFID_READER_ID", "hh100-raw-01")
    if not reader_id:
        raise SystemExit("RFID_READER_ID is required.")

    return BridgeConfig(
        worker_url=env_value("RFID_WORKER_URL", DEFAULT_WORKER_URL),
        device_key=device_key,
        reader_id=reader_id,
        mode=mode,
        reader_conn=env_value("RFID_READER_CONN", "TCP:192.168.1.116:9090"),
        server_host=env_value("RFID_SERVER_HOST", "0.0.0.0"),
        server_port=env_value("RFID_SERVER_PORT", "9090"),
        antennas=int_list(env_value("RFID_ANTENNAS", "1")),
        inventory_seconds=float(env_value("RFID_INVENTORY_SECONDS", "0")),
        inventory_retry_seconds=float(env_value("RFID_INVENTORY_RETRY_SECONDS", "5")),
        send_inventory_command=bool_value(env_value("RFID_SEND_INVENTORY_COMMAND", "true"), True),
        post_timeout_seconds=float(env_value("RFID_POST_TIMEOUT_SECONDS", "10")),
    )


def build_worker_url(config: BridgeConfig) -> str:
    parsed = parse.urlsplit(config.worker_url)
    query = dict(parse.parse_qsl(parsed.query, keep_blank_values=True))
    query.setdefault("key", config.device_key)
    query.setdefault("readerId", config.reader_id)
    return parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, parse.urlencode(query), parsed.fragment)
    )


def get_attr(obj: Any, *names: str, default: Any = None) -> Any:
    for name in names:
        if hasattr(obj, name):
            value = getattr(obj, name)
            if value is not None and value != "":
                return value
    return default


def call_if_present(obj: Any, name: str) -> Any:
    method = getattr(obj, name, None)
    if callable(method):
        try:
            return method()
        except Exception:
            return None
    return None


def tag_to_payload(tag: Any, config: BridgeConfig) -> dict[str, Any] | None:
    epc = str(get_attr(tag, "_EPC", "EPC", default="")).strip().upper()
    if not epc:
        return None

    rssi = call_if_present(tag, "RSSI")
    if rssi is None:
        rssi = get_attr(tag, "_RSSI_dB", "_RSSI", default=None)

    antenna = get_attr(tag, "_ANT_NUM", "_Bag", default=None)
    count = get_attr(tag, "_TotalCount", default=1)

    return {
        "EPC": epc,
        "RSSI": rssi,
        "AntennaID": str(antenna) if antenna is not None else None,
        "ReaderID": config.reader_id,
        "ReaderName": get_attr(tag, "_ReaderName", default=None),
        "ReaderSN": get_attr(tag, "_ReaderSN", default=None),
        "Count": int(count or 1),
        "ReadTime": get_attr(tag, "_ReadTime", default=None),
    }


class CloudflareForwarder(IAsynchronousMessage):
    def __init__(self, config: BridgeConfig) -> None:
        self.config = config
        self.worker_url = build_worker_url(config)
        self.reader: Reader | None = None
        self.conn_id = ""
        self.queue: queue.Queue[dict[str, Any] | None] = queue.Queue()
        self.stop_event = threading.Event()
        self.sender = threading.Thread(target=self._send_loop, daemon=True)
        self.sender.start()

    def attach_reader(self, reader: Reader) -> None:
        self.reader = reader

    def _send_loop(self) -> None:
        while not self.stop_event.is_set():
            payload = self.queue.get()
            if payload is None:
                return
            self._post_payload(payload)

    def _post_payload(self, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        req = request.Request(
            self.worker_url,
            data=body,
            method="POST",
            headers={"Content-Type": "application/json"},
        )

        try:
            with request.urlopen(req, timeout=self.config.post_timeout_seconds) as response:
                text = response.read().decode("utf-8", errors="replace")
                print(f"[cloudflare] {payload['EPC']} -> {response.status} {text[:240]}")
        except error.HTTPError as exc:
            text = exc.read().decode("utf-8", errors="replace")
            print(f"[cloudflare] {payload['EPC']} -> HTTP {exc.code} {text[:240]}", file=sys.stderr)
        except Exception as exc:
            print(f"[cloudflare] {payload['EPC']} -> failed: {exc}", file=sys.stderr)

    def shutdown(self) -> None:
        self.stop_event.set()
        self.queue.put(None)
        self.sender.join(timeout=5)

    def OutputTags(self, tag: Any) -> None:
        payload = tag_to_payload(tag, self.config)
        if not payload:
            return
        print(
            "[reader] EPC={EPC} RSSI={RSSI} ANT={AntennaID} Count={Count}".format(**payload)
        )
        self.queue.put(payload)

    def PortConnecting(self, connID: Any) -> None:
        conn_id = str(connID or "")
        self.conn_id = conn_id
        print(f"[reader] connected: {conn_id}")
        if self.reader and conn_id:
            ip = conn_id.split(":")[0]
            try:
                self.reader.setConnID(ip)
            except Exception:
                pass

    def PortClosing(self, connID: Any) -> None:
        print(f"[reader] disconnected: {connID}")

    def OutputTagsOver(self, connID: Any) -> None:
        print(f"[reader] inventory over: {connID}")

    def WriteDebugMsg(self, connID: Any, msg: Any) -> None:
        print(f"[sdk-debug] {connID}: {msg}")

    def WriteLog(self, connID: Any, msg: Any) -> None:
        print(f"[sdk-log] {connID}: {msg}")

    def GPIControlMsg(self, connID: Any, gpi_model: Any) -> None:
        print(f"[reader] GPI {connID}: {gpi_model}")

    def OutputScanData(self, connID: Any, scandata: Any) -> None:
        print(f"[reader] scan data {connID}: {scandata}")


def set_antennas(reader: Reader, antennas: list[int]) -> None:
    ant_plan = ReaderWorkingAntSet_Model(antennas)
    result = reader.paramSet(EReaderEnum.WO_RFIDWorkingAnt, ant_plan)
    print(f"[reader] antenna set {antennas}: {result}")


def print_reader_info(reader: Reader) -> None:
    info = ReaderInfo_Model()
    result = reader.paramGet(EReaderEnum.RO_ReaderInformation, info)
    if str(result) == str(EReaderResult.RT_OK):
        print(
            "[reader] SN={sn} Name={name} Baseband={baseband}".format(
                sn=getattr(info, "readerSN", ""),
                name=getattr(info, "name", ""),
                baseband=getattr(info, "basebandVersion", ""),
            )
        )
    else:
        print(f"[reader] could not read reader info: {result}")


def is_ok(result: Any) -> bool:
    return str(result) == str(EReaderResult.RT_OK)


def run_inventory(reader: Reader, config: BridgeConfig, stop_event: threading.Event) -> None:
    if not config.send_inventory_command:
        print("[reader] inventory command disabled; waiting for reader-uploaded tags.")
        stop_event.wait(config.inventory_seconds if config.inventory_seconds > 0 else None)
        return

    end_at = time.time() + config.inventory_seconds if config.inventory_seconds > 0 else None

    while not stop_event.is_set():
        result = reader.inventory()
        print(f"[reader] inventory start: {result}")

        if is_ok(result):
            stop_event.wait(config.inventory_seconds if config.inventory_seconds > 0 else None)
            return

        print(
            "[reader] inventory did not start; keep the HH100 connected, "
            "then press Read/Inventory on the HH100 or wait for retry."
        )

        if end_at is not None and time.time() >= end_at:
            return

        wait_seconds = max(1.0, config.inventory_retry_seconds)
        if end_at is not None:
            wait_seconds = min(wait_seconds, max(0.0, end_at - time.time()))
        if wait_seconds <= 0:
            return
        stop_event.wait(wait_seconds)


def run_client(config: BridgeConfig, listener: CloudflareForwarder) -> None:
    reader = Reader()
    listener.attach_reader(reader)

    if not reader.initReader(config.reader_conn, listener):
        raise SystemExit(f"Could not connect reader with {config.reader_conn}.")

    print(f"[reader] connected with {config.reader_conn}")
    set_antennas(reader, config.antennas)
    print_reader_info(reader)
    try:
        run_inventory(reader, config, listener.stop_event)
    finally:
        reader.stop()
        reader.closeConnect()


def run_server(config: BridgeConfig, listener: CloudflareForwarder) -> None:
    reader = Reader()
    listener.attach_reader(reader)

    if not reader.openTcpServer(config.server_host, config.server_port, listener):
        raise SystemExit(f"Could not open TCP server {config.server_host}:{config.server_port}.")

    print(f"[reader] TCP server listening on {config.server_host}:{config.server_port}")
    print("[reader] configure HH100 TCP Client to this PC IP and port, then connect.")

    try:
        while not listener.conn_id and not listener.stop_event.wait(0.5):
            pass
        if listener.conn_id:
            set_antennas(reader, config.antennas)
            print_reader_info(reader)
            run_inventory(reader, config, listener.stop_event)
        else:
            listener.stop_event.wait()
    finally:
        reader.stop()
        reader.closeTcpServer()


def main() -> int:
    parser = argparse.ArgumentParser(description="HH100 RFID to Cloudflare bridge")
    parser.add_argument("--print-config", action="store_true", help="Print non-secret config and exit")
    args = parser.parse_args()

    config = read_config()
    if args.print_config:
        safe = {**config.__dict__, "device_key": "***"}
        print(json.dumps(safe, indent=2))
        return 0

    listener = CloudflareForwarder(config)

    def stop(_signum: int, _frame: Any) -> None:
        listener.stop_event.set()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    try:
        if config.mode == "client":
            run_client(config, listener)
        else:
            run_server(config, listener)
    finally:
        listener.shutdown()

    return 0
if __name__ == "__main__":
    raise SystemExit(main())
