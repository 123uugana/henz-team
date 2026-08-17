"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSession } from "@/lib/session";

/** Redirects to /phone if there's no signed-in session. */
export function useAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    if (!getSession()) {
      router.replace("/phone");
    }
  }, [router]);
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
