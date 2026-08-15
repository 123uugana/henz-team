"use client";

import Link from "next/link";
import { useState } from "react";
import { PhoneFrame } from "@/components/phone-frame";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const OTP_LENGTH = 6;

export default function OtpVerificationPage() {
  const [code, setCode] = useState("");

  return (
    <PhoneFrame>
      <BackButton href="/phone" />

      <div className="mt-10 flex flex-col items-center gap-1 text-center">
        <p className="text-base font-medium">Баталгаажуулах код оруулна уу</p>
        <p className="text-sm text-gray-400">
          +976 99123456 дугаарт код илгээлээ
        </p>
      </div>

      <InputOTP
        maxLength={OTP_LENGTH}
        value={code}
        onChange={setCode}
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

      <p className="mt-6 text-center text-sm text-gray-400">
        Дахин код авах <span className="text-gray-300">(0:58)</span>
      </p>

      <Button
        variant="brand-muted"
        size="xl"
        className="mt-auto w-full"
        render={<Link href="/herd-setup" />}
      >
        Баталгаажуулах
      </Button>
    </PhoneFrame>
  );
}
