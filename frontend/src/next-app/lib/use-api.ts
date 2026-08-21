"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

/**
 * Re-fetches whenever `key` changes (join whatever varies into one string).
 * A plain string is used instead of a deps array because the React Compiler
 * eslint plugin requires dependency arrays to be literal at each call site,
 * which rules out a generic hook that forwards an arbitrary deps array.
 *
 * `loading` only reflects the very first fetch: refetches (key/refresh changes)
 * keep showing the previous data until the new result lands, rather than
 * resetting to a loading state — every state update happens inside the
 * fetch's own then/catch callbacks, never synchronously in the effect body.
 */
export function useApi<T>(fetcher: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

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
  }, [key, version]);

  const refresh = () => setVersion((v) => v + 1);

  return { data, loading, error, refresh, setData };
}
