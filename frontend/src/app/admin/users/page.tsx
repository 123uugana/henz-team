"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Mail, Plus, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { AdminButton, AdminShell, EmptyState, PageHeading, Panel, StatusPill } from "@/components/admin-shell";
import { createAdminUser, listAdminUsers, updateAdminUserStatus } from "@/lib/api";
import { Notice } from "@/lib/admin-actions";
import { useApi } from "@/lib/use-api";

const roleLabels = {
  FARMER: "Малчин",
  DEALER: "Борлуулагч",
  ADMIN: "Админ",
} as const;

export default function AdminUsersPage() {
  const { data, error, refresh } = useApi(() => listAdminUsers({ limit: 50 }), "admin-users");
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 4;

  const rows = useMemo(() => data?.items.map((user) => ({
    id: user.id,
    name: user.name || user.phoneNumber,
    phone: user.phoneNumber,
    location: [user.aimag, user.sum].filter(Boolean).join(" / ") || "-",
    livestock: user.livestockCount.toLocaleString(),
    createdAt: new Date(user.createdAt).toLocaleDateString("mn-MN"),
    rawStatus: user.status,
    role: user.role,
    status: user.status === "ACTIVE" ? "Идэвхтэй" : "Блоклогдсон",
    tone: user.status === "ACTIVE" ? "success" : "danger",
  })) ?? [], [data]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((user) => {
      const matchesSearch = !query || [user.name, user.phone, user.location, roleLabels[user.role]].some((value) => value.toLowerCase().includes(query));
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesStatus = statusFilter === "ALL" || user.rawStatus === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [rows, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleUserStatus = async (id: string, status: "ACTIVE" | "SUSPENDED") => {
    try {
      await updateAdminUserStatus(id, status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
      setNotice(status === "ACTIVE" ? "Хэрэглэгч блоклогдлоо." : "Хэрэглэгчийн блок тайлагдлаа.");
      refresh();
    } catch {
      setNotice("Хэрэглэгчийн төлөв солих үед алдаа гарлаа.");
    }
  };

  const submitAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = adminEmail.trim().toLowerCase();
    const name = adminName.trim();

    if (!email) {
      setNotice("Admin email оруулна уу.");
      return;
    }

    setSavingAdmin(true);
    try {
      await createAdminUser({ email, name: name || undefined });
      setNotice("Шинэ admin нэмэгдлээ. Тэр email-ээр Clerk sign-in хийгээд admin хэсэгт орж болно.");
      setAdminEmail("");
      setAdminName("");
      setShowAdminForm(false);
      setRoleFilter("ADMIN");
      setPage(1);
      refresh();
    } catch {
      setNotice("Admin нэмэх үед алдаа гарлаа. Email зөв эсэх болон backend асаалттай эсэхийг шалгана уу.");
    } finally {
      setSavingAdmin(false);
    }
  };

  return (
    <AdminShell
      sectionTitle="Хэрэглэгчид"
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Нэр, email, утас, аймаг хайх..."
    >
      <PageHeading
        title="Хэрэглэгчийн удирдлага"
        description="Системийн хэрэглэгчид, эрх болон төлөв байдлыг удирдана."
        action={<AdminButton onClick={() => setShowAdminForm((value) => !value)}><Plus className="size-4" />Admin нэмэх</AdminButton>}
      />

      {showAdminForm ? (
        <Panel className="mb-5 p-5">
          <form onSubmit={submitAdmin} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-[#d9c7ae]">
                <Mail className="size-4" />
                Admin email
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="admin@example.com"
                className="h-11 w-full rounded-lg border border-[#33415f] bg-[#111a2e] px-4 text-sm text-[#e7ecff] outline-none placeholder:text-[#66728b] focus:border-[#f0a93c]"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase text-[#d9c7ae]">Нэр</label>
              <input
                value={adminName}
                onChange={(event) => setAdminName(event.target.value)}
                placeholder="Admin нэр"
                className="h-11 w-full rounded-lg border border-[#33415f] bg-[#111a2e] px-4 text-sm text-[#e7ecff] outline-none placeholder:text-[#66728b] focus:border-[#f0a93c]"
              />
            </div>
            <div className="flex gap-2">
              <AdminButton type="submit" disabled={savingAdmin} className="h-11">
                <ShieldCheck className="size-4" />
                {savingAdmin ? "Хадгалж байна..." : "Admin хадгалах"}
              </AdminButton>
              <button
                type="button"
                onClick={() => setShowAdminForm(false)}
                className="flex size-11 items-center justify-center rounded-lg border border-[#33415f] text-[#d6c8b1] hover:bg-[#202b48]"
                aria-label="Хаах"
              >
                <X className="size-4" />
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} className="h-11 rounded-lg border border-[#33415f] bg-[#1a243d] px-4 text-sm outline-none">
          <option value="ALL">Бүх эрх</option>
          <option value="FARMER">Малчин</option>
          <option value="DEALER">Борлуулагч</option>
          <option value="ADMIN">Админ</option>
        </select>
        <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-11 rounded-lg border border-[#33415f] bg-[#1a243d] px-4 text-sm outline-none">
          <option value="ALL">Бүх төлөв</option>
          <option value="ACTIVE">Идэвхтэй</option>
          <option value="SUSPENDED">Блоклогдсон</option>
        </select>
        <button
          type="button"
          onClick={() => setNotice("Шүүлтүүр сонгоод хайлтын талбараар нарийсгана.")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#33415f] bg-[#1a243d] text-sm"
        >
          <SlidersHorizontal className="size-4" />
          Шүүлтүүр
        </button>
      </div>

      <Notice message={notice} />

      {error ? (
        <div className="mb-5 rounded-lg border border-[#f0a93c]/30 bg-[#2c251a] px-4 py-3 text-sm text-[#f0c075]">
          Users API холбогдсонгүй: {error}
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[#26324d] text-xs uppercase text-[#d9c7ae]">
              <tr>
                <th className="px-6 py-4">Нэр</th>
                <th className="px-6 py-4">Email / утас</th>
                <th className="px-6 py-4">Эрх</th>
                <th className="px-6 py-4">Аймаг / Сум</th>
                <th className="px-6 py-4">Малын тоо</th>
                <th className="px-6 py-4">Бүртгүүлсэн огноо</th>
                <th className="px-6 py-4">Төлөв</th>
                <th className="px-6 py-4 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#283550]">
              {visibleRows.map((user) => (
                <tr key={user.id} className="hover:bg-[#202b48]">
                  <td className="px-6 py-5 font-semibold text-[#e7ecff]">{user.name}</td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{user.phone}</td>
                  <td className="px-6 py-5">
                    <StatusPill tone={user.role === "ADMIN" ? "warning" : user.role === "DEALER" ? "success" : "neutral"}>{roleLabels[user.role]}</StatusPill>
                  </td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{user.location}</td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{user.livestock}</td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{user.createdAt}</td>
                  <td className="px-6 py-5"><StatusPill tone={user.tone}>{user.status}</StatusPill></td>
                  <td className="px-6 py-5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleUserStatus(user.id, user.rawStatus as "ACTIVE" | "SUSPENDED")}
                      className="rounded-lg border border-[#4b5a79] px-3 py-1.5 text-xs text-[#ffaaa5]"
                    >
                      {user.rawStatus === "ACTIVE" ? "Блоклох" : "Нээх"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRows.length === 0 ? (
            <EmptyState title="Хэрэглэгч олдсонгүй" description="Search/filter-ээ өөрчлөх эсвэл user бүртгэгдсэний дараа энд харагдана." />
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-[#283550] px-6 py-4 text-sm text-[#c0c9db]">
          <span>Нийт {filteredRows.length} хэрэглэгчээс {visibleRows.length} харуулж байна</span>
          <span className="flex gap-2">
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
          </span>
        </div>
      </Panel>
    </AdminShell>
  );
}
