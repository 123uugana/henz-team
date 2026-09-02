"use client";

import { useMemo, useState } from "react";
import { Building2, Check, FileText, MapPin, X } from "lucide-react";
import { AdminButton, AdminShell, EmptyState, PageHeading, Panel, StatusPill } from "@/components/admin-shell";
import { decideDealerRegistration, listDealerRegistrations } from "@/lib/api";
import { Notice } from "@/lib/admin-actions";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

export default function AdminRegistrationsPage() {
  const { data, error, refresh } = useApi(listDealerRegistrations, "admin-registrations");
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<"PENDING" | "APPROVED">("PENDING");
  const [search, setSearch] = useState("");
  const approvals = useMemo(() => data?.map((registration) => ({
    org: registration.orgName,
    type: `Prefix: ${registration.prefixRequested}`,
    contact: registration.contact,
    location: "Байршил тодорхойгүй",
    requestedAt: new Date(registration.createdAt).toLocaleString("mn-MN"),
    document: "registration.json",
    rawStatus: registration.status,
    status: registration.status === "PENDING" ? "Хүлээгдэж буй" : registration.status === "APPROVED" ? "Зөвшөөрсөн" : "Татгалзсан",
    id: registration.id,
  })) ?? [], [data]);
  const visibleApprovals = useMemo(
    () => {
      const query = search.trim().toLowerCase();
      return approvals.filter((approval) => {
        const matchesTab = tab === "PENDING" ? approval.rawStatus !== "APPROVED" : approval.rawStatus === "APPROVED";
        const matchesSearch = !query || [approval.org, approval.type, approval.contact, approval.location, approval.status].some((value) => value.toLowerCase().includes(query));
        return matchesTab && matchesSearch;
      });
    },
    [approvals, search, tab],
  );

  const decide = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await decideDealerRegistration(id, status);
      setNotice(status === "APPROVED" ? "Хүсэлт зөвшөөрөгдлөө." : "Хүсэлт татгалзагдлаа.");
      refresh();
    } catch {
      setNotice("Хүсэлт шийдвэрлэх үед алдаа гарлаа.");
    }
  };

  return (
    <AdminShell sectionTitle="Гадаад байгууллагын зөвшөөрөл" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Байгууллага, contact, prefix хайх...">
      <PageHeading
        title="External Org Approvals"
        description="Manage partnership requests, verify institutional credentials, and oversee external entities seeking API or physical tracking integration."
        action={
          <div className="grid w-full max-w-md grid-cols-2 rounded-lg border border-[#33415f] bg-[#151f35] p-1">
            <button
              type="button"
              onClick={() => setTab("PENDING")}
              className={cn("rounded-md px-4 py-3 text-sm font-bold", tab === "PENDING" ? "bg-[#f0a93c] text-[#11192a]" : "text-[#c6cfdf]")}
            >
              Хүлээгдэж буй хүсэлт
            </button>
            <button
              type="button"
              onClick={() => setTab("APPROVED")}
              className={cn("rounded-md px-4 py-3 text-sm font-bold", tab === "APPROVED" ? "bg-[#f0a93c] text-[#11192a]" : "text-[#c6cfdf]")}
            >
              Баталгаажсан байгууллага
            </button>
          </div>
        }
      />

      <Notice message={notice} />

      {error ? (
        <div className="mb-5 rounded-lg border border-[#f0a93c]/30 bg-[#2c251a] px-4 py-3 text-sm text-[#f0c075]">
          Registration API холбогдсонгүй: {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        {visibleApprovals.map((approval) => (
          <Panel key={approval.id} className="overflow-hidden">
            <div className="p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-[#22304d] text-[#43d3c5]"><Building2 className="size-5" /></span>
                  <div>
                    <h2 className="text-xl font-bold leading-7">{approval.org}</h2>
                    <p className="mt-1 text-xs font-semibold uppercase text-[#d9c7ae]">{approval.type}</p>
                  </div>
                </div>
                <StatusPill tone="warning">{approval.status}</StatusPill>
              </div>
              <div className="grid gap-4 text-sm text-[#c6cfdf] md:grid-cols-2">
                <div><p className="mb-1 font-semibold text-[#e7ecff]">Холбоо барих</p><p className="whitespace-pre-line">{approval.contact}</p></div>
                <div><p className="mb-1 font-semibold text-[#e7ecff]">Байршил</p><p>{approval.location}</p></div>
                <div><p className="mb-1 font-semibold text-[#e7ecff]">Хүсэлт илгээсэн</p><p>{approval.requestedAt}</p></div>
                <div><p className="mb-1 font-semibold text-[#e7ecff]">Баримт бичиг</p><p className="inline-flex items-center gap-1 text-[#43d3c5]"><FileText className="size-4" />{approval.document}</p></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-[#283550] bg-[#18223a] p-4">
              <AdminButton variant="danger" className="w-full" onClick={() => decide(approval.id, "REJECTED")}><X className="size-4" />Татгалзах</AdminButton>
              <AdminButton className="w-full bg-[#0bb5a8] hover:bg-[#19cabe]" onClick={() => decide(approval.id, "APPROVED")}><Check className="size-4" />Зөвшөөрөх</AdminButton>
            </div>
          </Panel>
        ))}
        {visibleApprovals.length === 0 ? (
          <Panel className="xl:col-span-3">
            <EmptyState title="Хүсэлт олдсонгүй" description="User/dealer байгууллагын хүсэлт илгээсний дараа энд харагдана." />
          </Panel>
        ) : null}
      </div>

      <Panel className="mt-8 overflow-hidden border-[#8f642d]">
        <div className="flex items-center justify-between border-b border-[#283550] px-6 py-4">
          <h2 className="text-xl font-bold">External Animal Detected Logs</h2>
          <StatusPill tone="warning">LIVE FEED</StatusPill>
        </div>
        <div className="space-y-3 p-6">
          {["UNAUTHORIZED  Tag ID: 980.231.445.123", "VERIFIED_EXTERNAL  Tag ID: VET-MN-992.11", "UNAUTHORIZED  Tag ID: Unknown Format"].map((log, index) => (
            <div key={log} className="flex flex-col gap-2 rounded-lg bg-[#0e1728] px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
              <span className="text-[#c6cfdf]">2023.10.25 0{8 - index}:14:22</span>
              <span className="font-semibold text-[#e7ecff]">{log}</span>
              <span className="inline-flex items-center gap-1 text-[#c6cfdf]"><MapPin className="size-4" />Antenna: East-Gate-02</span>
            </div>
          ))}
        </div>
      </Panel>
    </AdminShell>
  );
}
