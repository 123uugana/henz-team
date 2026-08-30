"""
Lists serial (COM) ports so you can spot which one a newly Bluetooth-paired
reader was assigned.

Usage: pair the reader in Windows Bluetooth settings first, then run this.
Ports whose description mentions "Bluetooth" are the SPP links Windows
creates for paired devices - one of them is your reader.
"""
from serial.tools import list_ports

ports = list(list_ports.comports())

if not ports:
    print("No COM ports found.")
else:
    for port in sorted(ports, key=lambda p: p.device):
        marker = " <- Bluetooth" if "bluetooth" in (port.description or "").lower() else ""
        print(f"{port.device}\t{port.description}\t{port.hwid}{marker}")
