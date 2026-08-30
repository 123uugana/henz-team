"use client";

import { useEffect, useState } from "react";
import { RadarLogo } from "@/components/radar-logo";
import { cn } from "@/lib/utils";

const HOLD_MS = 900;
const FADE_MS = 400;

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const hideTimer = setTimeout(() => setHiding(true), HOLD_MS);
    const unmountTimer = setTimeout(() => setMounted(false), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  return (
    <>
      {children}
      {mounted ? (
        <div
          className={cn(
            "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4",
            "bg-linear-to-b from-[#fffdf8] via-[#faf7ef] to-[#f1ede3] dark:from-[#141a2c] dark:via-[#10141f] dark:to-[#0a0d17]",
            "transition-opacity ease-out",
            hiding ? "pointer-events-none opacity-0" : "opacity-100",
          )}
          style={{ transitionDuration: `${FADE_MS}ms` }}
          aria-hidden={hiding}
        >
          <RadarLogo size={88} animated className="drop-shadow-[0_8px_24px_rgba(242,169,60,0.35)]" />
          <p className="text-sm font-semibold tracking-wide text-[#a85b0a] dark:text-[#f2a93c]">
            Хэнц Хурга
          </p>
        </div>
      ) : null}
    </>
  );
}
