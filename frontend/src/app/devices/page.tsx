import { Antenna, Router, Signal, Wifi } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type HealthStatus = "ONLINE" | "WARNING" | "OFFLINE";

const STATUS_TONE: Record<HealthStatus, string> = {
  ONLINE: "bg-emerald-400/15 text-emerald-400",
  WARNING: "bg-[#f2a93c]/15 text-[#f2a93c]",
  OFFLINE: "bg-red-500/15 text-red-400",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  ONLINE: "ONLINE",
  WARNING: "WARNING",
  OFFLINE: "OFFLINE",
};

const healthCards = [
  {
    id: "ant-a",
    icon: Antenna,
    title: "Antenna A",
    status: "ONLINE" as HealthStatus,
    metricLabel: "RSSI",
    metricValue: "-47 dBm",
  },
  {
    id: "ant-b",
    icon: Antenna,
    title: "Antenna B",
    status: "ONLINE" as HealthStatus,
    metricLabel: "RSSI",
    metricValue: "-52 dBm",
  },
  {
    id: "network",
    icon: Wifi,
    title: "4G сүлжээ",
    status: "ONLINE" as HealthStatus,
    metricLabel: "Signal",
    metricValue: "82%",
  },
  {
    id: "gateway",
    icon: Router,
    title: "Gateway",
    status: "WARNING" as HealthStatus,
    metricLabel: "Queue",
    metricValue: "12",
  },
];

export default function DeviceHealthPage() {
  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" title="Төхөөрөмжийн төлөв" />

      <div className="mt-6 grid grid-cols-2 gap-3">
        {healthCards.map(({ id, icon: Icon, title, status, metricLabel, metricValue }) => (
          <Card key={id} className="gap-3 bg-[#141a2c] p-4 ring-1 ring-white/5">
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/5">
                <Icon className="size-4 text-[#f2a93c]" strokeWidth={1.75} />
              </span>
              <Badge className={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-semibold">{title}</p>
              <p className="flex items-center gap-1 text-xs text-gray-400">
                <Signal className="size-3" />
                {metricLabel}: {metricValue}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <BottomNav />
    </PhoneFrame>
  );
}
