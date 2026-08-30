"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudSun, ClipboardList, Home, PawPrint, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Нүүр", icon: Home },
  { href: "/missing", label: "Тооллого", icon: ClipboardList },
  { href: "/animals/new", label: "Мал нэмэх", icon: Plus, accent: true },
  { href: "/animals", label: "Бүртгэл", icon: PawPrint },
  { href: "/weather", label: "Цаг агаар", icon: CloudSun },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Reserves scroll space so fixed nav below never covers content. */}
      <div className="h-24 shrink-0" aria-hidden />

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full items-center justify-between border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-colors dark:border-white/10 dark:bg-[#10141f]/95 dark:shadow-none sm:max-w-sm">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-1",
                active
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-gray-500",
              )}
            >
              <span
                className={cn(
                  "relative flex items-center justify-center",
                  "accent" in item && item.accent
                    ? "-mt-6 size-12 rounded-full bg-[#f2a93c] text-[#1a1206] shadow-lg shadow-[#f2a93c]/30"
                    : "size-8",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              <span
                className={cn(
                  "text-[11px]",
                  active
                    ? "text-[#a85b0a] dark:text-[#f2a93c]"
                    : "text-slate-500 dark:text-gray-500",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
