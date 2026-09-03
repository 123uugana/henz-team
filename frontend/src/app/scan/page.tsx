"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { CheckSquare, Radio, Smartphone, Square } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { claimTag, createLivestock, ingestScans } from "@/lib/api";
import {
  RfidBluetooth,
  type PairedDevice,
  type StatusChangedEvent,
  type TagScannedEvent,
} from "@/lib/rfid-bluetooth";
import { DeviceUhf } from "@/lib/rfid-uhf";
import {
  decodeHexAsciiEpc,
  detectSpeciesFromTag,
  normalizeTagEpc,
} from "@/lib/species-detect";
import { useAuthGuard } from "@/lib/use-auth-guard";

function getReadableTagCode(epc: string): string {
  return decodeHexAsciiEpc(epc) ?? epc;
}

const UPLOAD_INTERVAL_MS = 1500;

type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";
// "checking": probing for a built-in HY820 UHF module before deciding which
// reader to use. "uhf": integrated module found, connect to it directly.
// "bluetooth": no integrated module — fall back to pairing an external
// reader like the HL7202K8 over Bluetooth SPP.
type ReaderMode = "checking" | "uhf" | "bluetooth";

interface ScannedTag extends TagScannedEvent {
  scannedAt: number;
  matched: boolean | null;
}

interface ReaderHandle {
  addListener(
    eventName: "tagScanned",
    listenerFunc: (event: TagScannedEvent) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: "statusChanged",
    listenerFunc: (event: StatusChangedEvent) => void,
  ): Promise<{ remove: () => void }>;
  disconnect(): Promise<void>;
}

