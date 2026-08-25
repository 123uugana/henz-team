import Link from "next/link";
import { Settings } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { ThemeToggle } from "@/components/theme-toggle";
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
        {backHref ? <BackButton href={backHref} /> : null}
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">{title}</p>
          {status}
        </div>
      </div>

      <div className="flex items-center">
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
