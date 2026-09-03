import { registerPlugin } from "@capacitor/core";

export interface PairedDevice {
  name: string;
  address: string;
}

export interface TagScannedEvent {
  epc: string;
  antenna: number;
  rssi?: number;
}

export interface StatusChangedEvent {
  status: "connected" | "disconnected" | "error";
  message?: string;
}

export interface RfidBluetoothPlugin {
  listPairedDevices(): Promise<{ devices: PairedDevice[] }>;
  connect(options: { address: string }): Promise<void>;
  disconnect(): Promise<void>;
  addListener(
    eventName: "tagScanned",
    listenerFunc: (event: TagScannedEvent) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: "statusChanged",
    listenerFunc: (event: StatusChangedEvent) => void,
  ): Promise<{ remove: () => void }>;
}

export const RfidBluetooth = registerPlugin<RfidBluetoothPlugin>("RfidBluetooth");
