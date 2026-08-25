"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, sendOtp } from "@/lib/api";
const PHONE_LENGTH = 8;
const VERIFIED_PHONE = "80163296";

export default function PhoneEntryPage() {
  const router = useRouter();
  const [phone, setPhone] = useState(VERIFIED_PHONE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = phone.length === PHONE_LENGTH;
  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    console.log("OTP ");
    try {
      await sendOtp(phone);
      console.log("OTP sent successfully" + phone);
      router.push(`/otp?phone=${phone}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Сервертэй холбогдож чадсангүй.",
      );
      setLoading(false);
    }
  };

  return (
    <PhoneFrame showThemeToggle>
      <BackButton href="/" />

      <div className="mt-8 flex flex-col gap-2">
        <h1 className="text-xl font-bold leading-snug">
          Утасны дугаараа оруулна уу
        </h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Баталгаажсан дугаар руу баталгаажуулах код илгээх болно.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <Label htmlFor="phone" className="text-sm text-slate-700 dark:text-gray-300">
          Утасны дугаар
        </Label>
        <div className="flex h-14 items-center rounded-2xl border border-[#f2a93c]/40 bg-white dark:bg-[#161c2c] focus-within:border-[#f2a93c]">
          <span className="pl-4 pr-1 text-base text-slate-500 dark:text-gray-400">+976</span>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoFocus
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH))
            }
            placeholder={VERIFIED_PHONE}
            className="h-full flex-1 border-none bg-transparent px-0 pr-4 py-0 text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:ring-0"
          />
        </div>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
          <MessageSquareText className="size-4 shrink-0" />
          <span>SMS-ээр баталгаажуулах код ирнэ</span>
        </div>

        <Button
          variant="brand-muted"
          size="xl"
          className="w-full"
          disabled={!isValid || loading}
          onClick={handleSubmit}
        >
          {loading ? "Илгээж байна..." : "Код авах"}
        </Button>
      </div>
    </PhoneFrame>
  );
}
