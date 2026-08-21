"use client";

import { Building2, Check, X } from "lucide-react";
import { PhoneFrame } from "@/components/phone-frame";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decideDealerRegistration, listDealerRegistrations } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";

const STATUS_LABEL = {
  PENDING: "Хүлээгдэж буй",
  APPROVED: "Зөвшөөрсөн",
  REJECTED: "Татгалзсан",
} as const;

const STATUS_TONE = {
  PENDING: "bg-[#f2a93c]/15 text-[#f2a93c]",
  APPROVED: "bg-emerald-400/15 text-emerald-400",
  REJECTED: "bg-red-500/15 text-red-400",
} as const;

export default function AdminRegistrationsPage() {
  useAuthGuard();
  const { data: registrations, loading, error, refresh } = useApi(
    listDealerRegistrations,
    ""
  );

  const decide = async (id: string, status: "APPROVED" | "REJECTED") => {
    await decideDealerRegistration(id, status);
    refresh();
  };

  return (
    <PhoneFrame>
      <AppHeader backHref="/profile" title="Байгууллагын хүсэлт" />

      {loading ? (
        <p className="mt-10 text-center text-sm text-gray-500">Ачаалж байна...</p>
      ) : error ? (
        <p className="mt-10 text-center text-sm text-red-400">{error}</p>
      ) : (registrations ?? []).length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">Хүсэлт алга байна.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {(registrations ?? []).map((reg) => (
            <Card key={reg.id} className="gap-3 bg-[#141a2c] p-4 ring-1 ring-white/5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5">
                  <Building2 className="size-4 text-[#f2a93c]" strokeWidth={1.75} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-sm font-semibold">{reg.orgName}</p>
                  <p className="text-xs text-gray-500">{reg.contact}</p>
                  <p className="text-xs text-gray-500">
                    Хүссэн prefix: <span className="text-gray-300">{reg.prefixRequested}</span>
                  </p>
                </div>
                <Badge className={STATUS_TONE[reg.status]}>
                  {STATUS_LABEL[reg.status]}
                </Badge>
              </div>

              {reg.status === "PENDING" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => decide(reg.id, "REJECTED")}
                    className="w-full border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10"
                  >
                    <X className="size-3.5" />
                    Татгалзах
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => decide(reg.id, "APPROVED")}
                    className="w-full border-emerald-500/30 bg-transparent text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Check className="size-3.5" />
                    Зөвшөөрөх
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </PhoneFrame>
  );
}
