"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PhoneFrame } from "@/components/phone-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getLivestock, updateLivestock, type Gender, type Livestock, type Species } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";

export default function EditAnimalPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: animal, loading, error } = useApi(() => getLivestock(id), id);
  const [formFor, setFormFor] = useState<Livestock | null>(null);
  const [earNumber, setEarNumber] = useState("");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("SHEEP");
  const [gender, setGender] = useState<Gender>("UNKNOWN");
  const [birthYear, setBirthYear] = useState("");
  const [color, setColor] = useState("");
  const [markDescription, setMarkDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (animal && animal !== formFor) {
    setFormFor(animal);
    setEarNumber(animal.earNumber);
    setName(animal.name ?? "");
    setSpecies(animal.species);
    setGender(animal.gender);
    setBirthYear(animal.birthYear?.toString() ?? "");
    setColor(animal.color ?? "");
    setMarkDescription(animal.markDescription ?? "");
  }

  const handleSave = async () => {
    if (!animal || !earNumber.trim() || saving) return;
    const parsedBirthYear = birthYear ? Number(birthYear) : undefined;
    if (parsedBirthYear !== undefined && (!Number.isInteger(parsedBirthYear) || parsedBirthYear < 1900 || parsedBirthYear > new Date().getFullYear())) {
      setSaveError("Төрсөн он буруу байна.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await updateLivestock(animal.id, {
        earNumber: earNumber.trim(),
        name: name.trim() || undefined,
        species,
        gender,
        birthYear: parsedBirthYear,
        color: color.trim() || undefined,
        markDescription: markDescription.trim() || undefined,
        rfidEpc: animal.rfidTag?.epc,
        imageUrl: animal.imageUrl,
      });
      router.replace(`/animals/${animal.id}`);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Хадгалж чадсангүй.");
      setSaving(false);
    }
  };

  return (
    <PhoneFrame>
      <AppHeader backHref={`/animals/${id}`} title="Малын мэдээлэл засах" />

      {loading ? <p className="mt-10 text-center text-sm text-slate-500 dark:text-gray-400">Ачаалж байна...</p> : null}
      {error ? <p className="mt-10 text-center text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {animal ? (
        <div className="mt-6 flex flex-col gap-5">
          <Field label="Бүртгэлийн дугаар" htmlFor="earNumber">
            <Input id="earNumber" value={earNumber} onChange={(event) => setEarNumber(event.target.value)} className="h-12 border-slate-200 bg-white dark:border-white/10 dark:bg-[#161c2c]" />
          </Field>
          <Field label="Нэр / хоч" htmlFor="name">
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} className="h-12 border-slate-200 bg-white dark:border-white/10 dark:bg-[#161c2c]" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Төрөл" htmlFor="species">
              <select id="species" value={species} onChange={(event) => setSpecies(event.target.value as Species)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#161c2c]">
                <option value="SHEEP">Хонь</option>
                <option value="GOAT">Ямаа</option>
              </select>
            </Field>
            <Field label="Хүйс" htmlFor="gender">
              <select id="gender" value={gender} onChange={(event) => setGender(event.target.value as Gender)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#161c2c]">
                <option value="MALE">Эр</option>
                <option value="FEMALE">Эм</option>
                <option value="UNKNOWN">Тодорхойгүй</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Төрсөн он" htmlFor="birthYear">
              <Input id="birthYear" type="number" min="1900" max={new Date().getFullYear()} value={birthYear} onChange={(event) => setBirthYear(event.target.value)} className="h-12 border-slate-200 bg-white dark:border-white/10 dark:bg-[#161c2c]" />
            </Field>
            <Field label="Зүс" htmlFor="color">
              <Input id="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-12 border-slate-200 bg-white dark:border-white/10 dark:bg-[#161c2c]" />
            </Field>
          </div>
          <Field label="Онцлог шинж" htmlFor="markDescription">
            <Input id="markDescription" value={markDescription} onChange={(event) => setMarkDescription(event.target.value)} className="h-12 border-slate-200 bg-white dark:border-white/10 dark:bg-[#161c2c]" />
          </Field>
          {animal.rfidTag ? <p className="text-xs text-slate-500 dark:text-gray-400">RFID: {animal.rfidTag.epc} · Шошгыг энэ хэсгээс солихгүй.</p> : null}
          {saveError ? <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p> : null}
          <Button variant="brand" size="xl" disabled={saving || !earNumber.trim()} onClick={handleSave}>
            {saving ? "Хадгалж байна..." : "Өөрчлөлт хадгалах"}
          </Button>
        </div>
      ) : null}
    </PhoneFrame>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}
