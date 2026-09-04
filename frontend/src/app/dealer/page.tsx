"use client";

import Link from "next/link";
import { Edit3, PawPrint, Phone, Plus, Search, UserRound, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { PhoneFrame } from "@/components/phone-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listFarmers, type Farmer } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useDealerGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";

export default function DealerHomePage() {
  useDealerGuard();

  const { data, loading, error } = useApi(() => listFarmers({ limit: 10 }), "");
  const farmers = data?.items ?? [];
  const farmerCount = data?.total ?? 0;

  return (
    <PhoneFrame>
      <AppHeader title="Миний малчид" />

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Миний малчид</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Өөрийн бүртгэсэн малчдаа харах, нэмэх хэсэг
            </p>
          </div>
          <Badge className="bg-[#f2a93c]/15 text-[#a85b0a] dark:text-[#f2a93c]">DEALER</Badge>
        </div>

        <Card className="gap-3 bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#141a2c] dark:ring-white/5">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
              <UsersRound className="size-6 text-[#a85b0a] dark:text-[#f2a93c]" strokeWidth={1.5} />
            </span>
            <div className="flex flex-col">
              <p className="text-sm text-slate-500 dark:text-gray-400">Бүртгэлтэй малчин</p>
              <p className="text-3xl font-bold">{loading ? "..." : error ? "-" : farmerCount}</p>
            </div>
          </div>
        </Card>

        <Button variant="brand" size="xl" className="w-full gap-2" render={<Link href="/dealer/farmers/new" />}>
          <Plus className="size-4" />
          Малчин нэмэх
        </Button>

        <Link href="/dealer/farmers" className="relative block">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500 dark:text-gray-400" />
          <Input
            readOnly
            placeholder="Малчны нэр, дугаараар хайх..."
            className="h-11 cursor-pointer border-slate-200 bg-white py-0 pl-10 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:ring-0 dark:border-white/10 dark:bg-[#161c2c] dark:text-white"
          />
        </Link>

        {error ? <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="flex flex-col gap-2">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="h-[92px] animate-pulse bg-slate-100 dark:bg-[#141a2c]" />
              ))
            : farmers.map((farmer) => <FarmerRow key={farmer.id} farmer={farmer} />)}
        </div>

        {!loading && !error && farmers.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-gray-400">
            Одоогоор малчин бүртгээгүй байна. “Малчин нэмэх” товчоор эхний малчнаа нэмнэ.
          </p>
        ) : null}

        {!loading && farmerCount > farmers.length ? (
          <Button
            variant="outline"
            size="xl"
            className="w-full gap-2 border-slate-200 bg-white/60 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            render={<Link href="/dealer/farmers" />}
          >
            <Search className="size-4" />
            Бүгдийг харах
          </Button>
        ) : null}
      </div>
    </PhoneFrame>
  );
}

function FarmerRow({ farmer }: { farmer: Farmer }) {
  const location = [farmer.aimag, farmer.sum].filter(Boolean).join(", ");

  return (
    <Card className="gap-3 bg-white p-3 ring-1 ring-slate-200/80 dark:bg-[#141a2c] dark:ring-white/5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
          <UserRound className="size-5 text-[#a85b0a] dark:text-[#f2a93c]" strokeWidth={1.5} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-sm font-semibold">{farmer.name || farmer.phoneNumber}</p>
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
              : "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-gray-300",
          )}
        >
          {farmer.status === "ACTIVE" ? "Идэвхтэй" : "Түдгэлзсэн"}
        </Badge>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-white/10">
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
