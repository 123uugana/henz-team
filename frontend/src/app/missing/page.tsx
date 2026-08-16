"use client";

import Link from "next/link";
import { Megaphone, PawPrint, TriangleAlert } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboard, getMissingLivestock } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";

export default function MissingAnimalsPage() {
  useAuthGuard();
  const { data: missing, loading, error } = useApi(getMissingLivestock, "");
  const { data: dashboard } = useApi(getDashboard, "");

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" />

      <div className="mt-6 flex flex-col items-center gap-1 text-center">
        <div className="relative mb-2 flex size-16 items-center justify-center rounded-full bg-red-500/10">
          <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl" />
          <TriangleAlert className="relative size-8 text-red-400" strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl font-bold">{missing?.length ?? 0} мал дутлаа</h1>
        <p className="text-sm text-gray-400">Өнөөдрийн тооллогын дүн</p>
      </div>

      {dashboard ? (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Card className="items-center gap-1 bg-[#141a2c] p-3 text-center ring-1 ring-white/5">
            <p className="text-lg font-bold text-white">{dashboard.totalLivestock}</p>
            <p className="text-xs text-gray-400">Нийт мал</p>
          </Card>
          <Card className="items-center gap-1 bg-[#141a2c] p-3 text-center ring-1 ring-white/5">
            <p className="text-lg font-bold text-emerald-400">
              {dashboard.totalLivestock - (missing?.length ?? 0)}
            </p>
            <p className="text-xs text-gray-400">Одоо байгаа</p>
          </Card>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-200">
          Алга болсон мал
        </h2>

        {loading ? (
          <p className="text-sm text-gray-500">Ачаалж байна...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : missing && missing.length === 0 ? (
          <p className="text-sm text-gray-500">Дутуу мал алга байна.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(missing ?? []).map((animal) => (
              <Link key={animal.id} href={`/animals/${animal.id}`}>
                <Card className="flex-row items-center gap-3 bg-[#141a2c] p-3 ring-1 ring-white/5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/5">
                    <PawPrint className="size-5 text-[#f2a93c]" strokeWidth={1.75} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-sm font-medium">
                      {animal.name || animal.earNumber}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      Дугаар: {animal.earNumber}
                    </p>
                  </div>
                  {animal.lastSeenAt ? (
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(animal.lastSeenAt).toLocaleDateString("mn-MN")}
                    </span>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="brand"
        size="xl"
        className="mt-6 w-full bg-linear-to-r from-[#f2a93c] to-[#e08a2c]"
      >
        <Megaphone />
        Хайлтын дохио илгээх
      </Button>

      <BottomNav />
    </PhoneFrame>
  );
}
