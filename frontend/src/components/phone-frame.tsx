import { cn } from "@/lib/utils";

export function PhoneFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-svh w-full bg-[#0a0d17] flex justify-center">
      <div
        className={cn(
          "relative flex min-h-svh w-full max-w-sm flex-col overflow-hidden bg-gradient-to-b from-[#141a2c] via-[#10141f] to-[#0a0d17] px-6 py-8 text-white",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
