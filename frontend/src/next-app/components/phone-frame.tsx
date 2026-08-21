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
          "relative flex min-h-svh w-full flex-col overflow-hidden bg-linear-to-b from-[#141a2c] via-[#10141f] to-[#0a0d17] px-5 py-6 text-white sm:max-w-sm sm:px-6 sm:py-8",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
