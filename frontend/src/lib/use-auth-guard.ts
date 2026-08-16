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
