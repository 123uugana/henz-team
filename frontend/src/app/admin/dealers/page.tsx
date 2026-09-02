"use client";

import { useMemo, useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { AdminButton, AdminShell, EmptyState, PageHeading, Panel, StatusPill } from "@/components/admin-shell";
import { listAdminDealers, updateAdminUserStatus } from "@/lib/api";
import { Notice } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";

export default function AdminDealersPage() {
  const { data, error, refresh } = useApi(() => listAdminDealers({ limit: 50 }), "admin-dealers");
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const rows = useMemo(() => data?.items.map((dealer) => ({
    id: dealer.id,
    name: dealer.name || dealer.phoneNumber,
    phone: dealer.phoneNumber,
    region: [dealer.aimag, dealer.sum].filter(Boolean).join(", ") || `${dealer.farmerCount} малчин`,
    rawStatus: dealer.status,
    status: dealer.status === "ACTIVE" ? "Идэвхтэй" : "Идэвхгүй",
    tone: dealer.status === "ACTIVE" ? "success" : "danger",
  })) ?? [], [data]);
  const visibleRows = useMemo(
    () => {
      const query = search.trim().toLowerCase();
      return rows.filter((dealer) => {
        const matchesSearch = !query || [dealer.name, dealer.phone, dealer.region].some((value) => value.toLowerCase().includes(query));
        const matchesStatus = filter === "ALL" || dealer.rawStatus === filter;
        return matchesSearch && matchesStatus;
      });
    },
    [filter, rows, search],
  );
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visibleRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleDealerStatus = async (id: string, status: "ACTIVE" | "SUSPENDED") => {
    try {
      await updateAdminUserStatus(id, status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
      setNotice(status === "ACTIVE" ? "Борлуулагч идэвхгүй боллоо." : "Борлуулагч идэвхтэй боллоо.");
      refresh();
    } catch {
      setNotice("Борлуулагчийн төлөв солих үед алдаа гарлаа.");
    }
  };

  return (
    <AdminShell sectionTitle="Гэрээт борлуулагчид" searchValue={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Борлуулагч, утас, бүс нутаг хайх...">
      <PageHeading
        title="Гэрээт борлуулагчид"
        description="Системд бүртгэлтэй борлуулагчдын жагсаалт ба удирдлага."
        action={<AdminButton onClick={() => setNotice("Шинэ борлуулагч нэмэхдээ хэрэглэгчийг DEALER role болгож батална.")}><Plus className="size-4" />Шинэ борлуулагч нэмэх</AdminButton>}
      />

      <Notice message={notice} />

      {error ? (
        <div className="mb-5 rounded-lg border border-[#f0a93c]/30 bg-[#2c251a] px-4 py-3 text-sm text-[#f0c075]">
          Dealers API холбогдсонгүй: {error}
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#283550] px-6 py-4">
          <div className="flex gap-2">
            {[
              { value: "ALL", label: "Бүгд" },
              { value: "ACTIVE", label: "Идэвхтэй" },
              { value: "SUSPENDED", label: "Идэвхгүй" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setFilter(item.value as "ALL" | "ACTIVE" | "SUSPENDED");
                  setPage(1);
                }}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold",
                  filter === item.value
                    ? "border-[#f0a93c] text-[#f0a93c]"
                    : "border-[#42506f] text-[#c6cfdf]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm text-[#c6cfdf]">
            Нийт: {data?.total ?? 0} борлуулагч
            <SlidersHorizontal className="size-4 text-[#d6c8b1]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#26324d] text-xs uppercase text-[#d9c7ae]">
              <tr>
                <th className="px-6 py-4">Борлуулагчийн нэр</th>
                <th className="px-6 py-4">Утасны дугаар</th>
                <th className="px-6 py-4">Бүс нутаг</th>
                <th className="px-6 py-4">Статус</th>
                <th className="px-6 py-4 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#283550]">
              {pageRows.map((dealer) => (
                <tr key={dealer.id} className="hover:bg-[#202b48]">
                  <td className="px-6 py-5 font-semibold">{dealer.name}</td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{dealer.phone}</td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{dealer.region}</td>
                  <td className="px-6 py-5"><StatusPill tone={dealer.tone}>{dealer.status}</StatusPill></td>
                  <td className="px-6 py-5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleDealerStatus(dealer.id, dealer.rawStatus as "ACTIVE" | "SUSPENDED")}
                      className="rounded-lg border border-[#42506f] px-3 py-1.5 text-xs text-[#e1e7f5]"
                    >
                      {dealer.rawStatus === "ACTIVE" ? "Идэвхгүй" : "Идэвхтэй"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 ? (
            <EmptyState title="Борлуулагч олдсонгүй" description="DEALER role-той user бүртгэгдсэний дараа энд харагдана." />
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-[#283550] px-6 py-4 text-sm text-[#c0c9db]">
          <span>Хуудас {currentPage} / {totalPages}</span>
          <span className="flex gap-2">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} className="size-8 rounded border border-[#394764]">‹</button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 5).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={pageNumber === currentPage ? "size-8 rounded bg-[#8f642d] text-white" : "size-8 rounded border border-[#394764]"}
              >
                {pageNumber}
              </button>
            ))}
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="size-8 rounded border border-[#394764]">›</button>
          </span>
        </div>
      </Panel>
    </AdminShell>
  );
}
