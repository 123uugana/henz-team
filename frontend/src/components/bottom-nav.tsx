"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ClipboardList, Home, PawPrint, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Нүүр", icon: Home },
  { label: "Тооллого", icon: ClipboardList },
  { href: "/animals/new", label: "Мал нэмэх", icon: Plus, accent: true },
  { href: "/animals", label: "Малууд", icon: PawPrint },
  { href: "/notifications", label: "Мэдэгдэл", icon: Bell, badge: true },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 -mx-6 flex items-center justify-between border-t border-white/5 px-4 pt-3">
      {NAV_ITEMS.map((item) => {
        const active = "href" in item && pathname === item.href;
        const Icon = item.icon;

        const content = (
          <>
            <span
              className={cn(
                "relative flex items-center justify-center",
                "accent" in item && item.accent
                  ? "-mt-6 size-12 rounded-full bg-[#f2a93c] text-[#1a1206] shadow-lg shadow-[#f2a93c]/30"
                  : "size-8"
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              {"badge" in item && item.badge ? (
                <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-red-400" />
              ) : null}
            </span>
            <span
              className={cn(
                "text-[11px]",
                active ? "text-[#f2a93c]" : "text-gray-500"
              )}
            >
              {item.label}
            </span>
          </>
        );

        const itemClassName = "flex flex-1 flex-col items-center gap-1 py-1";

        if (!("href" in item) || !item.href) {
          return (
            <span
              key={item.label}
              className={cn(itemClassName, "text-gray-500")}
            >
              {content}
            </span>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              itemClassName,
              active ? "text-white" : "text-gray-500"
            )}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
