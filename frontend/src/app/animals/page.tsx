"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import {
  listLivestock,
  type Gender,
  type Livestock,
  type LivestockStatus,
  type Species,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

const STATUS_LABEL: Record<LivestockStatus, string> = {
  ACTIVE: "Идэвхтэй",
  MISSING: "Алга",
  INACTIVE: "Зарагдсан",
};

const STATUS_TONE: Record<LivestockStatus, string> = {
  ACTIVE: "bg-emerald-400/15 text-emerald-400",
  MISSING: "bg-red-500/15 text-red-400",
  INACTIVE: "bg-white/10 text-gray-300",
};

const GENDER_LABEL: Record<Gender, string> = {
  MALE: "Эр",
  FEMALE: "Эм",
  UNKNOWN: "Тодорхойгүй",
};

const SPECIES_LABEL: Record<Species, string> = {
  SHEEP: "Хонь",
  GOAT: "Ямаа",
};

const STATUS_FILTER_LABEL: Record<LivestockStatus | "ALL", string> = {
  ALL: "Бүх статус",
  ...STATUS_LABEL,
};

const SPECIES_FILTER_LABEL: Record<Species | "ALL", string> = {
  ALL: "Бүх төрөл",
  ...SPECIES_LABEL,
};

const GENDER_FILTER_LABEL: Record<Gender | "ALL", string> = {
  ALL: "Бүх хүйс",
  ...GENDER_LABEL,
};

function animalAge(birthYear?: number) {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

export default function AnimalListPage() {
  useAuthGuard();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LivestockStatus | "ALL">("ALL");
  const [speciesFilter, setSpeciesFilter] = useState<Species | "ALL">("ALL");
  const [genderFilter, setGenderFilter] = useState<Gender | "ALL">("ALL");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, loading, error } = useApi(
    () =>
      listLivestock({
        search: search || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        species: speciesFilter === "ALL" ? undefined : speciesFilter,
        gender: genderFilter === "ALL" ? undefined : genderFilter,
        page,
        limit: PAGE_SIZE,
      }),
    `${search}|${statusFilter}|${speciesFilter}|${genderFilter}|${page}`
  );

  const resetToFirstPage = () => setPage(1);

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" title="Малын бүртгэл" />

      <div className="mt-6 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Нэр, дугаараар хайх..."
            className="h-11 border-white/10 bg-[#161c2c] pl-10 py-0 text-sm text-white placeholder:text-gray-500 focus-visible:border-[#f2a93c] focus-visible:ring-0"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as LivestockStatus | "ALL");
              resetToFirstPage();
            }}
          >
            <SelectTrigger className="h-9 w-full border border-white/10 bg-[#161c2c] text-xs text-gray-300">
              <SelectValue>
                {(value: LivestockStatus | "ALL") => STATUS_FILTER_LABEL[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#161c2c] text-white ring-white/10">
              <SelectItem value="ALL">Бүх статус</SelectItem>
              <SelectItem value="ACTIVE">Идэвхтэй</SelectItem>
              <SelectItem value="MISSING">Алга</SelectItem>
              <SelectItem value="INACTIVE">Зарагдсан</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={speciesFilter}
            onValueChange={(value) => {
              setSpeciesFilter(value as Species | "ALL");
              resetToFirstPage();
            }}
          >
            <SelectTrigger className="h-9 w-full border border-white/10 bg-[#161c2c] text-xs text-gray-300">
              <SelectValue>
                {(value: Species | "ALL") => SPECIES_FILTER_LABEL[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#161c2c] text-white ring-white/10">
              <SelectItem value="ALL">Бүх төрөл</SelectItem>
              <SelectItem value="SHEEP">Хонь</SelectItem>
              <SelectItem value="GOAT">Ямаа</SelectItem>
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
          <p className="text-xs text-gray-400">
            {loading ? "Ачаалж байна..." : `${data?.total ?? 0} мал олдлоо`}
          </p>
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

      {error ? (
        <p className="mt-8 text-center text-sm text-red-400">{error}</p>
      ) : view === "list" ? (
        <div className="mt-3 flex flex-col gap-2">
          {(data?.items ?? []).map((animal) => (
            <AnimalListRow key={animal.id} animal={animal} />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(data?.items ?? []).map((animal) => (
            <AnimalGridCard key={animal.id} animal={animal} />
          ))}
        </div>
      )}

      {!loading && !error && data?.items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">
          Тохирох мал олдсонгүй.
        </p>
      ) : null}

      {data && data.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-sm text-gray-400 disabled:opacity-30"
          >
            ← Өмнөх
          </button>
          <span className="text-xs text-gray-500">
            {data.page} / {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
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

function SpeciesIcon({ species, className }: { species: Species; className?: string }) {
  return species === "SHEEP" ? (
    <PawPrint className={className} strokeWidth={1.5} />
  ) : (
    <Rabbit className={className} strokeWidth={1.5} />
  );
}

function AnimalListRow({ animal }: { animal: Livestock }) {
  const tagInfo = animal.rfidTag ? getTagPrefixInfo(animal.rfidTag.epc) : null;
  const age = animalAge(animal.birthYear);

  return (
    <Link href={`/animals/${animal.id}`}>
      <Card className="flex-row items-center gap-3 bg-[#141a2c] p-3 ring-1 ring-white/5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
          <SpeciesIcon species={animal.species} className="size-5 text-[#f2a93c]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">
              {animal.name || animal.earNumber}
            </p>
            {tagInfo ? (
              <Badge className={cn("shrink-0 px-1.5", tagInfo.bgClass, tagInfo.textClass)}>
                {animal.rfidTag!.epc}
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-xs text-gray-500">
            {SPECIES_LABEL[animal.species]} · {GENDER_LABEL[animal.gender]}
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

function AnimalGridCard({ animal }: { animal: Livestock }) {
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
          <p className="truncate text-sm font-semibold">
            {animal.name || animal.earNumber}
          </p>
          <p className="truncate text-xs text-gray-500">
            {animal.rfidTag?.epc ?? animal.earNumber}
          </p>
          <p className="truncate text-xs text-gray-500">
            {GENDER_LABEL[animal.gender]}
            {age !== null ? ` · ${age} нас` : ""}
          </p>
        </div>
      </Card>
    </Link>
  );
}
