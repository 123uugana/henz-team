import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export function PhoneFrame({
  children,
  className,
  showThemeToggle = false,
}: {
  children: React.ReactNode;
  className?: string;
  showThemeToggle?: boolean;
}) {
  return (
    <div className="flex min-h-svh w-full justify-center bg-[#e9e5da] transition-colors dark:bg-[#0a0d17]">
      <div
        className={cn(
          "relative flex min-h-svh w-full flex-col overflow-hidden bg-linear-to-b from-[#fffdf8] via-[#faf7ef] to-[#f1ede3] px-5 py-6 text-slate-900 shadow-xl shadow-slate-900/5 transition-colors dark:from-[#141a2c] dark:via-[#10141f] dark:to-[#0a0d17] dark:text-white dark:shadow-none sm:max-w-sm sm:px-6 sm:py-8",
          className
        )}
      >
        {showThemeToggle ? (
          <div className="absolute right-4 top-4 z-40 sm:right-5 sm:top-5">
            <ThemeToggle />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
