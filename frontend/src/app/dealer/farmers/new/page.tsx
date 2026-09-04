"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, ChevronDown, IdCard, MapPinned, Nfc, Phone, ScanLine, UserPlus } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addFarmer, ApiError } from "@/lib/api";
import { useDealerGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";

const AIMAGS = ["Архангай", "Баян-Өлгий", "Булган", "Говь-Алтай", "Дорнод", "Дундговь", "Завхан", "Өвөрхангай", "Өмнөговь", "Сүхбаатар", "Сэлэнгэ", "Төв", "Увс", "Ховд", "Хөвсгөл", "Хэнтий", "Дархан-Уул", "Орхон"];
const SUMS = ["Батширээт", "Биндэр", "Баян-Адрага", "Галшар", "Дадал", "Дархан", "Дэлгэрхаан", "Жаргалтхаан", "Мөрөн", "Норовлин", "Өмнөдэлгэр", "Хэрлэн", "Цэнхэрмандал"];

export default function AddFarmerPage() {
  useDealerGuard();
  const router = useRouter();

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [aimag, setAimag] = useState("");
  const [sum, setSum] = useState("");
  const [bag, setBag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullName = [lastName.trim(), firstName.trim()].filter(Boolean).join(" ");
  const locationSum = [sum.trim(), bag.trim()].filter(Boolean).join(", ");
  const canSubmit = /^\d{8}$/.test(phoneNumber) && firstName.trim().length >= 2 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      await addFarmer({
        phoneNumber,
        name: fullName,
        aimag: aimag || undefined,
        sum: locationSum || undefined,
      });
      router.push("/dealer");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Малчин нэмэх үед алдаа гарлаа.");
      setSubmitting(false);
    }
  };

  return (
    <PhoneFrame className="px-4 pb-0 sm:px-5">
      <AppHeader
        backHref="/dealer"
        title="Малчин нэмэх"
        status={<span className="text-[10px] font-semibold uppercase tracking-wide text-[#d6c8b1]">Бүртгэлийн карт</span>}
      />

      <main className="mt-5 flex flex-1 flex-col gap-3 pb-28">
        <Card className="gap-3 rounded-lg bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#141a2c] dark:ring-white/5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f2a93c]/15">
              <UserPlus className="size-5 text-[#a85b0a] dark:text-[#f2a93c]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">Шинэ холбоос</p>
                <Badge className="bg-emerald-400/15 text-emerald-700 dark:text-emerald-300">Идэвхтэй горим</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                Малчны нэгдсэн системд шинээр малчны бүртгэл үүсгэх
              </p>
            </div>
          </div>
        </Card>

        <Section icon={<IdCard className="size-4" />} title="Хувийн мэдээлэл">
          <div className="grid grid-cols-2 gap-3">
            <Field id="lastName" label="Овог">
              <Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Овгоо оруулна уу" className={inputClass} />
            </Field>
            <Field id="firstName" label="Нэр *">
              <Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Нэрээ оруулна уу" className={inputClass} />
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
                placeholder="9911 2233"
                className="h-full flex-1 rounded-none border-0 bg-transparent px-4 py-0 focus-visible:ring-0"
              />
            </div>
          </Field>
        </Section>

        <Section icon={<MapPinned className="size-4" />} title="Байршлын мэдээлэл">
          <Field id="aimag" label="Аймаг / Хот">
            <Select id="aimag" value={aimag} onChange={setAimag} placeholder="Аймаг сонгох" options={AIMAGS} />
          </Field>
          <Field id="sum" label="Сум / Дүүрэг">
            <Select id="sum" value={sum} onChange={setSum} placeholder="Сум сонгох" options={SUMS} />
          </Field>
          <Field id="bag" label="Баг / Хороо">
            <Input id="bag" value={bag} onChange={(event) => setBag(event.target.value)} placeholder="Багийн нэр, дугаар" className={inputClass} />
          </Field>
        </Section>

        <Section
          icon={<Nfc className="size-4" />}
          title="RFID пайз холболт"
          action={<Badge className="bg-cyan-400/15 text-cyan-700 dark:text-cyan-300">Сонголтоор</Badge>}
        >
          <p className="text-xs leading-5 text-slate-500 dark:text-gray-400">
            Малчны эхний багц, хашаалаг сүргийн пайз уншигчийг одоо шууд бүртгэх эсвэл хожим системээс оноох боломжтой.
          </p>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#222b44]">
            <div className="flex items-center gap-3">
              <ScanLine className="size-5 text-[#a85b0a] dark:text-[#f2a93c]" />
              <div>
                <p className="text-xs font-semibold">Төхөөрөмж холбох</p>
                <p className="text-[11px] text-slate-500 dark:text-gray-400">Уншигч төхөөрөмжийг ойртуулна уу</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>Скан хийх</Button>
          </div>
        </Section>

        {error ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      </main>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-slate-200 bg-[#f8f5ed]/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#10141f]/95 sm:-mx-5 sm:px-5">
        <Button variant="outline" size="xl" className="flex-1 rounded-lg" onClick={() => router.push("/dealer")}>Цуцлах</Button>
        <Button variant="brand" size="xl" className="flex-1 rounded-lg gap-2" disabled={!canSubmit} onClick={handleSubmit}>
          <BadgeCheck className="size-4" />
          {submitting ? "Нэмж байна..." : "Нэмэх"}
        </Button>
      </div>
    </PhoneFrame>
  );
}

const inputClass = "h-12 rounded-lg border-slate-200 bg-white px-3 py-0 text-sm focus-visible:border-[#f2a93c] focus-visible:ring-0 dark:border-white/10 dark:bg-[#222b44]";

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
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, "w-full appearance-none pr-9")}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500 dark:text-gray-400" />
    </div>
  );
}