export default function ScanPage() {
  useAuthGuard();
  const isNative = Capacitor.isNativePlatform();

  const [mode, setMode] = useState<ReaderMode>(() => (isNative ? "checking" : "bluetooth"));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [tags, setTags] = useState<ScannedTag[]>([]);
  const [selectedEpcs, setSelectedEpcs] = useState<Set<string>>(new Set());
  const [registering, setRegistering] = useState(false);
  const [registerSummary, setRegisterSummary] = useState<string | null>(null);

  const pendingEpcsRef = useRef<Set<string>>(new Set());

  const flushPending = useCallback(async () => {
    if (pendingEpcsRef.current.size === 0) return;
    const epcs = [...pendingEpcsRef.current];
    pendingEpcsRef.current.clear();
    try {
      const result = await ingestScans(epcs.map((epc) => ({ epc })));
      const matchByEpc = new Map(result.scans.map((s) => [s.epc, s.matched]));
      setTags((prev) => prev.map((tag) => (matchByEpc.has(tag.epc) ? { ...tag, matched: matchByEpc.get(tag.epc) ?? tag.matched } : tag)));
    } catch {
      // network hiccup: drop silently, the reader will re-report tags still in range
    }
  }, []);

  useEffect(() => {
    if (!isNative) return;
    const interval = setInterval(flushPending, UPLOAD_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isNative, flushPending]);

  useEffect(() => {
    if (!isNative) return;
    DeviceUhf.isSupported()
      .then(({ supported }) => setMode(supported ? "uhf" : "bluetooth"))
      .catch(() => setMode("bluetooth"));
  }, [isNative]);

  const reader: ReaderHandle = mode === "uhf" ? DeviceUhf : RfidBluetooth;

  useEffect(() => {
    if (!isNative || mode === "checking") return;

    const tagListener = reader.addListener("tagScanned", (event) => {
      setTags((prev) => {
        if (prev.some((t) => t.epc === event.epc)) return prev;
        pendingEpcsRef.current.add(event.epc);
        return [{ ...event, scannedAt: Date.now(), matched: null }, ...prev].slice(0, 100);
      });
    });

    const statusListener = reader.addListener("statusChanged", (event) => {
      setStatus(event.status);
      setStatusMessage(event.message ?? null);
    });

    return () => {
      tagListener.then((h) => h.remove());
      statusListener.then((h) => h.remove());
      reader.disconnect().catch(() => {});
    };
  }, [isNative, mode, reader]);

  // HY820's UHF module is built in — connect automatically instead of
  // making the user pick a device from a Bluetooth pairing sheet. Status
  // itself is driven by the native "statusChanged" events (wired up above);
  // this only needs to surface a connect-time rejection.
  useEffect(() => {
    if (mode !== "uhf") return;
    let cancelled = false;
    DeviceUhf.connect().catch((err) => {
      if (cancelled) return;
      setStatus("error");
      setStatusMessage(err instanceof Error ? err.message : "Холбогдож чадсангүй");
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const handleReconnectUhf = () => {
    setStatus("connecting");
    setStatusMessage(null);
    DeviceUhf.connect().catch((err) => {
      setStatus("error");
      setStatusMessage(err instanceof Error ? err.message : "Холбогдож чадсангүй");
    });
  };

  const openPicker = async () => {
    try {
      const { devices } = await RfidBluetooth.listPairedDevices();
      setDevices(devices);
      setPickerOpen(true);
    } catch (err) {
      setStatus("error");
      setStatusMessage(err instanceof Error ? err.message : "Bluetooth алдаа");
    }
  };

  const connectTo = async (device: PairedDevice) => {
    setPickerOpen(false);
    setStatus("connecting");
    setStatusMessage(null);
    try {
      await RfidBluetooth.connect({ address: device.address });
    } catch (err) {
      setStatus("error");
      setStatusMessage(err instanceof Error ? err.message : "Холбогдож чадсангүй");
    }
  };

  const unmatched = tags.filter((t) => t.matched === false);
  const registerableUnmatched = unmatched.filter((t) => detectSpeciesFromTag(t.epc) !== null);
  const allSelected = registerableUnmatched.length > 0 && registerableUnmatched.every((t) => selectedEpcs.has(t.epc));

  const toggleSelected = (epc: string) => {
    setSelectedEpcs((prev) => {
      const next = new Set(prev);
      if (next.has(epc)) next.delete(epc);
      else next.add(epc);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedEpcs(allSelected ? new Set() : new Set(registerableUnmatched.map((t) => t.epc)));
  };

  const registerSelected = async () => {
    const epcs = [...selectedEpcs];
    if (epcs.length === 0) return;
    setRegistering(true);
    setRegisterSummary(null);
    let succeeded = 0;
    let failed = 0;

    for (const rawEpc of epcs) {
      const species = detectSpeciesFromTag(rawEpc);
      if (!species) {
        failed += 1;
        continue;
      }
      const epc = normalizeTagEpc(rawEpc);
      const earNumber = getReadableTagCode(epc);
      try {
        await claimTag(epc);
        await createLivestock({ earNumber, species, gender: "UNKNOWN", rfidEpc: epc });
        succeeded += 1;
        setTags((prev) => prev.map((t) => (t.epc === rawEpc ? { ...t, matched: true } : t)));
      } catch {
        failed += 1;
      }
    }

    setSelectedEpcs(new Set());
    setRegistering(false);
    setRegisterSummary(
      failed === 0
        ? `${succeeded} мал бүртгэгдлээ.`
        : `${succeeded} мал бүртгэгдлээ, ${failed} бүртгэгдсэнгүй.`,
    );
  };

  const statusBadge = {
    idle: { label: "Холбогдоогүй", className: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400" },
    connecting: { label: "Холбогдож байна…", className: "bg-amber-400/15 text-amber-700 dark:text-amber-400" },
    connected: { label: "Холбогдсон", className: "bg-emerald-400/15 text-emerald-700 dark:text-emerald-400" },
    disconnected: { label: "Тасарсан", className: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400" },
    error: { label: "Алдаа", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  }[status];

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" title="Уншигчаар унших" />

      {!isNative ? (
        <div className="mt-10 flex flex-col items-center gap-3 py-10 text-center">
          <Smartphone className="size-8 text-slate-400" strokeWidth={1.5} />
          <p className="max-w-56 text-sm text-slate-500 dark:text-gray-400">
            Bluetooth уншигчаар унших боломж зөвхөн Хэнц Хурга native аппаас ажиллана.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-3 py-2 dark:bg-white/3">
            <div className="flex items-center gap-2">
              <Radio className="size-3.5 text-slate-400 dark:text-gray-500" />
              <span className="text-xs text-slate-500 dark:text-gray-400">
                RFID уншигч
                {statusMessage ? ` · ${statusMessage}` : ""}
              </span>
            </div>
            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
          </div>

          {mode === "bluetooth" ? (
            <Button
              variant="brand"
              size="xl"
              className="w-full"
              onClick={openPicker}
              disabled={status === "connecting"}
            >
              {status === "connected" ? "Өөр уншигч сонгох" : "Уншигч сонгож холбогдох"}
            </Button>
          ) : mode === "uhf" && status !== "connected" && status !== "connecting" ? (
            <Button variant="brand" size="xl" className="w-full" onClick={handleReconnectUhf}>
              Дахин холбогдох
            </Button>
          ) : null}

          {registerableUnmatched.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-[#f2a93c]/20 dark:bg-[#1c1408]">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#a85b0a] dark:text-[#f2a93c]">
                  Шинэ tag олдлоо ({registerableUnmatched.length})
                </h2>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#a85b0a] dark:text-[#f2a93c]"
                >
                  {allSelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
                  Бүгдийг сонгох
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {registerableUnmatched.map((tag) => (
                  <button
                    key={tag.epc}
                    type="button"
                    onClick={() => toggleSelected(tag.epc)}
                    className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200/80 dark:bg-[#141a2c] dark:ring-white/5"
                  >
                    {selectedEpcs.has(tag.epc) ? (
                      <CheckSquare className="size-5 shrink-0 text-[#a85b0a] dark:text-[#f2a93c]" />
                    ) : (
                      <Square className="size-5 shrink-0 text-slate-300 dark:text-gray-600" />
                    )}
                    <span className="truncate text-sm font-medium">
                      {getReadableTagCode(tag.epc)}
                    </span>
                  </button>
                ))}
              </div>

              <Button
                variant="brand"
                size="xl"
                className="w-full"
                disabled={selectedEpcs.size === 0 || registering}
                onClick={registerSelected}
              >
                {registering
                  ? "Бүртгэж байна…"
                  : `Сонгосныг бүртгэх (${selectedEpcs.size})`}
              </Button>

              {registerSummary ? (
                <p className="text-center text-xs text-slate-600 dark:text-gray-300">{registerSummary}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-medium text-slate-500 dark:text-gray-400">
              Уншсан tag ({tags.length})
            </h2>
            <div className="flex flex-col gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.epc}
                  className="flex items-center gap-3 rounded-xl bg-white/60 p-2.5 dark:bg-white/3"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-sm text-slate-700 dark:text-gray-300">
                      {getReadableTagCode(tag.epc)}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-gray-500">
                      антен {tag.antenna}
                      {tag.rssi !== undefined ? ` · RSSI ${tag.rssi}` : ""}
                    </p>
                  </div>
                  {tag.matched === null ? null : tag.matched ? (
                    <Badge className="bg-emerald-400/15 text-emerald-700 dark:text-emerald-400">
                      Бүртгэлтэй
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400">
                      Танигдаагүй
                    </Badge>
                  )}
                </div>
              ))}
              {tags.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-gray-400">
                  Уншигчаа холбоод tag уншуулна уу.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-slate-200 bg-white px-6 pb-8 pt-2 text-slate-900 dark:border-white/10 dark:bg-[#141a2c] dark:text-white">
          <SheetHeader className="items-center px-0 pb-2 pt-4">
            <div className="mb-1 h-1 w-10 rounded-full bg-slate-300 dark:bg-white/15" />
            <SheetTitle className="text-slate-900 dark:text-white">Уншигч сонго</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            {devices.map((device) => (
              <button
                key={device.address}
                type="button"
                onClick={() => connectTo(device)}
                className="flex items-center gap-3 rounded-2xl bg-slate-100 p-3 text-left text-sm font-medium dark:bg-white/5"
              >
                <Radio className="size-4 text-[#a85b0a] dark:text-[#f2a93c]" />
                {device.name}
              </button>
            ))}
            {devices.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-gray-400">
                Bluetooth-оор pair хийсэн төхөөрөмж алга. Эхлээд утасныхаа Bluetooth тохиргооноос уншигчтайгаа pair хийнэ үү.
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </PhoneFrame>
  );
}
