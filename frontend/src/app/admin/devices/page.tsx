"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, RadioTower, Wifi, WifiOff } from "lucide-react";
import { AdminButton, AdminShell, EmptyState, PageHeading, Panel, StatTile, StatusPill } from "@/components/admin-shell";
import { listAdminDevices } from "@/lib/api";
import { Notice } from "@/lib/admin-actions";
import { useApi } from "@/lib/use-api";

export default function AdminDevicesPage() {
  const { data, error } = useApi(() => listAdminDevices({ limit: 50 }), "admin-devices");
  const [notice, setNotice] = useState<string | null>(null);
  const [problemOnly, setProblemOnly] = useState(false);
  const [search, setSearch] = useState("");
  const rows = useMemo(() => data?.items.map((device) => ({
    id: device.id,
    name: device.name,
    mac: device.id,
    owner: device.owner?.name || device.owner?.phoneNumber || "-",
    status: device.status === "ONLINE" ? "Online" : device.status === "WARNING" ? "Warning" : "Offline",
    signal: device.rssi !== undefined ? `${device.rssi} dBm` : "N/A",
    lastHeartbeat: device.lastScanAt ? new Date(device.lastScanAt).toLocaleString("mn-MN") : "No scans",
    queue: device.offlineQueue.toLocaleString(),
    tone: device.status === "ONLINE" ? "success" : device.status === "WARNING" ? "warning" : "danger",
  })) ?? [], [data]);
  const visibleRows = useMemo(
    () => {
      const query = search.trim().toLowerCase();
      return rows.filter((device) => {
        const matchesSearch = !query || [device.name, device.mac, device.owner, device.status, device.signal].some((value) => value.toLowerCase().includes(query));
        const matchesProblem = !problemOnly || device.tone !== "success";
        return matchesSearch && matchesProblem;
      });
    },
    [problemOnly, rows, search],
  );

  const toggleProblems = () => {
    const next = !problemOnly;
    setProblemOnly(next);
    setNotice(next ? "Асуудалтай төхөөрөмжүүдийг шүүж харуулж байна." : "Бүх төхөөрөмжийг харуулж байна.");
  };

  return (
    <AdminShell sectionTitle="Төхөөрөмж/Антенна" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Антенн нэр, ID, owner хайх...">
      <PageHeading
        title="Fleet-wide Health Monitoring"
        description="Real-time status and diagnostics for all registered gate antennas."
        action={<AdminButton variant="danger" onClick={toggleProblems}><AlertTriangle className="size-4" />Асуудалтай төхөөрөмж шалгах</AdminButton>}
      />

      <div className="mb-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={<RadioTower className="size-5" />} label="Total antennas" value={String(data?.total ?? 0)} meta="Live data" />
        <StatTile icon={<Wifi className="size-5" />} label="Online" value={String(data?.items.filter((device) => device.status === "ONLINE").length ?? 0)} meta="Active scans" tone="success" />
        <StatTile icon={<AlertTriangle className="size-5" />} label="Warnings" value={String(data?.items.filter((device) => device.status === "WARNING").length ?? 0)} meta="Low signal" tone="warning" />
        <StatTile icon={<WifiOff className="size-5" />} label="Offline" value={String(data?.items.filter((device) => device.status === "OFFLINE").length ?? 0)} meta="Attention" tone="danger" />
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-[#f0a93c]/30 bg-[#2c251a] px-4 py-3 text-sm text-[#f0c075]">
          Devices API холбогдсонгүй: {error}
        </div>
      ) : null}

      <Notice message={notice} />

      <Panel className="overflow-hidden">
        <div className="border-b border-[#283550] px-6 py-5">
          <h2 className="text-xl font-bold">Registered Devices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-[#202b48] text-xs uppercase text-[#d9c7ae]">
              <tr>
                <th className="px-6 py-4">Antenna Name / ID</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Signal (RSSI)</th>
                <th className="px-6 py-4">Last Heartbeat</th>
                <th className="px-6 py-4 text-right">Offline Queue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#283550]">
              {visibleRows.map((device) => (
                <tr key={device.id} className={device.tone === "danger" ? "bg-[#2a3047]" : ""}>
                  <td className="px-6 py-6"><p className="font-semibold">{device.name}</p><p className="mt-1 text-xs text-[#8d98af]">MAC: {device.mac}</p></td>
                  <td className="px-6 py-6 text-[#c6cfdf]">{device.owner}</td>
                  <td className="px-6 py-6"><StatusPill tone={device.tone}>{device.status}</StatusPill></td>
                  <td className="px-6 py-6 font-semibold text-[#43d3c5]">{device.signal}</td>
                  <td className="px-6 py-6 text-[#c6cfdf]">{device.lastHeartbeat}</td>
                  <td className="px-6 py-6 text-right"><StatusPill tone={device.tone}>{device.queue}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRows.length === 0 ? (
            <EmptyState title="Төхөөрөмж олдсонгүй" description="User antenna/device бүртгэсний дараа энд live status-тай харагдана." />
          ) : null}
        </div>
      </Panel>
    </AdminShell>
  );
}
