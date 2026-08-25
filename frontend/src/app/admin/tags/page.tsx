"use client";

import { useMemo, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTagPrefixInfo } from "@/lib/tag-prefix";
import { listAdminTags, unlockTag, type TagStatus } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<TagStatus, string> = {
  AVAILABLE: "Чөлөөтэй",
  CLAIMED: "Эзэмшигдсэн",
  LOCKED: "Түгжээтэй",
  DAMAGED: "Гэмтэлтэй",
};

const STATUS_TONE: Record<TagStatus, string> = {
  AVAILABLE: "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300",
  CLAIMED: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  LOCKED: "bg-emerald-400/15 text-emerald-700 dark:text-emerald-400",
  DAMAGED: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const FILTERS: { value: TagStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Бүгд" },
  { value: "AVAILABLE", label: "Чөлөөтэй" },
  { value: "CLAIMED", label: "Эзэмшигдсэн" },
  { value: "LOCKED", label: "Түгжээтэй" },
  { value: "DAMAGED", label: "Гэмтэлтэй" },
];

export default function AdminTagsPage() {
  useAuthGuard();
  const { data: tags, loading, error, refresh } = useApi(listAdminTags, "");
  const [filter, setFilter] = useState<TagStatus | "ALL">("ALL");

  const filtered = useMemo(
    () => (filter === "ALL" ? (tags ?? []) : (tags ?? []).filter((t) => t.status === filter)),
    [tags, filter]
  );

  const handleUnlock = async (epc: string) => {
    await unlockTag(epc);
    refresh();
  };

  return (
    <PhoneFrame>
      <AppHeader backHref="/profile" title="Tag удирдлага" />

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === value
                ? "border-[#f2a93c] bg-amber-50 dark:bg-[#1c1408] text-[#a85b0a] dark:text-[#f2a93c]"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] text-slate-500 dark:text-gray-400"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-slate-500 dark:text-gray-400">Ачаалж байна...</p>
      ) : error ? (
        <p className="mt-10 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {filtered.map((tag) => {
            const info = getTagPrefixInfo(tag.epc);
            return (
              <Card key={tag.epc} className="gap-3 bg-white dark:bg-[#141a2c] p-3 ring-1 ring-slate-200/80 dark:ring-white/5">
                <div className="flex items-center gap-3">
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${info.bgClass}`}>
                    {tag.status === "LOCKED" ? (
                      <Lock className={`size-4 ${info.textClass}`} />
                    ) : (
                      <Unlock className={`size-4 ${info.textClass}`} />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-sm font-semibold">{tag.epc}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-gray-400">{info.label}</p>
                  </div>
                  <Badge className={STATUS_TONE[tag.status]}>
                    {STATUS_LABEL[tag.status]}
                  </Badge>
                </div>

                {tag.status === "LOCKED" || tag.status === "CLAIMED" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlock(tag.epc)}
                    className="w-full border-slate-200 dark:border-white/10 bg-transparent text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <Unlock className="size-3.5" />
                    Тайлах
                  </Button>
                ) : null}
              </Card>
            );
          })}

          {filtered.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-gray-400">
              Энэ төлөвт шошго алга.
            </p>
          ) : null}
        </div>
      )}
    </PhoneFrame>
  );
}
