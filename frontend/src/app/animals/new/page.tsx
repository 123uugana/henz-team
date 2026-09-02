"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Lock,
  Mars,
  ScanLine,
  Venus,
} from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { GoatIcon, SheepIcon } from "@/components/species-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  claimTag,
  createLivestock,
  getTag,
  listScans,
  uploadImage,
  type RecentScan,
  type Species,
} from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { resizeImage } from "@/lib/image";
import { cn } from "@/lib/utils";

const SPECIES_INFO: Record<Species, { label: string; icon: typeof SheepIcon }> =
  {
    SHEEP: { label: "Хонь", icon: SheepIcon },
    GOAT: { label: "Ямаа", icon: GoatIcon },
  };

const GENDERS = [
  { value: "MALE", label: "Эр", icon: Mars },
  { value: "FEMALE", label: "Эм", icon: Venus },
] as const;

function detectSpeciesFromTag(code: string): Species | null {
  const readable = decodeHexAsciiEpc(code) ?? code;
  const prefix = readable.trim().charAt(0).toUpperCase();
  if (prefix === "H") return "SHEEP";
  if (prefix === "Y") return "GOAT";
  return null;
}

function decodeHexAsciiEpc(code: string): string | null {
  const compact = code.trim().replace(/[\s:-]/g, "");
  if (
    compact.length < 2 ||
    compact.length % 2 !== 0 ||
    !/^[0-9A-Fa-f]+$/.test(compact)
  ) {
    return null;
  }

  let decoded = "";
  for (let index = 0; index < compact.length; index += 2) {
    const value = Number.parseInt(compact.slice(index, index + 2), 16);
    if (value < 32 || value > 126) return null;
    decoded += String.fromCharCode(value);
  }

  return decoded || null;
}

function normalizeTagEpc(code: string): string {
  const normalized = code.trim().replace(/\s+/g, "").toUpperCase();
  if (/^[0-9A-F]+$/.test(normalized) && normalized.length % 2 === 0) {
    return normalized;
  }
  return normalized.replace(/^([HY])-?/, "$1-");
}

function getReadableTagCode(epc: string): string {
  return decodeHexAsciiEpc(epc) ?? epc;
}

function isFreshScan(scan: RecentScan): boolean {
  const scannedAt = new Date(scan.scannedAt).getTime();
  return Number.isFinite(scannedAt) && Date.now() - scannedAt < 2 * 60 * 1000;
}

