import Link from "next/link";
import { BatteryWarning, Bell, CheckCircle2, Info } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";

const groups = [
  {
    label: "өнөөдөр",
    items: [
      {
        id: "missing-lambs",
        icon: Bell,
        tone: "text-red-400 bg-red-500/10",
        title: "Хурга алга болсон",
        time: "10:45",
        description:
          "Хотын баруун хашаанд захиас 2 хурга тасарч явсан байна. Яаралтай шалгана уу.",
        unread: true,
        href: "/missing",
      },
      {
        id: "battery-low",
        icon: BatteryWarning,
        tone: "text-[#f2a93c] bg-[#f2a93c]/10",
        title: "Төхөөрөмжийн цэнэг бага",
        time: "08:12",
        description:
          "Дрон-02 төхөөрөмжийн батерей 15% хүрсэн байна. Цэнэглэгчид залгана уу.",
        unread: true,
        href: "/devices",
      },
    ],
  },
  {
    label: "өчигдөр",
    items: [
      {
        id: "motion",
        icon: Info,
        tone: "text-sky-400 bg-sky-500/10",
        title: "Гадаас хөдөлгөөн илэрлээ",
        time: "19:30",
        description:
          "Зүүн хойд зурт сургийн гадна хөдөлгөөн бүртгэгдлээ. Камерын дэлгэцийг шалгана уу.",
        unread: false,
        href: null,
      },
      {
        id: "census-done",
        icon: CheckCircle2,
        tone: "text-emerald-400 bg-emerald-500/10",
        title: "Тооллого амжилттай",
        time: "17:00",
        description:
          "Оройн зэлж тооллого дуусла. Нийт 450 толгой мал бүрэн байна.",
        unread: false,
        href: null,
      },
    ],
  },
];

export default function NotificationsPage() {
  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" />

      <div className="mt-6 flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Мэдэгдэл</h1>
        <button
          type="button"
          className="text-xs font-medium text-[#f2a93c]/90 hover:underline"
        >
          Бүгдийг унших болгох
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500">{group.label}</p>

            <div className="flex flex-col gap-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                const row = (
                  <Card className="flex-row items-start gap-3 bg-[#141a2c] p-3 ring-1 ring-white/5">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${item.tone}`}
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
                        {item.description}
                      </p>
                    </div>
                  </Card>
                );

                return item.href ? (
                  <Link key={item.id} href={item.href}>
                    {row}
                  </Link>
                ) : (
                  <div key={item.id}>{row}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </PhoneFrame>
  );
}
