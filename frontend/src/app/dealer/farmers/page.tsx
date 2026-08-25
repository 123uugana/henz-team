"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PawPrint, Phone, Plus, Search, Trash2, UserRound } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError, listFarmers, removeFarmer, type Farmer } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useDealerGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";

export default function DealerFarmersPage() {
  useDealerGuard();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [aimagInput, setAimagInput] = useState("");
  const [aimag, setAimag] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<Farmer | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setAimag(aimagInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, aimagInput]);

  const { data, loading, error, refresh } = useApi(
    () => listFarmers({ search: search || undefined, aimag: aimag || undefined }),
    `${search}|${aimag}`
  );

  const handleRemove = async () => {
    if (!pendingRemoval) return;
    setRemoving(true);
    setRemoveError(null);

    try {
      await removeFarmer(pendingRemoval.id);
      setPendingRemoval(null);
      refresh();
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : "Хасаж чадсангүй.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <PhoneFrame>
      <AppHeader title="Миний малчид" />

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
            <FarmerRow
              key={farmer.id}
              farmer={farmer}
              onRemove={() => {
                setRemoveError(null);
                setPendingRemoval(farmer);
              }}
            />
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

      <Sheet
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open && !removing) setPendingRemoval(null);
        }}
      >
        <SheetContent side="bottom" className="rounded-t-3xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#141a2c] px-6 pb-8 pt-2 text-slate-900 dark:text-white">
          <SheetHeader className="items-center px-0 pb-2 pt-4">
            <div className="mb-1 h-1 w-10 rounded-full bg-slate-300 dark:bg-white/15" />
            <SheetTitle className="text-slate-900 dark:text-white">Малчин хасах</SheetTitle>
          </SheetHeader>

          {pendingRemoval ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-700 dark:text-gray-300">
                <span className="font-medium text-slate-900 dark:text-white">{pendingRemoval.name}</span>-г
                таны малчдын жагсаалтаас хасах уу? Уг хэрэглэгчийн бүртгэл устахгүй.
              </p>

              {removeError ? <p className="text-sm text-red-600 dark:text-red-400">{removeError}</p> : null}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 border-slate-200 dark:border-white/10 bg-transparent text-slate-700 dark:text-gray-300"
                  disabled={removing}
                  onClick={() => setPendingRemoval(null)}
                >
                  Болих
                </Button>
                <Button
                  variant="brand"
                  size="lg"
                  className="flex-1 bg-red-500 text-white hover:bg-red-500/90"
                  disabled={removing}
                  onClick={handleRemove}
                >
                  {removing ? "Хасаж байна..." : "Хасах"}
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </PhoneFrame>
  );
}

function FarmerRow({ farmer, onRemove }: { farmer: Farmer; onRemove: () => void }) {
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
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"
        >
          <Trash2 className="size-3.5" />
          Хасах
        </button>
      </div>
    </Card>
  );
}
