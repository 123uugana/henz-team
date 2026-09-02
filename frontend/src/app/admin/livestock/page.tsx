"use client";

import { useMemo, useState } from "react";
import { PawPrint } from "lucide-react";
import { AdminShell, EmptyState, ExportButton, PageHeading, Panel, StatusPill } from "@/components/admin-shell";
import { listAdminLivestock, type LivestockStatus } from "@/lib/api";
import { downloadCsv, Notice } from "@/lib/admin-actions";
import { useApi } from "@/lib/use-api";

export default function AdminLivestockPage() {
  const { data, error } = useApi(() => listAdminLivestock({ limit: 50 }), "admin-livestock");
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LivestockStatus | "ALL">("ALL");
  const [type, setType] = useState<"ALL" | "SHEEP" | "GOAT">("ALL");
  const rows = useMemo(() => data?.items.map((animal) => ({
    id: animal.id,
    image: animal.imageUrl || "https://images.unsplash.com/photo-1484557985045-edf25e08da73?auto=format&fit=crop&w=120&q=80",
    name: animal.name || animal.earNumber,
    tag: animal.rfidTag?.epc ?? "-",
    rawStatus: animal.status,
    rawType: animal.species,
    type: animal.species === "SHEEP" ? "Хонь" : "Ямаа",
    owner: animal.owner?.name || animal.owner?.phoneNumber || "-",
    location: animal.lastScan?.readerLocation || animal.owner?.aimag || "-",
    status: animal.status === "ACTIVE" ? "Идэвхтэй" : animal.status === "MISSING" ? "Анхаарах" : "Архив",
    tone: animal.status === "ACTIVE" ? "success" : animal.status === "MISSING" ? "danger" : "muted",
  })) ?? [], [data]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((animal) => {
      const matchesSearch = !query || [animal.name, animal.tag, animal.owner, animal.location].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === "ALL" || animal.rawStatus === status;
      const matchesType = type === "ALL" || animal.rawType === type;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [rows, search, status, type]);

  const exportLivestock = () => {
    downloadCsv(
      "admin-livestock.csv",
      ["Name", "Tag", "Type", "Owner", "Location", "Status"],
      filteredRows.map((animal) => [animal.name, animal.tag, animal.type, animal.owner, animal.location, animal.status]),
    );
    setNotice("Малын жагсаалт CSV файлаар татагдлаа.");
  };

  return (
    <AdminShell sectionTitle="Мал" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Малын нэр, Tag ID, owner хайх...">
      <PageHeading
        title="System-wide Livestock Registry"
        description="Comprehensive read-only data view for administrative oversight."
        action={<ExportButton onClick={exportLivestock} />}
      />

      <Panel className="mb-7 grid gap-4 border-[#8f642d] p-5 md:grid-cols-4">
        <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 rounded-lg border border-[#344260] bg-[#0f1728] px-4 text-sm outline-none" placeholder="Name, Tag ID, or Owner..." />
        <select value={status} onChange={(event) => setStatus(event.target.value as LivestockStatus | "ALL")} className="h-11 rounded-lg border border-[#344260] bg-[#0f1728] px-4 text-sm outline-none">
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Идэвхтэй</option>
          <option value="MISSING">Анхаарах</option>
          <option value="INACTIVE">Архив</option>
        </select>
        <select value={type} onChange={(event) => setType(event.target.value as "ALL" | "SHEEP" | "GOAT")} className="h-11 rounded-lg border border-[#344260] bg-[#0f1728] px-4 text-sm outline-none">
          <option value="ALL">All Types</option>
          <option value="SHEEP">Хонь</option>
          <option value="GOAT">Ямаа</option>
        </select>
        <select className="h-11 rounded-lg border border-[#344260] bg-[#0f1728] px-4 text-sm outline-none"><option>All Regions</option></select>
      </Panel>

      <Notice message={notice} />

      {error ? (
        <div className="mb-5 rounded-lg border border-[#f0a93c]/30 bg-[#2c251a] px-4 py-3 text-sm text-[#f0c075]">
          Livestock API холбогдсонгүй: {error}
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs uppercase text-[#d9c7ae]">
              <tr>
                <th className="px-6 py-4">Image</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Tag ID</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Owner / Contact</th>
                <th className="px-6 py-4">Last Ping Location</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#283550]">
              {filteredRows.map((animal) => (
                <tr key={animal.id} className="hover:bg-[#202b48]">
                  <td className="px-6 py-4">
                    <span className="block size-12 rounded bg-cover bg-center" style={{ backgroundImage: `url(${animal.image})` }} />
                  </td>
                  <td className="px-6 py-4 font-semibold">{animal.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-[#c7d0e2]">{animal.tag}</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-2"><PawPrint className="size-4 text-[#d6c8b1]" />{animal.type}</span></td>
                  <td className="px-6 py-4 text-[#f0c075] underline decoration-[#f0c075]/30">{animal.owner}</td>
                  <td className="px-6 py-4 text-[#c6cfdf]">{animal.location}</td>
                  <td className="px-6 py-4"><StatusPill tone={animal.tone}>{animal.status}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length === 0 ? (
            <EmptyState title="Малын бүртгэл олдсонгүй" description="User мал бүртгэсний дараа admin registry дээр шууд харагдана." />
          ) : null}
        </div>
      </Panel>
    </AdminShell>
  );
}
