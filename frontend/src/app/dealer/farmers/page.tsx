"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Edit3, PawPrint, Phone, Plus, Search, UserRound } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listFarmers, type Farmer } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useDealerGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";

export default function DealerFarmersPage() {
  useDealerGuard();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [aimagInput, setAimagInput] = useState("");
  const [aimag, setAimag] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setAimag(aimagInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, aimagInput]);

  const { data, loading, error } = useApi(
    () => listFarmers({ search: search || undefined, aimag: aimag || undefined }),
    `${search}|${aimag}`
  );

  return (
    <PhoneFrame>
      <AppHeader backHref="/dealer" title="Миний малчид" />

      <div className="mt-6 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500 dark:text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Нэр, утасны дугаараар хайх..."
            className="h-11 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] pl-10 py-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>
        <Input
          value={aimagInput}
          onChange={(e) => setAimagInput(e.target.value)}
          placeholder="Аймаг/сумаар шүүх..."
          className="h-11 border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c2c] px-4 py-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
        />
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-gray-400">
        {loading ? "Ачаалж байна..." : `${data?.total ?? 0} малчин`}
      </p>

      {error ? (
        <p className="mt-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {(data?.items ?? []).map((farmer) => (
            <FarmerRow key={farmer.id} farmer={farmer} />
          ))}
        </div>
      )}

      {!loading && !error && data?.items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-gray-400">
          Малчин олдсонгүй. Доорх товчоор нэмнэ үү.
        </p>
      ) : null}

      <Button
        variant="brand"
        size="xl"
        className="mt-6 w-full gap-2"
        render={<Link href="/dealer/farmers/new" />}
      >
        <Plus className="size-4" />
        Малчин нэмэх
      </Button>
    </PhoneFrame>
  );
}

function FarmerRow({ farmer }: { farmer: Farmer }) {
  const location = [farmer.aimag, farmer.sum].filter(Boolean).join(", ");

  return (
    <Card className="gap-3 bg-white dark:bg-[#141a2c] p-3 ring-1 ring-slate-200/80 dark:ring-white/5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
          <UserRound className="size-5 text-[#a85b0a] dark:text-[#f2a93c]" strokeWidth={1.5} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-sm font-semibold">{farmer.name}</p>
          <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-gray-400">
            <Phone className="size-3" />
            {farmer.phoneNumber}
          </p>
          {location ? <p className="truncate text-xs text-slate-500 dark:text-gray-400">{location}</p> : null}
        </div>
        <Badge
          className={cn(
            "shrink-0",
            farmer.status === "ACTIVE"
              ? "bg-emerald-400/15 text-emerald-700 dark:text-emerald-400"
              : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300"
          )}
        >
          {farmer.status === "ACTIVE" ? "Идэвхтэй" : "Түдгэлзсэн"}
        </Badge>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-3">
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
          <PawPrint className="size-3.5 text-[#a85b0a] dark:text-[#f2a93c]" />
          {farmer.livestockCount} мал
        </p>
        <Link
          href={`/dealer/farmers/${farmer.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#a85b0a] dark:text-[#f2a93c]"
        >
          <Edit3 className="size-3.5" />
          Засах
        </Link>
      </div>
    </Card>
  );
}
