"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, Megaphone, PawPrint, Rabbit, ShieldAlert, TriangleAlert } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getMissingLivestock,
  listScans,
  sendSearchSignal,
  type MissingLivestockEntry,
  type Species,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";

// Above this many missing animals, show a per-species summary instead of
// scrolling through every card individually.
const ITEMIZED_LIMIT = 20;

const SPECIES_LABEL: Record<Species, string> = { SHEEP: "Хонь", GOAT: "Ямаа" };

function relativeTime(iso?: string) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (60 * 60_000));

  if (hours < 1)
    return `${Math.max(1, Math.floor(diffMs / 60_000))} минутын өмнө`;
  if (hours < 24) return `${hours} цагийн өмнө`;
  return `${Math.floor(hours / 24)} өдрийн өмнө`;
}

function SpeciesIcon({
  species,
  className,
}: {
  species: Species;
  className?: string;
}) {
  return species === "SHEEP" ? (
    <PawPrint className={className} strokeWidth={1.5} />
  ) : (
    <Rabbit className={className} strokeWidth={1.5} />
  );
}

export default function MissingAnimalsPage() {
  useAuthGuard();
  const {
    data: missing,
    loading: loadingMissing,
    error: missingError,
  } = useApi(getMissingLivestock, "");
  const { data: scans, loading: loadingScans } = useApi(listScans, "");
  const [signaling, setSignaling] = useState(false);
  const [signalMessage, setSignalMessage] = useState<string | null>(null);

  const foreignCount = useMemo(() => {
    if (!scans) return 0;
    return new Set(scans.filter((s) => !s.livestock).map((s) => s.epc)).size;
  }, [scans]);

  const lastRecorded = useMemo(() => {
    if (!missing || missing.length === 0) return null;
    const latest = missing
      .map((m) => m.lastSeenAt)
      .filter((v): v is string => !!v)
      .sort()
      .at(-1);
    return latest ? new Date(latest).toLocaleString("mn-MN") : null;
  }, [missing]);

  const speciesBreakdown = useMemo(() => {
    const counts: Record<Species, number> = { SHEEP: 0, GOAT: 0 };
    for (const m of missing ?? []) counts[m.species] += 1;
    return counts;
  }, [missing]);

  const missingCount = missing?.length ?? 0;
  const showAggregate = missingCount > ITEMIZED_LIMIT;

  const handleSearchSignal = async () => {
    setSignaling(true);
    setSignalMessage(null);
    try {
      const result = await sendSearchSignal();
      window.dispatchEvent(new Event("hents-alerts-updated"));
      setSignalMessage(
        result.dealerNotified
          ? `${result.missingCount} малын хайлтын дохиог танд болон гэрээт байгууллагад илгээлээ.`
          : `${result.missingCount} малын хайлтын хүсэлт бүртгэгдлээ.`
      );
    } catch (err) {
      setSignalMessage(err instanceof Error ? err.message : "Дохио илгээж чадсангүй.");
    } finally {
      setSignaling(false);
    }
  };

  return (
    <PhoneFrame>
      <AppHeader backHref="/dashboard" />

      <Tabs defaultValue="missing" className="mt-6">
        <TabsList variant="line" className="w-full justify-start border-b border-slate-200 dark:border-white/10 pb-0">
          <TabsTrigger
            value="missing"
            className="text-slate-500 dark:text-gray-400 data-active:text-[#a85b0a] data-active:after:bg-[#f2a93c]"
          >
            Дутсан ({missingCount})
          </TabsTrigger>
          <TabsTrigger
            value="arrived"
            className="text-slate-500 dark:text-gray-400 data-active:text-[#a85b0a] data-active:after:bg-[#f2a93c]"
          >
            Ирсэн ({foreignCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="missing" className="mt-4 flex flex-col gap-4">
          {loadingMissing ? (
            <p className="text-center text-sm text-slate-500 dark:text-gray-400">Ачаалж байна...</p>
          ) : missingError ? (
            <p className="text-center text-sm text-red-600 dark:text-red-400">{missingError}</p>
          ) : (
            <>
              <Card className="flex-row items-start gap-3 bg-amber-50 dark:bg-[#1c1408] p-4 ring-1 ring-[#f2a93c]/20">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#a85b0a] dark:text-[#f2a93c]" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-[#a85b0a] dark:text-[#f2a93c]">
                    {missingCount} мал дутсан байна
                  </p>
                  {lastRecorded ? (
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      Хамгийн сүүлд {lastRecorded} бүртгэгдсэн.
                    </p>
                  ) : null}
                </div>
              </Card>

              {missingCount === 0 ? (
                <p className="text-center text-sm text-slate-500 dark:text-gray-400">
                  Дутуу мал алга байна.
                </p>
              ) : showAggregate ? (
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(speciesBreakdown) as Species[])
                    .filter((s) => speciesBreakdown[s] > 0)
                    .map((s) => (
                      <Card key={s} className="items-center gap-1 bg-white dark:bg-[#141a2c] p-4 text-center ring-1 ring-slate-200/80 dark:ring-white/5">
                        <SpeciesIcon species={s} className="size-5 text-[#a85b0a] dark:text-[#f2a93c]" />
                        <p className="text-2xl font-bold">{speciesBreakdown[s]}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">{SPECIES_LABEL[s]} дутсан</p>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(missing ?? []).map((animal: MissingLivestockEntry) => (
                    <Card key={animal.id} className="gap-3 bg-white dark:bg-[#141a2c] p-4 ring-1 ring-slate-200/80 dark:ring-white/5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/5">
                          {animal.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={animal.imageUrl}
                              alt={animal.name || animal.earNumber}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <SpeciesIcon species={animal.species} className="size-6 text-[#a85b0a] dark:text-[#f2a93c]" />
                          )}
                        </span>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p className="text-sm font-semibold">
                            {animal.name || SPECIES_LABEL[animal.species]}
                          </p>
                          {animal.markDescription ? (
                            <p className="truncate text-xs text-slate-500 dark:text-gray-400">
                              {animal.markDescription}
                            </p>
                          ) : null}
                          <div className="flex items-center gap-2 pt-0.5">
                            <Badge className="bg-[#f2a93c]/15 text-[#a85b0a] dark:text-[#f2a93c]">
                              ID: #{animal.earNumber}
                            </Badge>
                            {animal.lastSeenAt ? (
                              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400">
                                <Clock className="size-3" />
                                {relativeTime(animal.lastSeenAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-[#f2a93c]/40 bg-transparent text-[#a85b0a] dark:text-[#f2a93c] hover:bg-[#f2a93c]/10"
                        render={<Link href={`/animals/${animal.id}`} />}
                      >
                        Дэлгэрэнгүй →
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
              <Button
                variant="brand"
                size="xl"
                className="mt-2 w-full bg-linear-to-r from-[#f2a93c] to-[#e08a2c]"
                disabled={missingCount === 0 || signaling}
                onClick={handleSearchSignal}
              >
                <Megaphone />
                {signaling ? "Илгээж байна..." : "Хайлтын дохио илгээх"}
              </Button>
              {signalMessage ? <p className="text-center text-sm text-slate-600 dark:text-gray-300">{signalMessage}</p> : null}
            </>
          )}
        </TabsContent>

        <TabsContent
          value="arrived"
          className="mt-4 flex flex-col items-center gap-2 py-10 text-center"
        >
          {loadingScans ? (
            <p className="text-sm text-slate-500 dark:text-gray-400">Ачаалж байна...</p>
          ) : (
            <>
              <ShieldAlert className="size-8 text-[#a85b0a] dark:text-[#f2a93c]" strokeWidth={1.5} />
              <p className="text-3xl font-bold">{foreignCount}</p>
              <p className="max-w-56 text-sm text-slate-500 dark:text-gray-400">
                бүртгэлгүй эсвэл өөр өрхийн RFID шошго таны хашаанд илэрлээ
              </p>
            </>
          )}
        </TabsContent>
      </Tabs>

      <BottomNav />
    </PhoneFrame>
  );
}
