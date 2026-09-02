import Link from "next/link";
import { Plus } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { PhoneFrame } from "@/components/phone-frame";
import { Button } from "@/components/ui/button";

export default function HerdSetupIntroPage() {
  return (
    <PhoneFrame showThemeToggle className="items-center justify-between">
      <div className="relative mt-4 flex size-56 items-center justify-center rounded-full bg-white dark:bg-[#141a2c] ring-1 ring-[#f2a93c]/20">
        <div className="absolute inset-6 rounded-full bg-[#f2a93c]/10 blur-2xl" />
        <BrandLogo className="relative size-36 rounded-full" withRing />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Тавтай морил!</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Малынхаа дугаарыг уншуулж, апп-даа нэмнэ үү
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <Button
          variant="brand"
          size="xl"
          className="w-full"
          render={<Link href="/animals/new" />}
        >
          <Plus />
          Мал нэмэх
        </Button>
        <Button
          variant="link"
          className="h-auto p-0 text-sm text-[#a85b0a]/90 dark:text-[#f2a93c]/90"
          render={<Link href="/dashboard" />}
        >
          Нүүр хуудасруу шилжих
        </Button>
      </div>
    </PhoneFrame>
  );
}
