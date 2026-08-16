"use client";

import { useMemo, useState } from "react";
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
import { getHistory } from "@/lib/store";
import { cn } from "@/lib/utils";

const RANGES = [
  { value: "7d", label: "7 хоног" },
  { value: "1m", label: "1 сар" },
  { value: "3m", label: "3 сар" },
  { value: "6m", label: "6 сар" },
  { value: "1y", label: "1 жил" },
] as const;

function downloadCsv(points: { label: string; total: number }[]) {
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
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("7d");
  const history = useMemo(() => getHistory(range), [range]);
  const latestTotal = history.points[history.points.length - 1]?.total ?? 0;

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
                ? "border-[#f2a93c] bg-[#1c1408] text-[#f2a93c]"
                : "border-white/10 bg-[#161c2c] text-gray-400"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="gap-1 bg-[#141a2c] p-3 ring-1 ring-white/5">
          <p className="text-lg font-bold">{latestTotal}</p>
          <p className="text-[11px] text-gray-400">сүргийн бүртгэлтэй мал</p>
        </Card>
        <Card className="gap-1 bg-[#141a2c] p-3 ring-1 ring-white/5">
          <p className="text-lg font-bold">
            <span className="text-emerald-400">+{history.added}</span>
            {" / "}
            <span className="text-red-400">-{history.removed}</span>
          </p>
          <p className="text-[11px] text-gray-400">
            Цэвэр: {history.added - history.removed >= 0 ? "+" : ""}
            {history.added - history.removed}
          </p>
        </Card>
        <Card className="gap-1 bg-[#141a2c] p-3 ring-1 ring-white/5">
          <p
            className={cn(
              "text-lg font-bold",
              history.todayDelta < 0 ? "text-red-400" : "text-emerald-400"
            )}
          >
            {history.todayDelta > 0 ? "+" : ""}
            {history.todayDelta}
          </p>
          <p className="text-[11px] text-gray-400">
            7 хоногийн дундаж: {history.weeklyAverage}
          </p>
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-200">
          Нийт малын тооны график
        </h2>
        <Card className="bg-[#141a2c] p-3 ring-1 ring-white/5">
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history.points} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#8b93a7", fontSize: 10 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#8b93a7", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a2030",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#8b93a7" }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#f2a93c"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#f2a93c" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Button
        variant="outline"
        className="mt-6 w-full border-white/10 bg-transparent text-white hover:bg-white/5"
        onClick={() => downloadCsv(history.points)}
      >
        <FileDown className="size-4" />
        CSV татах
      </Button>

      <BottomNav />
    </PhoneFrame>
  );
}
