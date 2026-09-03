import { registerPlugin } from "@capacitor/core";
import type { StatusChangedEvent, TagScannedEvent } from "@/lib/rfid-bluetooth";

export interface DeviceUhfPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  connect(): Promise<void>;
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

export const DeviceUhf = registerPlugin<DeviceUhfPlugin>("DeviceUhf");
