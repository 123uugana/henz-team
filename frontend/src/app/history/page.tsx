"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHistory, type HistoryPoint, type HistoryRangeKey } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";

const RANGES: { value: HistoryRangeKey; label: string }[] = [
  { value: "7d", label: "7 хоног" },
  { value: "1m", label: "1 сар" },
  { value: "3m", label: "3 сар" },
  { value: "6m", label: "6 сар" },
  { value: "1y", label: "1 жил" },
];

function downloadCsv(points: HistoryPoint[]) {
  const rows = ["Огноо,Нийт мал", ...points.map((p) => `${p.label},${p.total}`)];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "malyn-tuuh.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  useAuthGuard();
  const [range, setRange] = useState<HistoryRangeKey>("7d");
  const { data: history, loading, error } = useApi(() => getHistory(range), range);
  const latestTotal = history?.points.at(-1)?.total ?? 0;

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" title="Малын хөдөлгөөний түүх" />

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {RANGES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setRange(value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              range === value
                ? "border-[#f2a93c] bg-amber-50 dark:bg-[#1c1408] text-[#a85b0a] dark:text-[#f2a93c]"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] text-slate-500 dark:text-gray-400"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-slate-500 dark:text-gray-400">Ачаалж байна...</p>
      ) : error ? (
        <p className="mt-10 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : history ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Card className="gap-1 bg-white dark:bg-[#141a2c] p-3 ring-1 ring-slate-200/80 dark:ring-white/5">
              <p className="text-lg font-bold">{latestTotal}</p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">сүргийн бүртгэлтэй мал</p>
            </Card>
            <Card className="gap-1 bg-white dark:bg-[#141a2c] p-3 ring-1 ring-slate-200/80 dark:ring-white/5">
              <p className="text-lg font-bold">
                <span className="text-emerald-700 dark:text-emerald-400">+{history.added}</span>
                {" / "}
                <span className="text-red-600 dark:text-red-400">-{history.removed}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">
                Цэвэр: {history.added - history.removed >= 0 ? "+" : ""}
                {history.added - history.removed}
              </p>
            </Card>
            <Card className="gap-1 bg-white dark:bg-[#141a2c] p-3 ring-1 ring-slate-200/80 dark:ring-white/5">
              <p
                className={cn(
                  "text-lg font-bold",
                  history.todayDelta < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                {history.todayDelta > 0 ? "+" : ""}
                {history.todayDelta}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">өнөөдрийн өөрчлөлт</p>
            </Card>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300">
              Нийт малын тооны график
            </h2>
            <Card className="bg-white dark:bg-[#141a2c] p-3 ring-1 ring-slate-200/80 dark:ring-white/5">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history.points} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
                      axisLine={{ stroke: "var(--chart-grid)" }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--chart-tooltip-bg)",
                        border: "1px solid var(--chart-tooltip-border)",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "var(--chart-tooltip-fg)",
                      }}
                      labelStyle={{ color: "var(--chart-axis)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="var(--chart-accent)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "var(--chart-accent)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Button
            variant="outline"
            className="mt-6 w-full border-slate-200 dark:border-white/10 bg-transparent text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5"
            onClick={() => downloadCsv(history.points)}
          >
            <FileDown className="size-4" />
            CSV татах
          </Button>
        </>
      ) : null}

      <BottomNav />
    </PhoneFrame>
  );
}
