import Link from "next/link";
import { PawPrint, TriangleAlert } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAnimal } from "@/lib/animals";

const missingIds = ["aa-7492", "ag-3011", "aa-8820"] as const;
const missingAnimals = missingIds.map((id) => getAnimal(id)!);

export default function AnimalListPage() {
  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" />

      <Tabs defaultValue="missing" className="mt-6">
        <TabsList variant="line" className="w-full justify-start border-b border-white/5 pb-0">
          <TabsTrigger
            value="missing"
            className="text-gray-400 data-active:text-[#f2a93c] data-active:after:bg-[#f2a93c]"
          >
            Дутсан (5)
          </TabsTrigger>
          <TabsTrigger
            value="returned"
            className="text-gray-400 data-active:text-white data-active:after:bg-white"
          >
            Ирсэн (1240)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="missing" className="mt-4 flex flex-col gap-4">
          <Card className="flex-row items-start gap-3 bg-[#1c1408] p-4 ring-1 ring-[#f2a93c]/20">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#f2a93c]" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-[#f2a93c]">
                5 мал дутсан байна
              </p>
              <p className="text-xs text-gray-400">
                Хамгийн сүүлд өчигдөр орой 23:45 цагт бүртгэгдсэн.
              </p>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            {missingAnimals.map((animal) => (
              <Card
                key={animal.id}
                className="gap-3 bg-[#141a2c] p-4 ring-1 ring-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                    <PawPrint className="size-6 text-[#f2a93c]" strokeWidth={1.5} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-sm font-semibold">{animal.name}</p>
                    <p className="truncate text-xs text-gray-400">
                      {animal.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      ID: {animal.tagId} · {animal.lastSeen}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-[#f2a93c]/40 bg-transparent text-[#f2a93c] hover:bg-[#f2a93c]/10"
                  render={<Link href={`/animals/${animal.id}`} />}
                >
                  Дэлгэрэнгүй →
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="returned" className="mt-4">
          <p className="text-sm text-gray-400">
            1,240 мал сүрэгт бүртгэлтэй, бүгд орсон байна.
          </p>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </PhoneFrame>
  );
}
