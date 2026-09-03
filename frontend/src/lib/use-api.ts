"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

/**
 * Re-fetches whenever `key` changes (join whatever varies into one string).
 * A plain string is used instead of a deps array because the React Compiler
 * eslint plugin requires dependency arrays to be literal at each call site,
 * which rules out a generic hook that forwards an arbitrary deps array.
 *
 * `loading` only reflects the very first fetch. Call the returned `refresh()`
 * to re-fetch on demand (e.g. a refresh button) — it returns a promise so the
 * caller can track its own in-flight state without an effect watching `data`.
 */
export function useApi<T>(fetcher: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Алдаа гарлаа.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Callable from an event handler (e.g. a refresh button's onClick), so the
  // caller can await it to know exactly when the refetch has landed.
  const refresh = () => {
    return fetcher()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Алдаа гарлаа.");
      });
  };

  return { data, loading, error, refresh, setData };
}
