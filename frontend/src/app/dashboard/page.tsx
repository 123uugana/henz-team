"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MapPin,
  PawPrint,
  Rabbit,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getDashboard, type DashboardScan } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";

export default function DashboardPage() {
  useAuthGuard();
  const { data: dashboard, loading, error } = useApi(getDashboard, "");
  const [activeScan, setActiveScan] = useState<DashboardScan | null>(null);

  const total = dashboard?.totalLivestock ?? 0;
  const missingCount = dashboard?.missingCount ?? 0;
  const returned = total - missingCount;
  const sheepCount = dashboard?.sheepCount ?? 0;
  const goatCount = dashboard?.goatCount ?? 0;
  const speciesTotal = sheepCount + goatCount;
  const sheepPercent = speciesTotal > 0 ? Math.round((sheepCount / speciesTotal) * 100) : 0;
  const goatPercent = speciesTotal > 0 ? 100 - sheepPercent : 0;

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

      {loading ? (
        <p className="mt-10 text-center text-sm text-gray-500">Ачаалж байна...</p>
      ) : error ? (
        <p className="mt-10 text-center text-sm text-red-400">{error}</p>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <Card className="gap-3 bg-[#1c1408] p-4 ring-1 ring-[#f2a93c]/20">
            <div className="flex items-center gap-2 text-sm font-medium text-[#f2a93c]">
              <TriangleAlert className="size-4" />
              Өнөөдрийн дутуу мал
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{missingCount}</p>
                <p className="text-xs text-gray-400">
                  {total}-аас {returned} мал буцаж орсон
                </p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-lg font-bold">{total}</p>
                  <p className="text-[11px] text-gray-400">Нийт</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-400">{returned}</p>
                  <p className="text-[11px] text-gray-400">Орсон</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-[#f2a93c]/50 bg-transparent text-[#f2a93c] hover:bg-[#f2a93c]/10"
              render={<Link href="/missing" />}
            >
              Дутуу мал харах →
            </Button>
          </Card>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-200">Сүргийн байдал</h2>

            <div className="grid grid-cols-2 gap-3">
              <Card className="gap-1 bg-[#141a2c] p-4 ring-1 ring-white/5">
                <PawPrint className="size-5 text-[#f2a93c]" strokeWidth={1.75} />
                <p className="text-xl font-bold">{total}</p>
                <p className="text-xs text-gray-400">Нийт бүртгэлтэй</p>
              </Card>
              <Card className="gap-1 bg-[#141a2c] p-4 ring-1 ring-white/5">
                <ScanLine className="size-5 text-[#f2a93c]" strokeWidth={1.75} />
                <p className="text-xl font-bold">{dashboard?.scannedToday ?? 0}</p>
                <p className="text-xs text-gray-400">Өнөөдөр уншигдсан</p>
              </Card>
            </div>

            {speciesTotal > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <Card className="flex-row items-center gap-3 bg-[#141a2c] p-4 ring-1 ring-white/5">
                  <PawPrint className="size-5 text-[#f2a93c]" strokeWidth={1.75} />
                  <div className="flex flex-col">
                    <p className="text-base font-bold">{sheepPercent}%</p>
                    <p className="text-xs text-gray-400">Хонь</p>
                  </div>
                </Card>
                <Card className="flex-row items-center gap-3 bg-[#141a2c] p-4 ring-1 ring-white/5">
                  <Rabbit className="size-5 text-[#f2a93c]" strokeWidth={1.75} />
                  <div className="flex flex-col">
                    <p className="text-base font-bold">{goatPercent}%</p>
                    <p className="text-xs text-gray-400">Ямаа</p>
                  </div>
                </Card>
              </div>
            ) : null}
          </div>

          {dashboard && dashboard.recentScans.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-200">
                Сүүлийн өөрчлөлт
              </h2>

              <div className="flex flex-col gap-2">
                {dashboard.recentScans.map((scan) => (
                  <Card
                    key={scan.id}
                    className="flex-row items-center justify-between gap-3 bg-[#141a2c] p-3 ring-1 ring-white/5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/5">
                        <PawPrint className="size-4 text-[#f2a93c]" strokeWidth={1.75} />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <p className="truncate text-sm font-medium">
                          {scan.epc} · {scan.livestock.name || scan.livestock.earNumber}
                        </p>
                        <p className="text-xs text-gray-400">
                          {scan.direction === "ENTER" ? "Орсон" : "Гарсан"} ·{" "}
                          {new Date(scan.scannedAt).toLocaleString("mn-MN")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveScan(scan)}
                      className="shrink-0 text-xs font-medium text-[#f2a93c]"
                    >
                      Харах →
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Sheet open={activeScan !== null} onOpenChange={(open) => !open && setActiveScan(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl border-white/10 bg-[#141a2c] px-6 pb-8 pt-2 text-white">
          <SheetHeader className="items-center px-0 pb-2 pt-4">
            <div className="mb-1 h-1 w-10 rounded-full bg-white/15" />
            <SheetTitle className="text-white">Сканы дэлгэрэнгүй</SheetTitle>
          </SheetHeader>

          {activeScan ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-white/5">
                  <PawPrint className="size-6 text-[#f2a93c]" strokeWidth={1.5} />
                </span>
                <div className="flex flex-col">
                  <p className="text-base font-semibold">
                    {activeScan.livestock.name || activeScan.livestock.earNumber}
                  </p>
                  <p className="text-xs text-gray-400">Tag EPC: {activeScan.epc}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col gap-1 rounded-2xl bg-white/5 p-3">
                  <span className="text-xs text-gray-400">Дугаар</span>
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="size-3.5 text-[#f2a93c]" />
                    {activeScan.livestock.earNumber}
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-2xl bg-white/5 p-3">
                  <span className="text-xs text-gray-400">Цаг</span>
                  <span className="font-medium">
                    {new Date(activeScan.scannedAt).toLocaleString("mn-MN")}
                  </span>
                </div>
              </div>

              <Badge
                className={
                  activeScan.direction === "ENTER"
                    ? "w-fit bg-emerald-400/15 text-emerald-400"
                    : "w-fit bg-red-500/15 text-red-400"
                }
              >
                {activeScan.direction === "ENTER" ? "Орсон" : "Гарсан"}
              </Badge>

              <Button
                variant="brand"
                size="xl"
                className="w-full"
                render={<Link href={`/animals/${activeScan.livestock.id}`} />}
              >
                Малын хуудас руу очих
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <BottomNav />
    </PhoneFrame>
  );
}
