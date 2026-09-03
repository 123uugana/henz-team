"use client";

import Link from "next/link";
import { Antenna, Clock, MapPin, Radio } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDashboard } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";

export default function DeviceHealthPage() {
  useAuthGuard();
  const { data, loading, error } = useApi(getDashboard, "devices");

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" title="Төхөөрөмжийн төлөв" />
      {loading ? <p className="mt-10 text-center text-sm text-slate-500 dark:text-gray-400">Ачаалж байна...</p> : null}
      {error ? <p className="mt-10 text-center text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {data ? (
        <>
          <Button
            variant="brand"
            size="xl"
            className="mt-6 w-full"
            render={<Link href="/scan" />}
          >
            Уншигчаар унших →
          </Button>

          <Card className="mt-4 flex-row items-center justify-between bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#141a2c] dark:ring-white/5">
            <div className="flex items-center gap-3">
              <Radio className="size-5 text-[#a85b0a] dark:text-[#f2a93c]" />
              <div><p className="text-sm font-semibold">RFID уншигч</p><p className="text-xs text-slate-500 dark:text-gray-400">Нийт {data.readerCount} төхөөрөмж</p></div>
            </div>
            <Badge className={data.activeReaderCount > 0 ? "bg-emerald-400/15 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400"}>
              {data.activeReaderCount > 0 ? `${data.activeReaderCount} ONLINE` : "OFFLINE"}
            </Badge>
          </Card>
          <div className="mt-4 flex flex-col gap-3">
            {data.readers.map((reader) => (
              <Card key={reader.id} className="gap-3 bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#141a2c] dark:ring-white/5">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5"><Antenna className="size-4 text-[#a85b0a] dark:text-[#f2a93c]" /></span>
                  <Badge className={reader.isActiveToday ? "bg-emerald-400/15 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400"}>{reader.isActiveToday ? "ONLINE" : "OFFLINE"}</Badge>
                </div>
                <div><p className="text-sm font-semibold">{reader.name}</p><p className="text-xs text-slate-500 dark:text-gray-400">ID: {reader.id}</p></div>
                {reader.location ? <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400"><MapPin className="size-3" />{reader.location}</p> : null}
                <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400"><Clock className="size-3" />{reader.lastScanAt ? `Сүүлийн уншилт: ${new Date(reader.lastScanAt).toLocaleString("mn-MN")}` : "Уншилт бүртгэгдээгүй"}</p>
                {reader.lastEpc ? <p className="text-xs text-slate-500 dark:text-gray-400">EPC: {reader.lastEpc}</p> : null}
              </Card>
            ))}
            {data.readers.length === 0 ? <p className="py-10 text-center text-sm text-slate-500 dark:text-gray-400">Бүртгэлтэй RFID уншигч алга байна.</p> : null}
          </div>
        </>
      ) : null}
      <BottomNav />
    </PhoneFrame>
  );
}
