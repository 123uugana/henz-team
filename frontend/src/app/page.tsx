import Link from "next/link";
import { PawPrint } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { Button } from "@/components/ui/button";

export default function SplashPage() {
  return (
    <PhoneFrame showThemeToggle className="items-center justify-between">
      <div />

      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative flex size-40 items-center justify-center rounded-full bg-amber-50 dark:bg-[#1c1408]">
          <div className="absolute inset-0 rounded-full bg-[#f2a93c] opacity-20 blur-2xl" />
          <div className="absolute inset-0 rounded-full ring-1 ring-[#f2a93c]/30" />
          <PawPrint className="relative size-16 text-[#a85b0a] dark:text-[#f2a93c]" strokeWidth={1.5} />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Хэнц Хурга</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400">Таны сүрэг таны гар утсанд</p>
        </div>
      </div>

      <Button
        variant="brand"
        size="xl"
        className="w-full"
        render={<Link href="/phone" />}
      >
        Эхлэх
      </Button>
    </PhoneFrame>
  );
}
