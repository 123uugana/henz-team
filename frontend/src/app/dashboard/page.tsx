import Link from "next/link";
import { Footprints, Rabbit, PawPrint, TriangleAlert, Warehouse } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const herdStats = [
  { icon: Footprints, count: 420, label: "Бэлчээрт гарсан" },
  { icon: Warehouse, count: 422, label: "Хашаанд орсон" },
];

const speciesStats = [
  { icon: PawPrint, percent: "65%", label: "Хонь" },
  { icon: Rabbit, percent: "35%", label: "Ямаа" },
];

const recentActivity = [
  { icon: PawPrint, name: "Хонь #4928", time: "2 минутын өмнө" },
  { icon: Rabbit, name: "Ямаа #1103", time: "5 минутын өмнө" },
];

export default function DashboardPage() {
  return (
    <PhoneFrame>
      <AppHeader
        status={
          <Link
            href="/devices"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300"
          >
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Идэвхтэй холбогдсон
          </Link>
        }
      />

      <div className="mt-6 flex flex-col gap-5">
        <Card className="gap-3 bg-[#1c1408] p-4 ring-1 ring-[#f2a93c]/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-[#f2a93c]">
              <TriangleAlert className="size-4" />
              Өнөөдрийн дутуу мал
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[#f2a93c]/50 bg-transparent text-[#f2a93c] hover:bg-[#f2a93c]/10"
              render={<Link href="/missing" />}
            >
              Дэлгэрэнгүй →
            </Button>
          </div>
          <p className="text-3xl font-bold">
            12 <span className="text-base font-normal text-gray-400">толгой</span>
          </p>
        </Card>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Сүргийн байдал</h2>
            <span className="text-xs text-gray-400">Нийт: 854</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {herdStats.map(({ icon: Icon, count, label }) => (
              <Card
                key={label}
                className="gap-1 bg-[#141a2c] p-4 ring-1 ring-white/5"
              >
                <Icon className="size-5 text-[#f2a93c]" strokeWidth={1.75} />
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {speciesStats.map(({ icon: Icon, percent, label }) => (
              <Card
                key={label}
                className="flex-row items-center gap-3 bg-[#141a2c] p-4 ring-1 ring-white/5"
              >
                <Icon className="size-5 text-[#f2a93c]" strokeWidth={1.75} />
                <div className="flex flex-col">
                  <p className="text-base font-bold">{percent}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-200">
            Сүүлийн үйлдлүүд
          </h2>

          <div className="flex flex-col gap-2">
            {recentActivity.map(({ icon: Icon, name, time }) => (
              <Card
                key={name}
                className="flex-row items-center justify-between gap-3 bg-[#141a2c] p-3 ring-1 ring-white/5"
              >
                <CardContent className="flex items-center gap-3 px-0">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/5">
                    <Icon className="size-4 text-[#f2a93c]" strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-gray-400">{time}</p>
                  </div>
                </CardContent>
                <Badge className="mr-3 bg-emerald-400/15 text-emerald-400">
                  Орсон
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </PhoneFrame>
  );
}
