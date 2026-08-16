"use client";

import Link from "next/link";
import { Bell, CheckCircle2, Info } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { listAlerts, readAlert, readAllAlerts, type Alert } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";

const ICON: Record<Alert["type"], typeof Bell> = {
  MISSING: Bell,
  FOUND: CheckCircle2,
  SYSTEM: Info,
};

const TONE: Record<Alert["type"], string> = {
  MISSING: "text-red-400 bg-red-500/10",
  FOUND: "text-emerald-400 bg-emerald-500/10",
  SYSTEM: "text-sky-400 bg-sky-500/10",
};

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  if (sameDay(date, today)) return "өнөөдөр";
  if (sameDay(date, yesterday)) return "өчигдөр";
  return date.toLocaleDateString("mn-MN");
}

export default function NotificationsPage() {
  useAuthGuard();
  const { data: alerts, loading, error, refresh } = useApi(listAlerts, "");

  const groups = new Map<string, Alert[]>();
  for (const alert of alerts ?? []) {
    const label = dayLabel(alert.createdAt);
    groups.set(label, [...(groups.get(label) ?? []), alert]);
  }

  const handleOpen = async (item: Alert) => {
    if (!item.isRead) {
      await readAlert(item.id);
      refresh();
    }
  };

  const handleReadAll = async () => {
    await readAllAlerts();
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

      {loading ? (
        <p className="mt-10 text-center text-sm text-gray-500">Ачаалж байна...</p>
      ) : error ? (
        <p className="mt-10 text-center text-sm text-red-400">{error}</p>
      ) : (alerts ?? []).length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">Мэдэгдэл алга байна.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {[...groups.entries()].map(([day, items]) => (
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
                          {!item.isRead ? (
                            <span className="size-1.5 shrink-0 rounded-full bg-[#f2a93c]" />
                          ) : null}
                          <span className="ml-auto shrink-0 text-xs text-gray-500">
                            {new Date(item.createdAt).toLocaleTimeString("mn-MN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{item.message}</p>
                      </div>
                    </Card>
                  );

                  return item.livestockId ? (
                    <Link
                      key={item.id}
                      href={`/animals/${item.livestockId}`}
                      onClick={() => handleOpen(item)}
                    >
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
          ))}
        </div>
      )}

      <BottomNav />
    </PhoneFrame>
  );
}
