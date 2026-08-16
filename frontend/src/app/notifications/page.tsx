"use client";

import Link from "next/link";
import {
  BatteryWarning,
  Bell,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import {
  markAllNotificationsRead,
  markNotificationRead,
  useNotifications,
  type AppNotification,
  type NotificationType,
} from "@/lib/store";

const ICON: Record<NotificationType, typeof Bell> = {
  missing: Bell,
  battery: BatteryWarning,
  motion: Info,
  census: CheckCircle2,
  external: ShieldAlert,
};

const TONE: Record<NotificationType, string> = {
  missing: "text-red-400 bg-red-500/10",
  battery: "text-[#f2a93c] bg-[#f2a93c]/10",
  motion: "text-sky-400 bg-sky-500/10",
  census: "text-emerald-400 bg-emerald-500/10",
  external: "text-red-400 bg-red-500/10",
};

export default function NotificationsPage() {
  const [notifications, refresh] = useNotifications();

  const groups = ["өнөөдөр", "өчигдөр"] as const;

  const handleOpen = (item: AppNotification) => {
    if (item.unread) {
      markNotificationRead(item.id);
      refresh();
    }
  };

  const handleReadAll = () => {
    markAllNotificationsRead();
    refresh();
  };

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" />

      <div className="mt-6 flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Мэдэгдэл</h1>
        <button
          type="button"
          onClick={handleReadAll}
          className="text-xs font-medium text-[#f2a93c]/90 hover:underline"
        >
          Бүгдийг унших болгох
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-5">
        {groups.map((day) => {
          const items = notifications.filter((n) => n.day === day);
          if (items.length === 0) return null;

          return (
            <div key={day} className="flex flex-col gap-2">
              <p className="text-xs font-medium text-gray-500">{day}</p>

              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const Icon = ICON[item.type];
                  const row = (
                    <Card className="flex-row items-start gap-3 bg-[#141a2c] p-3 ring-1 ring-white/5">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${TONE[item.type]}`}
                      >
                        <Icon className="size-4" strokeWidth={1.75} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.unread ? (
                            <span className="size-1.5 shrink-0 rounded-full bg-[#f2a93c]" />
                          ) : null}
                          <span className="ml-auto shrink-0 text-xs text-gray-500">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {item.message}
                        </p>
                        {item.meta ? (
                          <p className="text-xs text-gray-500">
                            {item.meta.tag} · {item.meta.owner}
                          </p>
                        ) : null}
                      </div>
                    </Card>
                  );

                  return item.href ? (
                    <Link key={item.id} href={item.href} onClick={() => handleOpen(item)}>
                      {row}
                    </Link>
                  ) : (
                    <div key={item.id} onClick={() => handleOpen(item)}>
                      {row}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </PhoneFrame>
  );
}
