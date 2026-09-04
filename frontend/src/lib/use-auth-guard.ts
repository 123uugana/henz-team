"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSession } from "@/lib/session";

/** Redirects to /phone if signed out, or the dealer area for DEALER users. */
export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/phone");
    } else if (session.user.role === "DEALER" && !pathname.startsWith("/dealer")) {
      router.replace("/dealer");
    }
  }, [pathname, router]);
}

/** Redirects to /phone if signed out, or /dashboard if signed in without the DEALER role. */
export function useDealerGuard() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/phone");
    } else if (session.user.role !== "DEALER") {
      router.replace("/dashboard");
    }
  }, [router]);
}
