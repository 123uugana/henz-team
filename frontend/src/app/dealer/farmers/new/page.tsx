"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addFarmer, ApiError } from "@/lib/api";
import { useDealerGuard } from "@/lib/use-auth-guard";

export default function AddFarmerPage() {
  useDealerGuard();
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [aimag, setAimag] = useState("");
  const [sum, setSum] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = /^\d{8}$/.test(phoneNumber) && name.trim().length >= 2 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      await addFarmer({
        phoneNumber,
        name: name.trim(),
        aimag: aimag.trim() || undefined,
        sum: sum.trim() || undefined,
      });
      router.push("/dealer/farmers");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Малчин нэмж чадсангүй.");
      setSubmitting(false);
    }
  };

  return (
    <PhoneFrame>
      <AppHeader backHref="/dealer/farmers" title="Малчин нэмэх" />

      <div className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="phoneNumber" className="text-slate-700 dark:text-gray-300">
            Утасны дугаар
          </Label>
          <Input
            id="phoneNumber"
            inputMode="numeric"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Жишээ: 99112233"
            className="h-14 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-slate-700 dark:text-gray-300">
            Нэр
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Жишээ: Б.Дорж"
            className="h-14 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="aimag" className="text-slate-700 dark:text-gray-300">
              Аймаг (заавал биш)
            </Label>
            <Input
              id="aimag"
              value={aimag}
              onChange={(e) => setAimag(e.target.value)}
              placeholder="Жишээ: Төв"
              className="h-14 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sum" className="text-slate-700 dark:text-gray-300">
              Сум (заавал биш)
            </Label>
            <Input
              id="sum"
              value={sum}
              onChange={(e) => setSum(e.target.value)}
              placeholder="Жишээ: Зуунмод"
              className="h-14 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </div>

      <Button
        variant="brand"
        size="xl"
        className="mt-8 w-full"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {submitting ? "Нэмж байна..." : "Нэмэх"}
      </Button>
    </PhoneFrame>
  );
}
