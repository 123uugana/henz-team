"use client";

import Link from "next/link";
import { Megaphone, PawPrint, TriangleAlert } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAnimal } from "@/lib/store";

const summary = [
  { label: "Нийт мал", value: "1,245", tone: "text-white" },
  { label: "Өглөө", value: "1,245", tone: "text-emerald-400" },
  { label: "Орой", value: "1,242", tone: "text-red-400" },
];

const missingTags: Record<string, string> = {
  "0492": "Баруун талбай",
  "1103": "Цагаан",
  "0821": "Цагаан",
};

export default function MissingAnimalsPage() {
  const missingAnimals = Object.keys(missingTags).map((id) => getAnimal(id)!);

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" />

      <div className="mt-6 flex flex-col items-center gap-1 text-center">
        <div className="relative mb-2 flex size-16 items-center justify-center rounded-full bg-red-500/10">
          <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl" />
          <TriangleAlert className="relative size-8 text-red-400" strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl font-bold">3 мал дутлаа</h1>
        <p className="text-sm text-gray-400">Өнөөдрийн тооллогын дүн</p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {summary.map(({ label, value, tone }) => (
          <Card
            key={label}
            className="items-center gap-1 bg-[#141a2c] p-3 text-center ring-1 ring-white/5"
          >
            <p className={`text-lg font-bold ${tone}`}>{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-200">
          Алга болсон мал
        </h2>

        <div className="flex flex-col gap-2">
          {missingAnimals.map((animal) => (
            <Link key={animal.id} href={`/animals/${animal.id}`}>
              <Card className="flex-row items-center gap-3 bg-[#141a2c] p-3 ring-1 ring-white/5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/5">
                  <PawPrint className="size-5 text-[#f2a93c]" strokeWidth={1.75} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-sm font-medium">
                    {animal.name} {animal.tagEpc}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {animal.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-gray-400">{animal.lastSeen}</span>
                  <Badge variant="outline" className="border-white/10 text-gray-300">
                    {missingTags[animal.id]}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
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
