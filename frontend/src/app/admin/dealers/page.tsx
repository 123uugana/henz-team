"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Edit3, Plus, SlidersHorizontal, UserPlus, X } from "lucide-react";
import { AdminButton, AdminShell, EmptyState, PageHeading, Panel, StatusPill } from "@/components/admin-shell";
import { ApiError, createAdminDealer, listAdminDealers, updateAdminDealer, updateAdminUserStatus } from "@/lib/api";
import { Notice } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";

export default function AdminDealersPage() {
  const { data, error, refresh } = useApi(() => listAdminDealers({ limit: 50 }), "admin-dealers");
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phoneNumber: "", aimag: "", sum: "" });
  const [saving, setSaving] = useState(false);
  const pageSize = 5;
  const rows = useMemo(() => data?.items.map((dealer) => ({
    id: dealer.id,
    name: dealer.name || dealer.phoneNumber,
    phone: dealer.phoneNumber,
    region: [dealer.aimag, dealer.sum].filter(Boolean).join(", ") || `${dealer.farmerCount} малчин`,
    rawStatus: dealer.status,
    status: dealer.status === "ACTIVE" ? "Идэвхтэй" : "Идэвхгүй",
    tone: dealer.status === "ACTIVE" ? "success" : "danger",
    aimag: dealer.aimag ?? "",
    sum: dealer.sum ?? "",
    farmerCount: dealer.farmerCount,
    managedLivestockCount: dealer.managedLivestockCount,
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

  const resetForm = () => {
    setForm({ name: "", phoneNumber: "", aimag: "", sum: "" });
    setEditingId(null);
    setShowCreateForm(false);
  };

  const startEdit = (dealer: (typeof rows)[number]) => {
    setForm({
      name: dealer.name,
      phoneNumber: dealer.phone,
      aimag: dealer.aimag,
      sum: dealer.sum,
    });
    setEditingId(dealer.id);
    setShowCreateForm(true);
    setNotice(null);
  };

  const submitDealer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      phoneNumber: form.phoneNumber.replace(/\D/g, "").slice(0, 8),
      aimag: form.aimag.trim() || undefined,
      sum: form.sum.trim() || undefined,
    };

    if (!payload.name || payload.phoneNumber.length !== 8) {
      setNotice("Нэр болон 8 оронтой утасны дугаар оруулна уу.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateAdminDealer(editingId, payload);
        setNotice("Борлуулагчийн мэдээлэл шинэчлэгдлээ.");
      } else {
        await createAdminDealer(payload);
        setNotice("Борлуулагч бүртгэгдлээ.");
        setFilter("ACTIVE");
      }
      resetForm();
      setPage(1);
      refresh();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Борлуулагч хадгалах үед алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell sectionTitle="Гэрээт борлуулагчид" searchValue={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Борлуулагч, утас, бүс нутаг хайх...">
      <PageHeading
        title="Гэрээт борлуулагчид"
        description="Системд бүртгэлтэй борлуулагчдын жагсаалт ба удирдлага."
        action={<AdminButton onClick={() => { setShowCreateForm(true); setEditingId(null); setForm({ name: "", phoneNumber: "", aimag: "", sum: "" }); }}><Plus className="size-4" />Шинэ борлуулагч нэмэх</AdminButton>}
      />

      <Notice message={notice} />

      {showCreateForm ? (
        <Panel className="mb-5 p-5">
          <form onSubmit={submitDealer} className="grid gap-4 xl:grid-cols-[1fr_180px_1fr_1fr_auto] xl:items-end">
            <AdminField label="Нэр">
              <input
                value={form.name}
                onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                className="h-11 w-full rounded-lg border border-[#33415f] bg-[#111a2e] px-4 text-sm text-[#e7ecff] outline-none placeholder:text-[#66728b] focus:border-[#f0a93c]"
                placeholder="Борлуулагчийн нэр"
              />
            </AdminField>
            <AdminField label="Утас">
              <input
                value={form.phoneNumber}
                onChange={(event) => setForm((value) => ({ ...value, phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 8) }))}
                className="h-11 w-full rounded-lg border border-[#33415f] bg-[#111a2e] px-4 text-sm text-[#e7ecff] outline-none placeholder:text-[#66728b] focus:border-[#f0a93c]"
                placeholder="99112233"
              />
            </AdminField>
            <AdminField label="Аймаг">
              <input
                value={form.aimag}
                onChange={(event) => setForm((value) => ({ ...value, aimag: event.target.value }))}
                className="h-11 w-full rounded-lg border border-[#33415f] bg-[#111a2e] px-4 text-sm text-[#e7ecff] outline-none placeholder:text-[#66728b] focus:border-[#f0a93c]"
                placeholder="Заавал биш"
              />
            </AdminField>
            <AdminField label="Сум">
              <input
                value={form.sum}
                onChange={(event) => setForm((value) => ({ ...value, sum: event.target.value }))}
                className="h-11 w-full rounded-lg border border-[#33415f] bg-[#111a2e] px-4 text-sm text-[#e7ecff] outline-none placeholder:text-[#66728b] focus:border-[#f0a93c]"
                placeholder="Заавал биш"
              />
            </AdminField>
            <div className="flex gap-2">
              <AdminButton type="submit" disabled={saving} className="h-11">
                <UserPlus className="size-4" />
                {saving ? "Хадгалж байна..." : editingId ? "Шинэчлэх" : "Бүртгэх"}
              </AdminButton>
              <button
                type="button"
                onClick={resetForm}
                className="flex size-11 items-center justify-center rounded-lg border border-[#33415f] text-[#d6c8b1] hover:bg-[#202b48]"
                aria-label="Хаах"
              >
                <X className="size-4" />
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

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
                  <td className="px-6 py-5 font-semibold">
                    <Link href={`/admin/dealers/${dealer.id}`} className="text-[#e7ecff] hover:text-[#f0a93c]">
                      {dealer.name}
                    </Link>
                    <p className="mt-1 text-xs font-normal text-[#9faabe]">
                      {dealer.farmerCount} малчин · {dealer.managedLivestockCount} мал
                    </p>
                  </td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{dealer.phone}</td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{dealer.region}</td>
                  <td className="px-6 py-5"><StatusPill tone={dealer.tone}>{dealer.status}</StatusPill></td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(dealer)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#42506f] px-3 py-1.5 text-xs text-[#e1e7f5]"
                      >
                        <Edit3 className="size-3.5" />
                        Засах
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDealerStatus(dealer.id, dealer.rawStatus as "ACTIVE" | "SUSPENDED")}
                        className="rounded-lg border border-[#42506f] px-3 py-1.5 text-xs text-[#e1e7f5]"
                      >
                        {dealer.rawStatus === "ACTIVE" ? "Идэвхгүй" : "Идэвхтэй"}
                      </button>
                    </div>
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

function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase text-[#d9c7ae]">{label}</span>
      {children}
    </label>
  );
}
