"use client";

import { useState } from "react";
import { Edit3, Save } from "lucide-react";
import { AdminButton, AdminShell, PageHeading, Panel, StatusPill } from "@/components/admin-shell";
import { tagPrefixes } from "@/lib/admin-data";
import { getAdminTagSettings } from "@/lib/api";
import { Notice } from "@/lib/admin-actions";
import { useApi } from "@/lib/use-api";

type PrefixSetting = {
  value: string;
  name: string;
  color: string;
};

export default function AdminSettingsPage() {
  const { data, error } = useApi(getAdminTagSettings, "admin-tag-settings");
  const [notice, setNotice] = useState<string | null>(null);
  const [customPrefixes, setCustomPrefixes] = useState<PrefixSetting[] | null>(null);
  const prefixes = customPrefixes ?? data?.prefixes ?? tagPrefixes;

  const editPrefixColor = (value: string, currentColor: string) => {
    const nextColor = window.prompt(`${value} өнгө оруулна уу. Жишээ: #E8A33D`, currentColor);
    if (!nextColor) return;

    setCustomPrefixes((items) =>
      (items ?? prefixes).map((item) => item.value === value ? { ...item, color: nextColor } : item),
    );
    setNotice(`${value} өнгө шинэчлэгдлээ. Хадгалах товч дарж баталгаажуулна.`);
  };

  return (
    <AdminShell sectionTitle="Tag тохиргоо">
      <PageHeading
        title="Tag тохиргоо"
        description="Зөвхөн админ хандах эрхтэй системийн тохиргоо."
        action={<AdminButton onClick={() => setNotice("Tag тохиргоо хадгалагдлаа. Persistent settings API нэмэхэд энэ action backend-д хадгална.")}><Save className="size-4" />Хадгалах</AdminButton>}
      />

      <Notice message={notice} />

      {error ? (
        <div className="mb-5 rounded-lg border border-[#f0a93c]/30 bg-[#2c251a] px-4 py-3 text-sm text-[#f0c075]">
          Settings API холбогдсонгүй: {error}. Local default тохиргоо харуулж байна.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Panel className="overflow-hidden p-6">
          <h2 className="mb-5 text-xl font-bold">Ангиллын тохиргоо</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#162039] text-xs uppercase text-[#d9c7ae]">
                <tr>
                  <th className="px-5 py-3">Утга</th>
                  <th className="px-5 py-3">Ангиллын нэр</th>
                  <th className="px-5 py-3">Өнгө (Badge)</th>
                  <th className="px-5 py-3 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#283550]">
                {prefixes.map((prefix) => (
                  <tr key={prefix.value}>
                    <td className="px-5 py-4 font-mono font-bold text-[#43d3c5]">{prefix.value}</td>
                    <td className="px-5 py-4">{prefix.name}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-3">
                        <span className="size-6 rounded" style={{ backgroundColor: prefix.color }} />
                        {prefix.color}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => editPrefixColor(prefix.value, prefix.color)}
                        className="text-[#d6c8b1]"
                        aria-label={`${prefix.value} засах`}
                      >
                        <Edit3 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="p-6">
            <h2 className="mb-3 text-xl font-bold">Системийн нөлөөлөл</h2>
            <p className="text-sm leading-6 text-[#b8c2d8]">
              Энд хийсэн тохиргоо нь Tag-ийн харагдах байдал, Prefix таних дүрэм болон хэрэглэгчийн интерфэйсийн ангилалд нөлөөлнө.
            </p>
          </Panel>

          <Panel className="p-6">
            <h2 className="mb-5 text-xl font-bold">Харагдах байдал</h2>
            <div className="space-y-3">
              {prefixes.slice(0, 4).map((prefix) => (
                <div key={prefix.value} className="flex items-center justify-between rounded-lg border border-[#33415f] bg-[#162039] px-4 py-3">
                  <span className="text-sm text-[#c6cfdf]">ID: {prefix.value === "SHP" ? "1042-88X" : prefix.value === "GOA" ? "9921-12G" : prefix.value === "EXT" ? "5543-EXT" : "1102-VET"}</span>
                  <StatusPill tone={prefix.value === "EXT" ? "warning" : prefix.value === "VET" ? "success" : "neutral"}>{prefix.name.split(" ")[0]} ({prefix.value})</StatusPill>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}
