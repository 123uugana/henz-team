import Link from "next/link";
import { notFound } from "next/navigation";
import { DoorOpen, Pencil, PawPrint, TriangleAlert } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { animals, getAnimal } from "@/lib/animals";

export function generateStaticParams() {
  return animals.map((animal) => ({ id: animal.id }));
}

export default async function AnimalDetailPage({
  params,
}: PageProps<"/animals/[id]">) {
  const { id } = await params;
  const animal = getAnimal(id);

  if (!animal) {
    notFound();
  }

  return (
    <PhoneFrame className="px-0">
      <div className="px-6">
        <AppHeader backHref="/animals" title="Дэлгэрэнгүй" />
      </div>

      <div className="relative mt-4 flex h-56 items-center justify-center bg-linear-to-b from-[#2a3450] to-[#141a2c]">
        <PawPrint className="size-20 text-[#f2a93c]/70" strokeWidth={1} />
        <div className="absolute bottom-3 flex gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={`size-1.5 rounded-full ${i === 0 ? "bg-[#f2a93c]" : "bg-white/30"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-8 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">{animal.name}</h1>
            <p className="text-xs text-gray-400"># ID: {animal.tagId}</p>
          </div>
          <Badge className="bg-[#f2a93c]/15 text-[#f2a93c]">
            {animal.species}
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full border-white/10 bg-transparent text-white hover:bg-white/5"
          >
            <Pencil />
            Засах
          </Button>
          <Button
            variant="outline"
            className="w-full border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10"
            render={<Link href="/missing" />}
          >
            <TriangleAlert />
            Дутуу гэж тэмдэглэх
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-200">
            Бүртгэлийн түүх
          </h2>

          <div className="flex flex-col gap-4">
            {animal.history.map((entry, index) => (
              <div key={index} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5">
                  <DoorOpen className="size-4 text-[#f2a93c]" strokeWidth={1.75} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {entry.location}
                    <span className="text-xs font-normal text-gray-500">
                      {entry.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{entry.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
