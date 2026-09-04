"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, ChevronDown, IdCard, Info, MapPinned, Nfc, PawPrint, Phone, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { PhoneFrame } from "@/components/phone-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getFarmer, removeFarmer, updateFarmer } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useDealerGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";

const AIMAGS = ["Архангай", "Баян-Өлгий", "Булган", "Говь-Алтай", "Дорнод", "Дундговь", "Завхан", "Өвөрхангай", "Өмнөговь", "Сүхбаатар", "Сэлэнгэ", "Төв", "Увс", "Ховд", "Хөвсгөл", "Хэнтий", "Дархан-Уул", "Орхон"];
const SUMS = ["Батширээт", "Биндэр", "Баян-Адрага", "Галшар", "Дадал", "Дархан", "Дэлгэрхаан", "Жаргалтхаан", "Мөрөн", "Норовлин", "Өмнөдэлгэр", "Хэрлэн", "Цэнхэрмандал"];

export default function DealerFarmerDetailPage() {
  useDealerGuard();

  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: farmer, loading, error, setData } = useApi(() => getFarmer(params.id), params.id);
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [aimag, setAimag] = useState("");
  const [sum, setSum] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (farmer && farmer.id !== hydratedId) {
    const [firstPart, ...rest] = farmer.name.split(" ");
    setLastName(rest.length > 0 ? firstPart : "");
    setFirstName(rest.length > 0 ? rest.join(" ") : farmer.name);
    setPhoneNumber(farmer.phoneNumber);
    setAimag(farmer.aimag ?? "");
    setSum(farmer.sum ?? "");
    setHydratedId(farmer.id);
  }

  const fullName = [lastName.trim(), firstName.trim()].filter(Boolean).join(" ");
  const canSave = Boolean(farmer) && firstName.trim().length >= 2 && /^\d{8}$/.test(phoneNumber) && !saving;
  const shortId = useMemo(() => farmer ? `MI-${farmer.id.slice(-6).toUpperCase()}` : "MI-000000", [farmer]);

  const save = async (status = farmer?.status) => {
    if (!farmer || !canSave) return;
    setSaving(true);
    setActionError(null);
    setMessage(null);

    try {
      const updated = await updateFarmer(farmer.id, {
        name: fullName,
        phoneNumber,
        aimag: aimag || null,
        sum: sum || null,
        status,
      });
      setData(updated);
      setHydratedId(null);
      setMessage(status && status !== farmer.status ? "Малчны төлөв шинэчлэгдлээ." : "Өөрчлөлт хадгалагдлаа.");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Малчны мэдээлэл хадгалах үед алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!farmer || removing) return;
    setRemoving(true);
    setActionError(null);

    try {
      await removeFarmer(farmer.id);
      router.push("/dealer");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Жагсаалтаас хасах үед алдаа гарлаа.");
      setRemoving(false);
      setRemoveOpen(false);
    }
  };

  return (
    <PhoneFrame className="px-4 pb-0 sm:px-5">
      <AppHeader
        backHref="/dealer"
        title="Малчны мэдээлэл засах"
        status={<span className="text-[10px] font-semibold uppercase tracking-wide text-[#d6c8b1]">Бүртгэлийн засвар</span>}
      />

      {loading ? <p className="mt-10 text-center text-sm text-slate-500 dark:text-gray-400">Ачаалж байна...</p> : null}
      {error ? <p className="mt-10 text-center text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {farmer ? (
        <main className="mt-5 flex flex-1 flex-col gap-3 pb-28">
          <Card className="gap-3 rounded-lg bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#141a2c] dark:ring-white/5">
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#f2a93c]/15 text-sm font-bold text-[#a85b0a] dark:text-[#f2a93c]">
                {initials(farmer.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{farmer.name || farmer.phoneNumber}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">#{shortId}</p>
                  </div>
                  <Badge className={farmer.status === "ACTIVE" ? "bg-emerald-400/15 text-emerald-700 dark:text-emerald-300" : "bg-red-400/15 text-red-700 dark:text-red-300"}>
                    {farmer.status === "ACTIVE" ? "Идэвхтэй харилцагч" : "Идэвхгүй"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Нийт мал" value={String(farmer.livestockCount)} />
              <MiniStat label="RFID" value="0" />
              <MiniStat label="Алдаа" value="0" />
            </div>
          </Card>

          <Section icon={<IdCard className="size-4" />} title="Хувийн мэдээлэл" action={<Badge className="bg-[#f2a93c]/15 text-[#a85b0a] dark:text-[#f2a93c]">Үндсэн бүртгэл</Badge>}>
            <div className="grid grid-cols-2 gap-3">
              <Field id="lastName" label="Овог">
                <Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} />
              </Field>
              <Field id="firstName" label="Нэр *">
                <Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field id="phoneNumber" label="Утасны дугаар *">
              <div className="flex h-12 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#222b44]">
                <span className="inline-flex items-center gap-1 border-r border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-white/10 dark:text-gray-300">
                  <Phone className="size-3.5" />
                  +976
                </span>
                <Input
                  id="phoneNumber"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="h-full flex-1 rounded-none border-0 bg-transparent px-4 py-0 focus-visible:ring-0"
                />
              </div>
            </Field>
          </Section>

          <Section icon={<MapPinned className="size-4" />} title="Байршлын мэдээлэл" action={<Badge className="bg-emerald-400/15 text-emerald-700 dark:text-emerald-300">Хянаж буй</Badge>}>
            <Field id="aimag" label="Аймаг / Хот *">
              <Select id="aimag" value={aimag} onChange={setAimag} placeholder="Аймаг сонгох" options={AIMAGS} />
            </Field>
            <Field id="sum" label="Сум / Дүүрэг *">
              <Select id="sum" value={sum} onChange={setSum} placeholder="Сум сонгох" options={SUMS} />
            </Field>
          </Section>

          <Section icon={<Nfc className="size-4" />} title="Системийн төлөв ба холбоос" action={<Badge className="bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-gray-300">v2.1</Badge>}>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#222b44]">
              <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-300" />
              <div className="min-w-0">
                <p className="text-xs font-semibold">Системтэй холбогдсон</p>
                <p className="text-[11px] text-slate-500 dark:text-gray-400">Мэдээлэл seller ownership-оор хамгаалагдсан</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-gray-400">
              <p className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                Бүртгэсэн: {new Date(farmer.createdAt).toLocaleDateString("mn-MN")}
              </p>
              <p className="flex items-center gap-1.5 justify-end text-[#a85b0a] dark:text-[#f2a93c]">
                <PawPrint className="size-3.5" />
                {farmer.livestockCount} мал
              </p>
            </div>
          </Section>

          {message ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
          {actionError ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{actionError}</p> : null}

          <button type="button" onClick={() => setRemoveOpen(true)} className="flex items-center gap-2 text-left text-xs font-semibold text-red-600 dark:text-red-300">
            <Trash2 className="size-4" />
            Энэ малчныг миний хариуцсан жагсаалтаас хасах
          </button>
        </main>
      ) : null}

      {farmer ? (
        <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-slate-200 bg-[#f8f5ed]/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#10141f]/95 sm:-mx-5 sm:px-5">
          <Button variant="outline" size="xl" className="flex-1 rounded-lg" onClick={() => router.push("/dealer")}>Цуцлах</Button>
          <Button variant="brand" size="xl" className="flex-1 rounded-lg gap-2" disabled={!canSave} onClick={() => save()}>
            <BadgeCheck className="size-4" />
            {saving ? "Хадгалж байна..." : "Өөрчлөлтийг хадгалах"}
          </Button>
        </div>
      ) : null}

      {farmer && removeOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#050915]/70 p-5 backdrop-blur-sm">
          <Card className="w-full max-w-sm gap-4 rounded-lg border border-red-400/30 bg-white p-5 shadow-2xl dark:bg-[#202944]">
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 dark:text-red-300">
                <UserRound className="size-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">Жагсаалтаас хасах уу?</h2>
                  <Badge className="bg-[#f2a93c]/15 text-[#a85b0a] dark:text-[#f2a93c]">Санамж</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-300">
                  Та {farmer.name || farmer.phoneNumber}-ийг өөрийн хариуцсан малчдын жагсаалтаас хасахдаа итгэлтэй байна уу? Малчны үндсэн бүртгэл болон сүргийн мэдээлэл системд хэвээр хадгалагдана.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#172039]">
              <p className="text-sm font-semibold">{farmer.name || farmer.phoneNumber}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Бүртгэлтэй мал: {farmer.livestockCount}</p>
            </div>

            <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3 text-xs leading-5 text-cyan-800 dark:text-cyan-100">
              <Info className="mr-1 inline size-4" />
              Системийн санамж: Малчны бүртгэл устахгүй, зөвхөн энэ борлуулагчийн жагсаалтаас сална.
            </div>

            <Button variant="destructive" size="xl" className="w-full rounded-lg bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700" disabled={removing} onClick={remove}>
              <Trash2 className="size-4" />
              {removing ? "Хасаж байна..." : "Жагсаалтаас хасах"}
            </Button>
            <Button variant="outline" size="xl" className="w-full rounded-lg" disabled={removing} onClick={() => setRemoveOpen(false)}>Цуцлах</Button>
          </Card>
        </div>
      ) : null}
    </PhoneFrame>
  );
}

const inputClass = "h-12 rounded-lg border-slate-200 bg-white px-3 py-0 text-sm focus-visible:border-[#f2a93c] focus-visible:ring-0 dark:border-white/10 dark:bg-[#222b44]";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "М";
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-[#222b44]">
      <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function Section({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="gap-3 rounded-lg bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#141a2c] dark:ring-white/5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <span className="text-[#a85b0a] dark:text-[#f2a93c]">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </Card>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">{label}</Label>
      {children}
    </div>
  );
}

function Select({ id, value, onChange, placeholder, options }: { id: string; value: string; onChange: (value: string) => void; placeholder: string; options: string[] }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, "w-full appearance-none pr-9")}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500 dark:text-gray-400" />
    </div>
  );
}
