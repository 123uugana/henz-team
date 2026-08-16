"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Lock,
  Mars,
  PawPrint,
  Rabbit,
  ScanLine,
  Venus,
} from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAnimal, claimTag, getTag, type Animal, type Species } from "@/lib/store";
import { cn } from "@/lib/utils";

const SPECIES_INFO: Record<Species, { label: string; icon: typeof PawPrint }> = {
  Хонь: { label: "Хонь", icon: PawPrint },
  Ямаа: { label: "Ямаа", icon: Rabbit },
};

const GENDERS = [
  { value: "MALE", label: "Эр", icon: Mars },
  { value: "FEMALE", label: "Эм", icon: Venus },
] as const;

function detectSpeciesFromTag(code: string): Species | null {
  const prefix = code.trim().charAt(0).toUpperCase();
  if (prefix === "H") return "Хонь";
  if (prefix === "Y") return "Ямаа";
  return null;
}

function normalizeTagEpc(code: string): string {
  const digits = code.trim().replace(/^[HY]-?/i, "");
  return `HH-${digits}`;
}

export default function RegisterAnimalPage() {
  const router = useRouter();
  const [tagCode, setTagCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [features, setFeatures] = useState("");
  const [gender, setGender] = useState<(typeof GENDERS)[number]["value"] | null>(
    null
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const species = detectSpeciesFromTag(tagCode);
  const epc = tagCode.trim() ? normalizeTagEpc(tagCode) : "";
  const existingTag = epc ? getTag(epc) : undefined;
  const tagBlocked =
    !!existingTag && (existingTag.status === "CLAIMED" || existingTag.status === "LOCKED");

  const canSubmit = tagCode.trim().length > 0 && species !== null && !tagBlocked;

  const photoPreview = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile]
  );

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handleSubmit = () => {
    if (!canSubmit || !species) return;

    const id = `animal-${Date.now()}`;
    const animal: Animal = {
      id,
      tagEpc: epc,
      name: nickname.trim() || species,
      species,
      gender: gender ?? "UNKNOWN",
      birthYear: age ? new Date().getFullYear() - Number(age) : undefined,
      description: features.trim() || "Тэмдэглэгээ оруулаагүй.",
      lastSeen: "Дөнгөж сая",
      status: "ACTIVE",
      imageUrl: photoPreview,
      location: null,
      history: [
        {
          location: "Бүртгэл",
          time: "Дөнгөж сая",
          note: "Шошго уншуулж систэмд шинээр бүртгэгдлээ.",
        },
      ],
    };

    addAnimal(animal);
    claimTag(epc, "Та", id);
    router.push(`/animals/${id}`);
  };

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" />

      <div className="mt-6 flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">Мал бүртгэх</h1>
        <p className="text-sm text-gray-400">RFID шошгыг уншуулна уу</p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Label htmlFor="tagCode" className="text-gray-300">
          Шошгын код
        </Label>
        <div className="relative">
          <ScanLine className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#f2a93c]" />
          <Input
            id="tagCode"
            autoFocus
            value={tagCode}
            onChange={(e) => setTagCode(e.target.value)}
            placeholder="Жишээ: H-4821 эсвэл Y-4821"
            className="h-14 border-[#f2a93c]/40 bg-[#161c2c] pl-12 pr-4 py-0 text-base text-white placeholder:text-gray-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>

        {tagCode.trim().length === 0 ? (
          <p className="text-xs text-gray-500">
            Шошгыг уншуулахад малын төрөл автоматаар танигдана.
          </p>
        ) : !species ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3">
            <CircleAlert className="size-4 shrink-0 text-red-400" />
            <span className="text-sm text-red-400">
              Кодыг таньсангүй. H эсвэл Y үсгээр эхэлсэн байх ёстой.
            </span>
          </div>
        ) : tagBlocked ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3">
            <Lock className="size-4 shrink-0 text-red-400" />
            <span className="text-sm text-red-400">
              Энэ шошго өөр хэрэглэгчид бүртгэгдсэн байна ({epc}).
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-400/10 px-4 py-3">
            {(() => {
              const Icon = SPECIES_INFO[species].icon;
              return <Icon className="size-4 text-emerald-400" strokeWidth={1.75} />;
            })()}
            <span className="text-sm font-medium text-emerald-400">
              {SPECIES_INFO[species].label} — автоматаар танигдлаа ({epc})
            </span>
            <CheckCircle2 className="ml-auto size-4 text-emerald-400" />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-gray-200">
          Мэдээлэл оруулах
        </h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="nickname" className="text-gray-300">
            Нэр / Хоч (заавал биш)
          </Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Жишээ: Халтар"
            className="h-14 border-white/10 bg-[#161c2c] px-4 py-0 text-base text-white placeholder:text-gray-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="age" className="text-gray-300">
              Нас
            </Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="0"
              className="h-14 border-white/10 bg-[#161c2c] px-4 py-0 text-base text-white placeholder:text-gray-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-gray-300">Хүйс</Label>
            <div className="grid h-14 grid-cols-2 gap-2">
              {GENDERS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGender(value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-2xl border text-sm font-medium transition-colors",
                    gender === value
                      ? "border-[#f2a93c] bg-[#1c1408] text-[#f2a93c]"
                      : "border-white/10 bg-[#161c2c] text-gray-400 hover:border-white/20"
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
          <Label htmlFor="features" className="text-gray-300">
            Онцлог шинж
          </Label>
          <Input
            id="features"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="Жишээ: Цагаан толботой"
            className="h-14 border-white/10 bg-[#161c2c] px-4 py-0 text-base text-white placeholder:text-gray-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-gray-300">Зураг</Label>
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
            className="flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-[#161c2c] hover:border-[#f2a93c]/50"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Малын зураг"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-gray-500">
                <Camera className="size-6" strokeWidth={1.5} />
                <span className="text-sm">Зураг нэмэх</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <Button
        variant="brand"
        size="xl"
        className="mt-8 w-full"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        Бүртгэх
      </Button>
    </PhoneFrame>
  );
}
