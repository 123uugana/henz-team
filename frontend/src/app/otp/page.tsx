"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PhoneFrame } from "@/components/phone-frame";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ApiError, sendOtp, verifyOtp } from "@/lib/api";
import { saveSession } from "@/lib/session";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function OtpVerificationPage() {
  return (
    <Suspense fallback={<PhoneFrame>{null}</PhoneFrame>}>
      <OtpVerificationForm />
    </Suspense>
  );
}

function OtpVerificationForm() {
  const router = useRouter();
  const phone = useSearchParams().get("phone") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!phone) {
      router.replace("/phone");
    }
  }, [phone, router]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handleVerify = async (value: string) => {
    if (value.length !== OTP_LENGTH || loading) return;
    setLoading(true);
    setError(null);

    try {
      const result = await verifyOtp(phone, value);
      saveSession(result);

      if (result.requiresProfileSetup) {
        router.push("/herd-setup");
      } else if (result.user.role === "DEALER") {
        router.push("/dealer/farmers");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setCode("");
      setError(
        err instanceof ApiError ? err.message : "Сервертэй холбогдож чадсангүй."
      );
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || resending) return;
    setResending(true);
    setError(null);

    try {
      await sendOtp(phone);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Сервертэй холбогдож чадсангүй."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <PhoneFrame>
      <BackButton href="/phone" />

      <div className="mt-10 flex flex-col items-center gap-1 text-center">
        <p className="text-base font-medium">Баталгаажуулах код оруулна уу</p>
        <p className="text-sm text-gray-400">
          {phone ? `+976 ${phone} дугаарт код илгээлээ` : " "}
        </p>
      </div>

      <InputOTP
        maxLength={OTP_LENGTH}
        value={code}
        onChange={(value) => {
          setCode(value);
          if (value.length === OTP_LENGTH) handleVerify(value);
        }}
        disabled={loading}
        containerClassName="mt-8 justify-center gap-2"
      >
        <InputOTPGroup className="gap-2">
          {Array.from({ length: OTP_LENGTH }).map((_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              className="h-14 w-11 rounded-xl border-t border-r border-b border-l border-[#f2a93c]/50 bg-[#161c2c] text-lg font-semibold text-white first:rounded-xl last:rounded-xl data-[active=true]:border-[#f2a93c] data-[active=true]:ring-0"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>

      {error ? (
        <p className="mt-4 text-center text-sm text-red-400">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={handleResend}
        disabled={resendSeconds > 0 || resending}
        className="mt-6 text-center text-sm text-gray-400 disabled:cursor-not-allowed"
      >
        {resending ? "Дахин илгээж байна..." : "Дахин код авах"}{" "}
        {resendSeconds > 0 ? (
          <span className="text-gray-300">
            (0:{resendSeconds.toString().padStart(2, "0")})
          </span>
        ) : null}
      </button>

      <Button
        variant="brand-muted"
        size="xl"
        className="mt-auto w-full"
        disabled={code.length !== OTP_LENGTH || loading}
        onClick={() => handleVerify(code)}
      >
        {loading ? "Шалгаж байна..." : "Баталгаажуулах"}
      </Button>
    </PhoneFrame>
  );
}