export default function RegisterAnimalPage() {
  useAuthGuard();
  const router = useRouter();
  const [tagCode, setTagCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [features, setFeatures] = useState("");
  const [gender, setGender] = useState<
    (typeof GENDERS)[number]["value"] | null
  >(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [latestScan, setLatestScan] = useState<RecentScan | null>(null);
  const [scanPollError, setScanPollError] = useState<string | null>(null);
  const tagCodeRef = useRef("");

  const species = detectSpeciesFromTag(tagCode);
  const epc = tagCode.trim() ? normalizeTagEpc(tagCode) : "";
  const readableEpc = epc ? getReadableTagCode(epc) : "";

  useEffect(() => {
    tagCodeRef.current = tagCode;
  }, [tagCode]);

  useEffect(() => {
    let cancelled = false;

    const refreshLatestScan = async () => {
      try {
        const scans = await listScans();
        if (cancelled) return;

        const scan = scans[0] ?? null;
        setLatestScan(scan);
        setScanPollError(null);

        if (scan && isFreshScan(scan) && !tagCodeRef.current.trim()) {
          const normalized = normalizeTagEpc(scan.epc);
          tagCodeRef.current = normalized;
          setTagCode(normalized);
        }
      } catch (err) {
        if (cancelled) return;
        setScanPollError(
          err instanceof ApiError ? err.message : "RFID уншилтыг авч чадсангүй.",
        );
      }
    };

    void refreshLatestScan();
    const intervalId = window.setInterval(refreshLatestScan, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const [tagBlocked, setTagBlocked] = useState(false);
  useEffect(() => {
    // When epc is empty the UI never reads tagBlocked (it shows the
    // "scan a tag" hint instead), so there's nothing to reset here.
    if (!epc) return;
    let cancelled = false;
    getTag(epc)
      .then((tag) => {
        if (!cancelled)
          setTagBlocked(
            tag.status === "CLAIMED" ||
              tag.status === "LOCKED" ||
              tag.status === "DAMAGED",
          );
      })
      .catch(() => {
        if (!cancelled) setTagBlocked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [epc]);

  const canSubmit =
    tagCode.trim().length > 0 && species !== null && !tagBlocked && !submitting;

  const photoPreview = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile],
  );

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handleSubmit = async () => {
    if (!canSubmit || !species) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      await claimTag(epc);

      let imageUrl: string | undefined;
      if (photoFile) {
        const uploaded = await uploadImage(await resizeImage(photoFile));
        imageUrl = uploaded.url;
      }

      const animal = await createLivestock({
        earNumber: readableEpc || epc,
        name: nickname.trim() || undefined,
        species,
        gender: gender ?? "UNKNOWN",
        birthYear: age ? new Date().getFullYear() - Number(age) : undefined,
        markDescription: features.trim() || undefined,
        rfidEpc: epc,
        imageUrl,
      });

      router.push(`/animals/${animal.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Бүртгэж чадсангүй.",
      );
      setSubmitting(false);
    }
  };

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" />

      <div className="mt-6 flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">Мал бүртгэх</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">RFID шошгыг уншуулна уу</p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Label htmlFor="tagCode" className="text-slate-700 dark:text-gray-300">
          Шошгын код
        </Label>
        <div className="relative">
          <ScanLine className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#a85b0a] dark:text-[#f2a93c]" />
          <Input
            id="tagCode"
            autoFocus
            value={tagCode}
            onChange={(e) => setTagCode(e.target.value)}
            placeholder="Жишээ: H-4821 эсвэл Y-4821"
            className="h-14 border-[#f2a93c]/40 bg-white dark:bg-[#161c2c] pl-12 pr-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161c2c]">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-gray-300">
              <ScanLine className="size-4 text-[#a85b0a] dark:text-[#f2a93c]" />
              RFID live
            </span>
            <span className="text-[11px] text-slate-500 dark:text-gray-400">
              {latestScan
                ? new Date(latestScan.scannedAt).toLocaleTimeString("mn-MN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "waiting..."}
            </span>
          </div>

          {latestScan ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-all font-mono text-sm font-semibold text-slate-900 dark:text-white">
                  {getReadableTagCode(latestScan.epc)}
                </p>
                {getReadableTagCode(latestScan.epc) !== latestScan.epc ? (
                  <p className="mt-0.5 break-all font-mono text-[11px] text-slate-500 dark:text-gray-400">
                    {latestScan.epc}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">
                  {latestScan.reader?.name ?? latestScan.reader?.id ?? "HH100"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTagCode(normalizeTagEpc(latestScan.epc))}
              >
                Авах
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500 dark:text-gray-400">
              HH100 дээр tag уншуулахад энд гарч ирнэ.
            </p>
          )}

          {scanPollError ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {scanPollError}
            </p>
          ) : null}
        </div>

        {tagCode.trim().length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Шошгыг уншуулахад малын төрөл автоматаар танигдана.
          </p>
        ) : !species ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3">
            <CircleAlert className="size-4 shrink-0 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">
              Кодыг таньсангүй. H эсвэл Y үсгээр эхэлсэн байх ёстой.
            </span>
          </div>
        ) : tagBlocked ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3">
            <Lock className="size-4 shrink-0 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">
              Энэ шошго өөр хэрэглэгчид бүртгэгдсэн байна ({epc}).
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-400/10 px-4 py-3">
            {(() => {
              const Icon = SPECIES_INFO[species].icon;
              return <Icon className="size-4 text-emerald-700 dark:text-emerald-400" />;
            })()}
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {SPECIES_INFO[species].label} — автоматаар танигдлаа ({readableEpc})
            </span>
            <CheckCircle2 className="ml-auto size-4 text-emerald-700 dark:text-emerald-400" />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300">
          Мэдээлэл оруулах
        </h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="nickname" className="text-slate-700 dark:text-gray-300">
            Нэр / Хоч (заавал биш)
          </Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Жишээ: Халтар"
            className="h-14 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="age" className="text-slate-700 dark:text-gray-300">
              Нас
            </Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="0"
              className="h-14 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-slate-700 dark:text-gray-300">Хүйс</Label>
            <div className="grid h-14 grid-cols-2 gap-2">
              {GENDERS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGender(value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-2xl border text-sm font-medium transition-colors",
                    gender === value
                      ? "border-[#f2a93c] bg-amber-50 dark:bg-[#1c1408] text-[#a85b0a] dark:text-[#f2a93c]"
                      : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] text-slate-500 dark:text-gray-400 hover:border-slate-300"
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="features" className="text-slate-700 dark:text-gray-300">
            Онцлог шинж
          </Label>
          <Input
            id="features"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="Жишээ: Цагаан толботой"
            className="h-14 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-slate-700 dark:text-gray-300">Зураг</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-[#161c2c] hover:border-[#f2a93c]/50"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Малын зураг"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-slate-500 dark:text-gray-400">
                <Camera className="size-6" strokeWidth={1.5} />
                <span className="text-sm">Зураг нэмэх</span>
              </span>
            )}
          </button>
        </div>

        {submitError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
        ) : null}
      </div>

      <Button
        variant="brand"
        size="xl"
        className="mt-8 w-full"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {submitting ? "Бүртгэж байна..." : "Бүртгэх"}
      </Button>
    </PhoneFrame>
  );
}
