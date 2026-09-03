import Link from "next/link";
import { Settings } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function AppHeader({
  backHref,
  title = "Хэнц Хурга",
  status,
  actions,
}: {
  backHref?: string;
  title?: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {backHref ? <BackButton href={backHref} /> : null}
        {!backHref ? <BrandLogo className="size-9 rounded-full" withRing /> : null}
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">{title}</p>
          {status}
        </div>
      </div>

      <div className="flex items-center">
        {actions}
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Тохиргоо"
          className="rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-300"
          render={<Link href="/profile" />}
        >
          <Settings />
        </Button>
      </div>
    </div>
  );
}
