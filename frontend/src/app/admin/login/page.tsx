"use client";

import { SignIn } from "@clerk/nextjs";
import { AdminAuthScreen, clerkAppearance } from "@/components/admin-auth-screen";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function AdminLoginPage() {
  if (!clerkPublishableKey) {
    return <MissingClerkConfig />;
  }

  return (
    <AdminAuthScreen
      eyebrow="Хэнц Хурга - Админ"
      title="Email хаягаар нэвтрэх"
      description="Clerk account-аараа системийн admin хэсэгт орно."
    >
      <SignIn
        routing="hash"
        signUpUrl="/admin/sign-up"
        fallbackRedirectUrl="/admin"
        forceRedirectUrl="/admin"
        appearance={clerkAppearance}
      />
    </AdminAuthScreen>
  );
}

function MissingClerkConfig() {
  return (
    <AdminAuthScreen
      eyebrow="Clerk тохиргоо дутуу"
      title="Email login асаахад Clerk keys хэрэгтэй"
      description="Frontend дээр NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, backend дээр CLERK_SECRET_KEY болон ADMIN_EMAILS тохируулсны дараа email sign-in ажиллана."
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
