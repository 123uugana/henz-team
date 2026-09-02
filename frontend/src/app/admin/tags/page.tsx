"use client";

import { useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { AdminButton, AdminShell, EmptyState, PageHeading, Panel, StatusPill } from "@/components/admin-shell";
import { importAdminTags, listAdminTags, unlockTag, updateAdminTagStatus, type TagStatus } from "@/lib/api";
import { downloadCsv, Notice } from "@/lib/admin-actions";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

const statusLabel: Record<TagStatus, string> = {
  AVAILABLE: "Чөлөөтэй",
  CLAIMED: "Эзэмшигдсэн",
  LOCKED: "Түгжээтэй",
  DAMAGED: "Гэмтэлтэй",
};

const statusTone: Record<TagStatus, string> = {
  AVAILABLE: "neutral",
  CLAIMED: "success",
  LOCKED: "warning",
  DAMAGED: "danger",
};

const filters: Array<{ value: TagStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Бүгд" },
  { value: "AVAILABLE", label: "Чөлөөтэй" },
  { value: "CLAIMED", label: "Эзэмшигдсэн" },
  { value: "LOCKED", label: "Түгжээтэй" },
  { value: "DAMAGED", label: "Гэмтэлтэй" },
];

export default function AdminTagsPage() {
  const { data, error, refresh } = useApi(listAdminTags, "admin-tags");
  const [filter, setFilter] = useState<TagStatus | "ALL">("ALL");
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const tags = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(
    () => {
      const query = search.trim().toLowerCase();
      return tags.filter((tag) => {
        const matchesStatus = filter === "ALL" || tag.status === filter;
        const matchesSearch = !query || [tag.epc, tag.status, tag.claimedByUserId ?? ""].some((value) => value.toLowerCase().includes(query));
        return matchesStatus && matchesSearch;
      });
    },
    [filter, search, tags],
  );

  const handleUnlock = async (epc: string) => {
    try {
      await unlockTag(epc);
      setNotice(`${epc} tag тайлагдлаа.`);
      refresh();
    } catch {
      setNotice("Tag тайлах үед алдаа гарлаа. Backend асаалттай эсэх болон admin эрхээ шалгана уу.");
      refresh();
    }
  };

  const exportTags = () => {
    downloadCsv(
      "admin-tags.csv",
      ["EPC", "Prefix", "Status", "Claimed by", "Claimed at"],
      filtered.map((tag) => [
        tag.epc,
        tag.epc.split("-")[0],
        tag.status,
        tag.claimedByUserId,
        tag.claimedAt,
      ]),
    );
    setNotice("Tag жагсаалт CSV файлаар татагдлаа.");
  };

  const importTags = async () => {
    const value = window.prompt("Импорт хийх EPC-үүдээ таслалаар тусгаарлаж бичнэ үү. Жишээ: SHP-1001, GOA-1002");
    const epcs = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];

    if (epcs.length === 0) {
      setNotice("Импорт хийх EPC оруулаагүй байна.");
      return;
    }

    try {
      const result = await importAdminTags(epcs.map((epc) => ({ epc })));
      setNotice(`${result.imported} tag импорт хийгдлээ.`);
      refresh();
    } catch {
      setNotice("Tag импорт амжилтгүй боллоо. Backend асаалттай эсэх болон admin эрхээ шалгана уу.");
    }
  };

  const markDamaged = async (epc: string) => {
    try {
      await updateAdminTagStatus(epc, "DAMAGED");
      setNotice(`${epc} tag гэмтэлтэй төлөвт орлоо.`);
      refresh();
    } catch {
      setNotice("Tag төлөв солих үед алдаа гарлаа.");
    }
  };

  return (
    <AdminShell sectionTitle="Tag удирдлага" searchValue={search} onSearchChange={setSearch} searchPlaceholder="EPC, төлөв, claim user хайх...">
      <PageHeading
        title="RFID Inventory"
        description="Manage and track physical tags across the system."
        action={
          <div className="flex gap-3">
            <AdminButton variant="outline" onClick={exportTags}><Download className="size-4" />Экспорт</AdminButton>
            <AdminButton onClick={importTags}><Upload className="size-4" />Tag импорт хийх</AdminButton>
          </div>
        }
      />

      <Notice message={notice} />

      {error ? (
        <div className="mb-5 rounded-lg border border-[#f0a93c]/30 bg-[#2c251a] px-4 py-3 text-sm text-[#f0c075]">
          Tag API холбогдсонгүй: {error}
        </div>
      ) : null}

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition",
              filter === item.value
                ? "border-[#f0a93c] bg-[#f0a93c] text-[#11192a]"
                : "border-[#344260] bg-[#151f35] text-[#cbd4e7] hover:bg-[#202b48]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#26324d] text-xs uppercase text-[#d9c7ae]">
              <tr>
                <th className="px-6 py-4">EPC</th>
                <th className="px-6 py-4">Prefix</th>
                <th className="px-6 py-4">Claim хийсэн хэрэглэгч</th>
                <th className="px-6 py-4">Claim огноо</th>
                <th className="px-6 py-4">Төлөв</th>
                <th className="px-6 py-4 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#283550]">
              {filtered.map((tag) => (
                <tr key={tag.epc} className="hover:bg-[#202b48]">
                  <td className="px-6 py-5 font-mono text-xs font-semibold text-[#e8edff]">{tag.epc}</td>
                  <td className="px-6 py-5 text-[#43d3c5]">{tag.epc.split("-")[0]}</td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{tag.claimedByUserId ?? "-"}</td>
                  <td className="px-6 py-5 text-[#c6cfdf]">{tag.claimedAt ? new Date(tag.claimedAt).toLocaleDateString("mn-MN") : "-"}</td>
                  <td className="px-6 py-5"><StatusPill tone={statusTone[tag.status]}>{statusLabel[tag.status]}</StatusPill></td>
                  <td className="px-6 py-5 text-right">
                    {tag.status === "LOCKED" || tag.status === "CLAIMED" ? (
                      <button type="button" onClick={() => handleUnlock(tag.epc)} className="rounded-lg border border-[#4b5a79] px-3 py-1.5 text-xs text-[#dfe5f7]">
                        Тайлах
                      </button>
                    ) : (
                      <button type="button" onClick={() => markDamaged(tag.epc)} className="rounded-lg border border-[#4b5a79] px-3 py-1.5 text-xs text-[#ffaaa5]">
                        Гэмтэлтэй
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <EmptyState title="RFID tag олдсонгүй" description="User tag claim хийх эсвэл admin import хийсний дараа энд харагдана." />
          ) : null}
        </div>
      </Panel>
    </AdminShell>
  );
}
