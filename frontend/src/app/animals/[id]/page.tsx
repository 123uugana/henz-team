"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Trash2,
  DoorOpen,
  Lock,
  MapPin,
  Navigation,
  Pencil,
  TriangleAlert,
  Unlock,
} from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { SpeciesIcon } from "@/components/species-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getTagPrefixInfo } from "@/lib/tag-prefix";
import {
  ApiError,
  deleteLivestock,
  getLivestock,
  getLivestockScans,
  getTag,
  updateLivestock,
  updateLivestockLocation,
  updateLivestockStatus,
  uploadImage,
  type TagRegistryEntry,
  type TagStatus,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { resizeImage } from "@/lib/image";

const TAG_STATUS_LABEL: Record<TagStatus, string> = {
  AVAILABLE: "Чөлөөтэй",
  CLAIMED: "Эзэмшигдсэн",
  LOCKED: "Түгжээтэй",
  DAMAGED: "Гэмтэлтэй",
};

const TAG_STATUS_TONE: Record<TagStatus, string> = {
  AVAILABLE: "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300",
  CLAIMED: "bg-sky-500/15 text-sky-400",
  LOCKED: "bg-emerald-400/15 text-emerald-700 dark:text-emerald-400",
  DAMAGED: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export default function AnimalDetailPage() {
  const params = useParams<{ id: string }>();
  // Remount whenever the route's :id changes, so no per-animal local state
  // (tag lookup, GPS status, upload state) can leak from one animal to another.
  return <AnimalDetailContent key={params.id} id={params.id} />;
}

function AnimalDetailContent({ id }: { id: string }) {
  useAuthGuard();
  const router = useRouter();

  const { data: animal, error, refresh } = useApi(() => getLivestock(id), id);
  const { data: scans } = useApi(() => getLivestockScans(id), id);

  const [tag, setTag] = useState<TagRegistryEntry | null>(null);
  useEffect(() => {
    if (!animal?.rfidTag) return;
    const epc = animal.rfidTag.epc;
    let cancelled = false;

    getTag(epc)
      .then((result) => {
        if (!cancelled) setTag(result);
      })
      .catch(() => {
        if (!cancelled) setTag(null);
      });

    return () => {
      cancelled = true;
    };
  }, [animal?.rfidTag]);

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (error) {
    return (
      <PhoneFrame>
        <AppHeader backHref="/animals" title="Дэлгэрэнгүй" />
        <p className="mt-10 text-center text-sm text-slate-500 dark:text-gray-400">{error}</p>
      </PhoneFrame>
    );
  }

  if (!animal) {
    return (
      <PhoneFrame>
        <AppHeader backHref="/animals" title="Дэлгэрэнгүй" />
        <p className="mt-10 text-center text-sm text-slate-500 dark:text-gray-400">Ачаалж байна...</p>
      </PhoneFrame>
    );
  }

  const tagInfo = animal.rfidTag ? getTagPrefixInfo(animal.rfidTag.epc) : null;

  const handlePhotoChange = async (file: File | null) => {
    if (!file) return;
    setUploading(true);

    try {
      const { url } = await uploadImage(await resizeImage(file));
      await updateLivestock(animal.id, {
        earNumber: animal.earNumber,
        name: animal.name,
        species: animal.species,
        gender: animal.gender,
        birthYear: animal.birthYear,
        color: animal.color,
        markDescription: animal.markDescription,
        rfidEpc: animal.rfidTag?.epc,
        imageUrl: url,
      });
      refresh();
    } catch (err) {
      setLocateError(err instanceof ApiError ? err.message : "Зураг хадгалж чадсангүй.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`${animal.earNumber} дугаартай малыг бүртгэлээс устгах уу?`)) return;
    setDeleting(true);
    setLocateError(null);

    try {
      await deleteLivestock(animal.id);
      router.replace("/animals");
    } catch (err) {
      setLocateError(err instanceof ApiError ? err.message : "Устгаж чадсангүй.");
      setDeleting(false);
    }
  };

  const toggleMissing = async () => {
    await updateLivestockStatus(animal.id, animal.status === "MISSING" ? "ACTIVE" : "MISSING");
    refresh();
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateError("Энэ төхөөрөмж байршил тогтоох боломжгүй байна.");
      return;
    }

    setLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await updateLivestockLocation(
            animal.id,
            position.coords.latitude,
            position.coords.longitude
          );
          refresh();
        } catch (err) {
          setLocateError(err instanceof ApiError ? err.message : "Байршил хадгалж чадсангүй.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocateError("Байршил авах боломжгүй байна. Зөвшөөрлөө шалгана уу.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <PhoneFrame className="px-0 sm:px-0">
      <div className="px-6">
        <AppHeader backHref="/animals" title="Дэлгэрэнгүй" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="relative mt-4 flex h-56 w-full items-center justify-center overflow-hidden bg-linear-to-b from-[#f3e5c8] to-[#fffaf0] dark:from-[#2a3450] dark:to-[#141a2c]"
      >
        {animal.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={animal.imageUrl}
            alt={animal.name || animal.earNumber}
            className="h-full w-full object-cover"
          />
        ) : (
          <SpeciesIcon
            species={animal.species}
            className="size-20 text-[#a85b0a]/70 dark:text-[#f2a93c]/70"
          />
        )}
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white">
          <Camera className="size-3.5" />
          {uploading ? "Илгээж байна..." : "Зураг солих"}
        </span>
      </button>

      <div className="flex flex-col gap-6 px-6 pb-8 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">{animal.name || animal.earNumber}</h1>
            <p className="text-xs text-slate-500 dark:text-gray-400"># ID: {animal.earNumber}</p>
          </div>
          <Badge className="bg-[#f2a93c]/15 text-[#a85b0a] dark:text-[#f2a93c]">
            {animal.species === "SHEEP" ? "Хонь" : "Ямаа"}
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full border-slate-200 dark:border-white/10 bg-transparent text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5"
            render={<Link href={`/animals/${animal.id}/edit`} />}
          >
            <Pencil />
            Засах
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={handleDelete}
            className="w-full"
          >
            <Trash2 />
            {deleting ? "Устгаж байна..." : "Бүртгэлээс устгах"}
          </Button>
          <Button
            variant="outline"
            onClick={toggleMissing}
            className={
              animal.status === "MISSING"
                ? "w-full border-emerald-500/30 bg-transparent text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                : "w-full border-red-500/30 bg-transparent text-red-600 dark:text-red-400 hover:bg-red-500/10"
            }
          >
            <TriangleAlert />
            {animal.status === "MISSING"
              ? "Олдсон гэж тэмдэглэх"
              : "Дутуу гэж тэмдэглэх"}
          </Button>
        </div>

        {animal.rfidTag ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300">RFID шошго</h2>
            <Card className="flex-row items-center gap-3 bg-white dark:bg-[#141a2c] p-3 ring-1 ring-slate-200/80 dark:ring-white/5">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tagInfo!.bgClass}`}>
                {tag?.status === "LOCKED" ? (
                  <Lock className={`size-4 ${tagInfo!.textClass}`} />
                ) : (
                  <Unlock className={`size-4 ${tagInfo!.textClass}`} />
                )}
              </span>
              <div className="flex flex-1 flex-col">
                <p className="text-sm font-medium">{animal.rfidTag.epc}</p>
              </div>
              <Badge className={tag ? TAG_STATUS_TONE[tag.status] : TAG_STATUS_TONE.AVAILABLE}>
                {tag ? TAG_STATUS_LABEL[tag.status] : "—"}
              </Badge>
            </Card>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300">Байршил</h2>
            <button
              type="button"
              onClick={handleLocate}
              disabled={locating}
              className="flex items-center gap-1 text-xs font-medium text-[#a85b0a] dark:text-[#f2a93c] disabled:opacity-50"
            >
              <Navigation className="size-3.5" />
              {locating ? "Тогтоож байна..." : "GPS-ээс авах"}
            </button>
          </div>
          <Card className="gap-2 bg-white dark:bg-[#141a2c] p-4 ring-1 ring-slate-200/80 dark:ring-white/5">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 shrink-0 text-[#a85b0a] dark:text-[#f2a93c]" />
              {animal.location ? (
                <span>
                  {animal.location.latitude.toFixed(5)}, {animal.location.longitude.toFixed(5)}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-gray-400">Байршил тодорхойгүй байна.</span>
              )}
            </div>
            {locateError ? (
              <p className="text-xs text-red-600 dark:text-red-400">{locateError}</p>
            ) : null}
          </Card>
        </div>

        {scans && scans.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300">Скан түүх</h2>

            <div className="flex flex-col gap-4">
              {scans.map((scan) => (
                <div key={scan.id} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
                    <DoorOpen className="size-4 text-[#a85b0a] dark:text-[#f2a93c]" strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {scan.reader?.name ?? "Тодорхойгүй уншигч"}
                      <span className="text-xs font-normal text-slate-500 dark:text-gray-400">
                        {new Date(scan.scannedAt).toLocaleString("mn-MN")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      {scan.direction === "ENTER"
                        ? "Сүрэгт орсон."
                        : scan.direction === "EXIT"
                          ? "Бэлчээрт гарсан."
                          : "Уншигдсан."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </PhoneFrame>
  );
}
