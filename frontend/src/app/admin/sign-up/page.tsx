"use client";

import { SignUp } from "@clerk/nextjs";
import { AdminAuthScreen, clerkAppearance } from "@/components/admin-auth-screen";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function AdminSignUpPage() {
  if (!clerkPublishableKey) {
    return (
      <AdminAuthScreen
        eyebrow="Clerk тохиргоо дутуу"
        title="Email бүртгэл асаахад Clerk keys хэрэгтэй"
        description="Clerk dashboard-оос publishable/secret key аваад env-д тохируулна."
      >
        <div className="rounded-lg border border-[#f0a93c]/35 bg-[#2b2418] p-4 text-sm leading-6 text-[#f0c075]">
          <p className="font-semibold text-white">Шаардлагатай env:</p>
          <p className="mt-2 font-mono text-xs">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...</p>
          <p className="font-mono text-xs">CLERK_SECRET_KEY=sk_...</p>
          <p className="font-mono text-xs">ADMIN_EMAILS=admin@example.com</p>
        </div>
      </AdminAuthScreen>
    );
  }

  return (
    <AdminAuthScreen
      eyebrow="Хэнц Хурга - Админ"
      title="Email хаягаар бүртгүүлэх"
      description="Admin email-ээ баталгаажуулаад системд нэвтэрнэ."
    >
      <SignUp
        routing="hash"
        signInUrl="/admin/login"
        fallbackRedirectUrl="/admin"
        forceRedirectUrl="/admin"
        appearance={clerkAppearance}
      />
    </AdminAuthScreen>
  );
}
