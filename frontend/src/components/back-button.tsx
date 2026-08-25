import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ href }: { href: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-300"
      render={<Link href={href} aria-label="Буцах" />}
    >
      <ArrowLeft />
    </Button>
  );
}
