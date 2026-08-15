import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PhoneEntryPage() {
  return (
    <PhoneFrame>
      <BackButton href="/" />

      <div className="mt-8 flex flex-col gap-2">
        <h1 className="text-xl font-bold leading-snug">
          Утасны дугаараа оруулна уу
        </h1>
        <p className="text-sm text-gray-400">
          Таны бүртгэлтэй дугаар руу баталгаажуулах код илгээх болно.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <Label htmlFor="phone" className="text-sm text-gray-300">
          Утасны дугаар
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="976 0000 0000"
          className="h-14 border-[#f2a93c]/40 bg-[#161c2c] px-4 py-0 text-base text-white placeholder:text-gray-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
        />
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <MessageSquareText className="size-4 shrink-0" />
          <span>SMS-ээр баталгаажуулах код ирнэ</span>
        </div>

        <Button
          variant="brand-muted"
          size="xl"
          className="w-full"
          render={<Link href="/otp" />}
        >
          Код авах
        </Button>
      </div>
    </PhoneFrame>
  );
}
