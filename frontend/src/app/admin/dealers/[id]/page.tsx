"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Phone, Search, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { AdminShell, EmptyState, PageHeading, Panel, StatTile, StatusPill } from "@/components/admin-shell";
import { getAdminDealer, listAdminDealerFarmers, type Farmer } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export default function AdminDealerDetailPage() {
  const params = useParams<{ id: string }>();
  const dealerId = params.id;
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: dealer, error: dealerError } = useApi(() => getAdminDealer(dealerId), dealerId);
  const { data: farmers, loading, error } = useApi(
    () => listAdminDealerFarmers(dealerId, { search: search || undefined, limit: 100 }),
    `${dealerId}|${search}`,
  );

  const rows = useMemo(() => farmers?.items ?? [], [farmers]);

  return (
    <AdminShell
      sectionTitle="Борлуулагчийн малчид"
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Малчны нэр, утсаар хайх..."
    >
      <PageHeading
        title={dealer?.name || "Борлуулагч"}
        description={dealer ? `+976 ${dealer.phoneNumber} · ${dealer.status === "ACTIVE" ? "Идэвхтэй" : "Идэвхгүй"}` : "Борлуулагчийн бүртгэсэн малчдын жагсаалт"}
        action={
          <Link
            href="/admin/dealers"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#42506f] px-4 text-sm font-semibold text-[#dfe5f7] transition hover:bg-[#232e49]"
          >
            <ArrowLeft className="size-4" />
            Буцах
          </Link>
        }
      />

      {dealerError ? (
        <div className="mb-5 rounded-lg border border-[#f0a93c]/30 bg-[#2c251a] px-4 py-3 text-sm text-[#f0c075]">
          Борлуулагчийн мэдээлэл олдсонгүй: {dealerError}
        </div>
      ) : null}

      <div className="mb-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <StatTile icon={<UsersRound className="size-5" />} label="Малчин" value={loading ? "..." : String(farmers?.total ?? 0)} tone="success" />
        <StatTile icon={<UserRound className="size-5" />} label="Статус" value={dealer?.status === "SUSPENDED" ? "Идэвхгүй" : "Идэвхтэй"} tone={dealer?.status === "SUSPENDED" ? "danger" : "success"} />
        <Panel className="p-6">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#aab3c8]" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="h-12 w-full rounded-lg border border-[#33415f] bg-[#111a2e] pl-11 pr-4 text-sm text-[#e7ecff] outline-none placeholder:text-[#66728b] focus:border-[#f0a93c]"
              placeholder="Малчин хайх..."
            />
          </label>
        </Panel>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-[#f0a93c]/30 bg-[#2c251a] px-4 py-3 text-sm text-[#f0c075]">
          Малчдын жагсаалт авах үед алдаа гарлаа: {error}
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#26324d] text-xs uppercase text-[#d9c7ae]">
              <tr>
                <th className="px-6 py-4">Малчин</th>
                <th className="px-6 py-4">Утас</th>
                <th className="px-6 py-4">Аймаг / Сум</th>
                <th className="px-6 py-4">Малын тоо</th>
                <th className="px-6 py-4">Төлөв</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#283550]">
              {rows.map((farmer: Farmer) => (
                <tr key={farmer.id} className="hover:bg-[#202b48]">
                  <td className="px-6 py-5 font-semibold text-[#e7ecff]">{farmer.name || farmer.phoneNumber}</td>
                  <td className="px-6 py-5 text-[#c6cfdf]">
                    <span className="inline-flex items-center gap-2">
                      <Phone className="size-4 text-[#d6c8b1]" />
                      {farmer.phoneNumber}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{[farmer.aimag, farmer.sum].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{farmer.livestockCount}</td>
                  <td className="px-6 py-5">
                    <StatusPill tone={farmer.status === "ACTIVE" ? "success" : "danger"}>
                      {farmer.status === "ACTIVE" ? "Идэвхтэй" : "Идэвхгүй"}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 ? (
            <EmptyState title="Малчин олдсонгүй" description="Энэ борлуулагчийн бүртгэсэн малчин одоогоор алга." />
          ) : null}
        </div>
      </Panel>
    </AdminShell>
  );
}
