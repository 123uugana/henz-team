"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutGrid, List, PawPrint, Rabbit, Search } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTagPrefixInfo } from "@/lib/tag-prefix";
import { useAnimals, type Animal, type AnimalStatus, type Gender } from "@/lib/store";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

const STATUS_LABEL: Record<AnimalStatus, string> = {
  ACTIVE: "Идэвхтэй",
  MISSING: "Алга",
  SOLD: "Зарагдсан",
};

const STATUS_TONE: Record<AnimalStatus, string> = {
  ACTIVE: "bg-emerald-400/15 text-emerald-400",
  MISSING: "bg-red-500/15 text-red-400",
  SOLD: "bg-white/10 text-gray-300",
};

const GENDER_LABEL: Record<Gender, string> = {
  MALE: "Эр",
  FEMALE: "Эм",
  UNKNOWN: "Тодорхойгүй",
};

const STATUS_FILTER_LABEL: Record<AnimalStatus | "ALL", string> = {
  ALL: "Бүх статус",
  ACTIVE: "Идэвхтэй",
  MISSING: "Алга",
  SOLD: "Зарагдсан",
};

const SPECIES_FILTER_LABEL: Record<Animal["species"] | "ALL", string> = {
  ALL: "Бүх төрөл",
  Хонь: "Хонь",
  Ямаа: "Ямаа",
};

const GENDER_FILTER_LABEL: Record<Gender | "ALL", string> = {
  ALL: "Бүх хүйс",
  MALE: "Эр",
  FEMALE: "Эм",
  UNKNOWN: "Тодорхойгүй",
};

