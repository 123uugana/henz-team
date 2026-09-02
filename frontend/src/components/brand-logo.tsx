import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  withRing = false,
}: {
  className?: string;
  withRing?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#202020]",
        withRing && "border border-[#f0a93c]/45 shadow-sm shadow-[#f0a93c]/15",
        className,
      )}
    >
      <Image src="/brand-logo.png" alt="Хэнц Хурга" width={96} height={96} className="h-full w-full object-cover" />
    </span>
  );
}
