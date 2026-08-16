import Link from "next/link";
import { Settings } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function AppHeader({
  backHref,
  title = "Хэнц Хурга",
  status,
}: {
  backHref?: string;
  title?: string;
  status?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {backHref ? (
          <BackButton href={backHref} />
        ) : (
          <Logo className="size-8 shrink-0 text-[#f2a93c]" />
        )}
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">{title}</p>
          {status}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Тохиргоо"
        className="rounded-full text-gray-300 hover:bg-white/5 hover:text-gray-300"
        render={<Link href="/profile" />}
      >
        <Settings />
      </Button>
    </div>
  );
}
