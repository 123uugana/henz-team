"use client";

import { AlertTriangle, PawPrint, RadioTower, Tags, UsersRound } from "lucide-react";
import { AdminShell, PageHeading, Panel, StatTile } from "@/components/admin-shell";
import { getAdminStatistics, listAdminActivity, listAdminDevices } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export default function AdminDashboardPage() {
  const { data, loading, error } = useApi(getAdminStatistics, "admin-statistics");
  const { data: activity } = useApi(listAdminActivity, "admin-activity");
  const { data: devices } = useApi(() => listAdminDevices({ limit: 50 }), "admin-dashboard-devices");
  const stats = data ?? {
    totalUsers: 0,
    totalLivestock: 0,
    scannedToday: 0,
    missingCount: 0,
    unknownTagCount: 0,
    readerCount: 0,
    damagedTagCount: 0,
    missingLivestock: [],
    recentUsers: [],
  };
  const offlineDevices = devices?.items.filter((device) => device.status === "OFFLINE") ?? [];

  return (
    <AdminShell sectionTitle="Хянах самбар">
      <PageHeading title="Хянах самбар" description="Системийн хэрэглэгч, мал, төхөөрөмж болон RFID tag-ийн ерөнхий хяналт." />

      {error ? (
        <div className="mb-5 rounded-lg border border-[#f0a93c]/30 bg-[#2c251a] px-4 py-3 text-sm text-[#f0c075]">
          Admin API холбогдсонгүй: {error}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatTile icon={<UsersRound className="size-5" />} label="Нийт хэрэглэгч" value={loading ? "..." : stats.totalUsers.toLocaleString()} meta="+12%" tone="success" />
        <StatTile icon={<PawPrint className="size-5" />} label="Нийт бүртгэлтэй мал" value={loading ? "..." : stats.totalLivestock.toLocaleString()} tone="warning" />
        <StatTile icon={<RadioTower className="size-5" />} label="Нийт антенна/gate" value={String(stats.readerCount ?? 0)} meta={`${offlineDevices.length} offline`} tone="success" />
        <StatTile icon={<AlertTriangle className="size-5" />} label="Дутуу мал" value={String(stats.missingCount)} meta={`${stats.scannedToday} scans today`} tone="danger" />
        <StatTile icon={<Tags className="size-5" />} label="Гэмтэлтэй tag" value={String(stats.damagedTagCount ?? 0)} tone="warning" />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_320px]">
        <Panel className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#e8edff]">Системийн эрүүл мэндийн тойм</h2>
            <span className="text-xl text-[#d2d9eb]">...</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-[#33415f] bg-[#202b48] p-5">
              <p className="text-sm text-[#cfd6e9]">Offline Gates</p>
              <p className="mt-3 text-4xl font-bold text-[#dfe6fb]">{offlineDevices.length}</p>
              <div className="mt-6 space-y-2 text-sm">
                {offlineDevices.slice(0, 3).map((device) => (
                  <div key={device.id} className="flex justify-between gap-3">
                    <span className="truncate">{device.name}</span>
                    <span className="shrink-0 text-[#ffaaa5]">{device.lastScanAt ? new Date(device.lastScanAt).toLocaleDateString("mn-MN") : "No scans"}</span>
                  </div>
                ))}
                {offlineDevices.length === 0 ? <p className="text-[#9faabe]">Offline gate алга.</p> : null}
              </div>
            </div>
            <div className="rounded-lg border border-[#33415f] bg-[#202b48] p-5">
              <p className="text-sm text-[#cfd6e9]">Гэмтэлтэй Tags</p>
              <p className="mt-3 text-4xl font-bold text-[#dfe6fb]">{stats.damagedTagCount ?? 0}</p>
              <div className="mt-5 h-2 rounded-full bg-[#0d1424]">
                <div className="h-full w-[18%] rounded-full bg-[#f0a93c]" />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#b6c0d6]">Нийт tag-ийн 0.02% нь гэмтэлтэй байна.</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <h2 className="mb-5 text-xl font-bold text-[#e8edff]">Сүүлийн үйлдэл</h2>
          <div className="space-y-5">
            {(activity ?? []).map((item, index) => (
              <div key={item.id} className="flex gap-3">
                <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#22304d] text-xs font-bold text-[#f0a93c]">{index + 1}</span>
                <p className="text-sm leading-6 text-[#d8dfef]">{item.title}<br /><span className="text-xs text-[#98a4bc]">{new Date(item.createdAt).toLocaleString("mn-MN")}</span></p>
              </div>
            ))}
            {activity?.length === 0 ? <p className="text-sm text-[#9faabe]">Сүүлийн үйлдэл бүртгэгдээгүй байна.</p> : null}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
