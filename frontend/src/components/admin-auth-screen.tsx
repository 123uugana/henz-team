"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function AdminAuthScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#091225] px-5 py-10 text-[#e8edff]">
      <section className="w-full max-w-md rounded-lg border border-[#2f3a55] bg-[#202a44] p-8 shadow-2xl shadow-black/25">
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandLogo className="mb-5 size-16 rounded-full" withRing />
          <p className="text-sm font-semibold text-[#f0a93c]">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#b7c0d5]">{description}</p>
        </div>

        <div className="flex justify-center">{children}</div>

        <div className="mt-7 border-t border-[#2e3852] pt-5 text-center text-xs text-[#9faabe]">
          <Link href="/" className="hover:text-white">Нүүр рүү буцах</Link>
        </div>
      </section>
    </main>
  );
}

export const clerkAppearance = {
  variables: {
    colorPrimary: "#f0a93c",
    colorBackground: "#202a44",
    colorInputBackground: "#ffffff",
    colorInputText: "#11192a",
    colorText: "#e8edff",
    colorTextSecondary: "#b7c0d5",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-none border-0 bg-transparent w-full",
    card: "shadow-none border-0 bg-transparent w-full p-0",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton: "border-[#33415f]",
    formButtonPrimary: "bg-[#f0a93c] text-[#11192a] hover:bg-[#ffb84f]",
    footerActionLink: "text-[#f0a93c]",
  },
};
