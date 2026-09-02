"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { setAuthTokenResolver } from "@/lib/api";

export function ClerkTokenBridge() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    setAuthTokenResolver(async () => {
      if (!isSignedIn) return null;
      return getToken();
    });

    return () => setAuthTokenResolver(null);
  }, [getToken, isSignedIn]);

  return null;
}
