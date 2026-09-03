"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronRight,
  MapPin,
  PawPrint,
  RefreshCw,
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
  const { data: dashboard, loading, error, refresh } = useApi(getDashboard, "");
  const [activeScan, setActiveScan] = useState<DashboardScan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    refresh().finally(() => setRefreshing(false));
  };

  const total = dashboard?.totalLivestock ?? 0;
  const missingCount = dashboard?.today.unscannedLivestock ?? 0;
  const returned = dashboard?.today.scannedLivestock ?? 0;

  return (
    <PhoneFrame>
      <AppHeader
        actions={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Шинэчлэх"
            onClick={handleRefresh}
            className="rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
          </Button>
        }
        status={
          <Link
            href="/devices"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300"
          >
            <span
              className={`size-1.5 rounded-full ${(dashboard?.activeReaderCount ?? 0) > 0 ? "bg-emerald-400" : "bg-slate-400"}`}
            />
            {(dashboard?.activeReaderCount ?? 0) > 0
              ? `${dashboard?.activeReaderCount} уншигч идэвхтэй`
              : "Идэвхтэй уншигч алга"}
          </Link>
        }
      />

      {loading ? (
        <p className="mt-10 text-center text-sm text-slate-500 dark:text-gray-400">
          Ачаалж байна...
        </p>
      ) : error ? (
        <p className="mt-10 text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <Card className="gap-3 bg-amber-50 dark:bg-[#1c1408] p-4 ring-1 ring-[#f2a93c]/20">
            <div className="flex items-center gap-2 text-sm font-medium text-[#a85b0a] dark:text-[#f2a93c]">
              <TriangleAlert className="size-4" />
              Өнөөдөр уншигдаагүй мал
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{missingCount}</p>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  {total}-аас {returned} мал уншигдсан
                </p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-lg font-bold">{total}</p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">
                    Нийт
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {returned}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">
                    Орсон
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-[#f2a93c]/50 bg-transparent text-[#a85b0a] dark:text-[#f2a93c] hover:bg-[#f2a93c]/10"
              render={<Link href="/missing" />}
            >
              Дутуу мал ({missingCount}) →
            </Button>
          </Card>

          <Link href="/scan">
            <Card className="flex-row items-center gap-3 bg-white dark:bg-[#141a2c] p-4 ring-1 ring-slate-200/80 dark:ring-white/5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f2a93c]/15">
                <ScanLine
                  className="size-5 text-[#a85b0a] dark:text-[#f2a93c]"
                  strokeWidth={1.75}
                />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-sm font-semibold">
                  Уншигчаар бөөнөөр бүртгэх
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  RFID уншигчаар олон малыг нэг дор бүртгэ
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-400 dark:text-gray-500" />
            </Card>
          </Link>

          {dashboard && dashboard.recentScans.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                Сүүлийн өөрчлөлт
              </h2>

              <div className="flex flex-col gap-2">
                {dashboard.recentScans.map((scan) => (
                  <Card
                    key={scan.id}
                    className="flex-row items-center justify-between gap-3 bg-white dark:bg-[#141a2c] p-3 ring-1 ring-slate-200/80 dark:ring-white/5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
                        <PawPrint
                          className="size-4 text-[#a85b0a] dark:text-[#f2a93c]"
                          strokeWidth={1.75}
                        />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <p className="truncate text-sm font-medium">
                          {scan.epc} ·{" "}
                          {scan.livestock
                            ? scan.livestock.name || scan.livestock.earNumber
                            : "Тодорхойгүй tag"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">
                          {scan.direction === "ENTER"
                            ? "Орсон"
                            : scan.direction === "EXIT"
                              ? "Гарсан"
                              : "Уншигдсан"}{" "}
                          · {new Date(scan.scannedAt).toLocaleString("mn-MN")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveScan(scan)}
                      className="shrink-0 text-xs font-medium text-[#a85b0a] dark:text-[#f2a93c]"
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

      <Sheet
        open={activeScan !== null}
        onOpenChange={(open) => !open && setActiveScan(null)}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#141a2c] px-6 pb-8 pt-2 text-slate-900 dark:text-white"
        >
          <SheetHeader className="items-center px-0 pb-2 pt-4">
            <div className="mb-1 h-1 w-10 rounded-full bg-slate-300 dark:bg-white/15" />
            <SheetTitle className="text-slate-900 dark:text-white">
              Сканы дэлгэрэнгүй
            </SheetTitle>
          </SheetHeader>

          {activeScan ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
                  <PawPrint
                    className="size-6 text-[#a85b0a] dark:text-[#f2a93c]"
                    strokeWidth={1.5}
                  />
                </span>
                <div className="flex flex-col">
                  <p className="text-base font-semibold">
                    {activeScan.livestock
                      ? activeScan.livestock.name ||
                        activeScan.livestock.earNumber
                      : "Тодорхойгүй tag"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Tag EPC: {activeScan.epc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col gap-1 rounded-2xl bg-slate-100 dark:bg-white/5 p-3">
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    Дугаар
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="size-3.5 text-[#a85b0a] dark:text-[#f2a93c]" />
                    {activeScan.livestock?.earNumber ?? "Бүртгэлгүй"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-2xl bg-slate-100 dark:bg-white/5 p-3">
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    Цаг
                  </span>
                  <span className="font-medium">
                    {new Date(activeScan.scannedAt).toLocaleString("mn-MN")}
                  </span>
                </div>
              </div>

              <Badge
                className={
                  activeScan.direction === "ENTER"
                    ? "w-fit bg-emerald-400/15 text-emerald-700 dark:text-emerald-400"
                    : activeScan.direction === "EXIT"
                      ? "w-fit bg-red-500/15 text-red-600 dark:text-red-400"
                      : "w-fit bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-gray-300"
                }
              >
                {activeScan.direction === "ENTER"
                  ? "Орсон"
                  : activeScan.direction === "EXIT"
                    ? "Гарсан"
                    : "Уншигдсан"}
              </Badge>

              {activeScan.livestock ? (
                <Button
                  variant="brand"
                  size="xl"
                  className="w-full"
                  render={<Link href={`/animals/${activeScan.livestock.id}`} />}
                >
                  Малын хуудас руу очих
                </Button>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <BottomNav />
    </PhoneFrame>
  );
}