function animalAge(birthYear?: number) {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

export default function AnimalListPage() {
  const [animals] = useAnimals();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AnimalStatus | "ALL">("ALL");
  const [speciesFilter, setSpeciesFilter] = useState<Animal["species"] | "ALL">("ALL");
  const [genderFilter, setGenderFilter] = useState<Gender | "ALL">("ALL");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return animals.filter((animal) => {
      if (statusFilter !== "ALL" && animal.status !== statusFilter) return false;
      if (speciesFilter !== "ALL" && animal.species !== speciesFilter) return false;
      if (genderFilter !== "ALL" && animal.gender !== genderFilter) return false;
      if (
        query &&
        !animal.name.toLowerCase().includes(query) &&
        !animal.tagEpc.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [animals, search, statusFilter, speciesFilter, genderFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const resetToFirstPage = () => setPage(1);

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" title="Малын бүртгэл" />

      <div className="mt-6 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetToFirstPage();
            }}
            placeholder="Нэр, дугаараар хайх..."
            className="h-11 border-white/10 bg-[#161c2c] pl-10 py-0 text-sm text-white placeholder:text-gray-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as AnimalStatus | "ALL");
              resetToFirstPage();
            }}
          >
            <SelectTrigger className="h-9 w-full border border-white/10 bg-[#161c2c] text-xs text-gray-300">
              <SelectValue>
                {(value: AnimalStatus | "ALL") => STATUS_FILTER_LABEL[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#161c2c] text-white ring-white/10">
              <SelectItem value="ALL">Бүх статус</SelectItem>
              <SelectItem value="ACTIVE">Идэвхтэй</SelectItem>
              <SelectItem value="MISSING">Алга</SelectItem>
              <SelectItem value="SOLD">Зарагдсан</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={speciesFilter}
            onValueChange={(value) => {
              setSpeciesFilter(value as Animal["species"] | "ALL");
              resetToFirstPage();
            }}
          >
            <SelectTrigger className="h-9 w-full border border-white/10 bg-[#161c2c] text-xs text-gray-300">
              <SelectValue>
                {(value: Animal["species"] | "ALL") => SPECIES_FILTER_LABEL[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#161c2c] text-white ring-white/10">
              <SelectItem value="ALL">Бүх төрөл</SelectItem>
              <SelectItem value="Хонь">Хонь</SelectItem>
              <SelectItem value="Ямаа">Ямаа</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={genderFilter}
            onValueChange={(value) => {
              setGenderFilter(value as Gender | "ALL");
              resetToFirstPage();
            }}
          >
            <SelectTrigger className="h-9 w-full border border-white/10 bg-[#161c2c] text-xs text-gray-300">
              <SelectValue>
                {(value: Gender | "ALL") => GENDER_FILTER_LABEL[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#161c2c] text-white ring-white/10">
              <SelectItem value="ALL">Бүх хүйс</SelectItem>
              <SelectItem value="MALE">Эр</SelectItem>
              <SelectItem value="FEMALE">Эм</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{filtered.length} мал олдлоо</p>
          <div className="flex items-center gap-1 rounded-xl bg-[#161c2c] p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="Жагсаалт харагдац"
              className={cn(
                "flex size-7 items-center justify-center rounded-lg",
                view === "list" ? "bg-[#f2a93c] text-[#1a1206]" : "text-gray-400"
              )}
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid харагдац"
              className={cn(
                "flex size-7 items-center justify-center rounded-lg",
                view === "grid" ? "bg-[#f2a93c] text-[#1a1206]" : "text-gray-400"
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <div className="mt-3 flex flex-col gap-2">
          {pageItems.map((animal) => (
            <AnimalListRow key={animal.id} animal={animal} />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {pageItems.map((animal) => (
            <AnimalGridCard key={animal.id} animal={animal} />
          ))}
        </div>
      )}

      {pageItems.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">
          Тохирох мал олдсонгүй.
        </p>
      ) : null}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-sm text-gray-400 disabled:opacity-30"
          >
            ← Өмнөх
          </button>
          <span className="text-xs text-gray-500">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="text-sm text-gray-400 disabled:opacity-30"
          >
            Дараах →
          </button>
        </div>
      ) : null}

      <BottomNav />
    </PhoneFrame>
  );
}

function SpeciesIcon({ species, className }: { species: Animal["species"]; className?: string }) {
  return species === "Хонь" ? (
    <PawPrint className={className} strokeWidth={1.5} />
  ) : (
    <Rabbit className={className} strokeWidth={1.5} />
  );
}

function AnimalListRow({ animal }: { animal: Animal }) {
  const tagInfo = getTagPrefixInfo(animal.tagEpc);
  const age = animalAge(animal.birthYear);

  return (
    <Link href={`/animals/${animal.id}`}>
      <Card className="flex-row items-center gap-3 bg-[#141a2c] p-3 ring-1 ring-white/5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
          <SpeciesIcon species={animal.species} className="size-5 text-[#f2a93c]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{animal.name}</p>
            <Badge className={cn("shrink-0 px-1.5", tagInfo.bgClass, tagInfo.textClass)}>
              {animal.tagEpc}
            </Badge>
          </div>
          <p className="truncate text-xs text-gray-500">
            {animal.species} · {GENDER_LABEL[animal.gender]}
            {age !== null ? ` · ${age} нас` : ""}
          </p>
        </div>
        <Badge className={cn("shrink-0", STATUS_TONE[animal.status])}>
          {STATUS_LABEL[animal.status]}
        </Badge>
      </Card>
    </Link>
  );
}

function AnimalGridCard({ animal }: { animal: Animal }) {
  const age = animalAge(animal.birthYear);

  return (
    <Link href={`/animals/${animal.id}`}>
      <Card className="gap-2 bg-[#141a2c] p-3 ring-1 ring-white/5">
        <div className="flex items-center justify-between">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/5">
            <SpeciesIcon species={animal.species} className="size-5 text-[#f2a93c]" />
          </span>
          <Badge className={cn("px-1.5", STATUS_TONE[animal.status])}>
            {STATUS_LABEL[animal.status]}
          </Badge>
        </div>
        <div className="flex flex-col">
          <p className="truncate text-sm font-semibold">{animal.name}</p>
          <p className="truncate text-xs text-gray-500">{animal.tagEpc}</p>
          <p className="truncate text-xs text-gray-500">
            {GENDER_LABEL[animal.gender]}
            {age !== null ? ` · ${age} нас` : ""}
          </p>
        </div>
      </Card>
    </Link>
  );
}
