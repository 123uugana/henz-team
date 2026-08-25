"use client";

import { useLayoutEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_KEY = "henz-hurga-theme";

export function ThemeToggle() {
  useLayoutEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      localStorage.getItem(THEME_KEY) === "dark"
    );
  }, []);

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={toggleTheme}
      aria-label="Light болон dark mode солих"
      title="Theme солих"
      className="rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
