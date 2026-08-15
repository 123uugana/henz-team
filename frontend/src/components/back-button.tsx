import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ href }: { href: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="rounded-full text-gray-300 hover:bg-white/5 hover:text-gray-300"
      render={<Link href={href} aria-label="Буцах" />}
    >
      <ArrowLeft />
    </Button>
  );
}
