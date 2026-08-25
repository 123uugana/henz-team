"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PhoneFrame } from "@/components/phone-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, createDealerRegistration, getMyDealerRegistration } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthGuard } from "@/lib/use-auth-guard";

const STATUS = { PENDING: "Хүлээгдэж байна", APPROVED: "Зөвшөөрсөн", REJECTED: "Татгалзсан" } as const;

export default function DealerRegistrationPage() {
  useAuthGuard();
  const { data: current, loading, error, refresh } = useApi(getMyDealerRegistration, "dealer-registration");
  const [orgName, setOrgName] = useState("");
  const [contact, setContact] = useState("");
  const [prefixRequested, setPrefixRequested] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const canSubmit = orgName.trim() && contact.trim() && prefixRequested.trim() && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createDealerRegistration({ orgName: orgName.trim(), contact: contact.trim(), prefixRequested: prefixRequested.trim() });
      refresh();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Хүсэлт илгээж чадсангүй.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PhoneFrame>
      <AppHeader backHref="/profile" title="Гэрээт байгууллагын хүсэлт" />
      {loading ? <p className="mt-10 text-center text-sm text-slate-500 dark:text-gray-400">Ачаалж байна...</p> : null}
      {error ? <p className="mt-10 text-center text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {current && current.status !== "REJECTED" ? (
        <Card className="mt-6 gap-2 bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#141a2c] dark:ring-white/5">
          <div className="flex items-center justify-between"><p className="font-semibold">{current.orgName}</p><Badge>{STATUS[current.status]}</Badge></div>
          <p className="text-sm text-slate-500 dark:text-gray-400">Холбоо барих: {current.contact}</p>
          <p className="text-sm text-slate-500 dark:text-gray-400">Хүссэн prefix: {current.prefixRequested}</p>
          {current.status === "APPROVED" ? <p className="text-sm text-emerald-700 dark:text-emerald-400">Эрх шинэчлэгдсэн. Дахин нэвтэрсний дараа dealer цэс нээгдэнэ.</p> : null}
        </Card>
      ) : !loading ? (
        <div className="mt-6 flex flex-col gap-5">
          {current?.status === "REJECTED" ? <p className="text-sm text-red-600 dark:text-red-400">Өмнөх хүсэлт татгалзсан. Мэдээллээ засаж дахин илгээж болно.</p> : null}
          <Field label="Байгууллагын нэр" id="orgName"><Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="h-12 border-slate-200 bg-white dark:border-white/10 dark:bg-[#161c2c]" /></Field>
          <Field label="Холбоо барих мэдээлэл" id="contact"><Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} className="h-12 border-slate-200 bg-white dark:border-white/10 dark:bg-[#161c2c]" /></Field>
          <Field label="Хүсэх RFID prefix" id="prefix"><Input id="prefix" value={prefixRequested} onChange={(e) => setPrefixRequested(e.target.value.toUpperCase())} placeholder="Жишээ: ORG-" className="h-12 border-slate-200 bg-white dark:border-white/10 dark:bg-[#161c2c]" /></Field>
          {submitError ? <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p> : null}
          <Button variant="brand" size="xl" disabled={!canSubmit} onClick={submit}>{submitting ? "Илгээж байна..." : "Хүсэлт илгээх"}</Button>
        </div>
      ) : null}
    </PhoneFrame>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
