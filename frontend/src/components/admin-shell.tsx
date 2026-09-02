"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Bell,
  Boxes,
  CircleHelp,
  Download,
  Grid2X2,
  LogOut,
  PawPrint,
  RadioTower,
  Search,
  Settings,
  SlidersHorizontal,
  Store,
  Tags,
  X,
  UsersRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Хянах самбар", icon: Grid2X2 },
  { href: "/admin/users", label: "Хэрэглэгчид", icon: UsersRound },
  { href: "/admin/dealers", label: "Гэрээт борлуулагчид", icon: Store },
  { href: "/admin/livestock", label: "Мал", icon: PawPrint },
  { href: "/admin/devices", label: "Төхөөрөмж/Антенна", icon: RadioTower },
  { href: "/admin/tags", label: "Tag удирдлага", icon: Tags },
  { href: "/admin/settings", label: "Tag тохиргоо", icon: Settings },
  { href: "/admin/registrations", label: "Гадаад бүртгэл", icon: Boxes },
];

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AdminShell({
  children,
  sectionTitle = "Хэнц Хурга Admin",
  searchPlaceholder = "Хайх...",
  searchValue,
  onSearchChange,
}: {
  children: React.ReactNode;
  sectionTitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}) {
  if (clerkPublishableKey) {
    return (
      <ClerkAdminGate>
        <AdminShellContent
          sectionTitle={sectionTitle}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
        >
          {children}
        </AdminShellContent>
      </ClerkAdminGate>
    );
  }

  return (
    <AdminShellContent
      sectionTitle={sectionTitle}
      searchPlaceholder={searchPlaceholder}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
    >
      {children}
    </AdminShellContent>
  );
}

function ClerkAdminGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/admin/login");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#07101f] px-5 text-sm text-[#b7c0d5]">
        Шалгаж байна...
      </main>
    );
  }

  return <>{children}</>;
}

function AdminShellContent({
  children,
  sectionTitle = "Хэнц Хурга Admin",
  searchPlaceholder = "Хайх...",
  searchValue,
  onSearchChange,
}: {
  children: React.ReactNode;
  sectionTitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [internalSearch, setInternalSearch] = useState("");
  const [utilityPanel, setUtilityPanel] = useState<"notifications" | "settings" | "help" | "profile" | null>(null);
  const query = searchValue ?? internalSearch;
  const quickMatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return navItems;

    return navItems.filter((item) =>
      [item.label, item.href].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [query]);

  const updateSearch = (value: string) => {
    onSearchChange?.(value);
    if (!onSearchChange) {
      setInternalSearch(value);
    }
  };

  const runSearch = () => {
    const match = quickMatches[0];
    if (match && !onSearchChange) {
      router.push(match.href);
      setInternalSearch("");
    }
  };

  return (
    <main className="min-h-svh bg-[#07101f] text-[#e7ecff]">
      <div className="flex min-h-svh">
        <aside className="hidden w-72 shrink-0 border-r border-[#2b344d] bg-[#11192a] lg:flex lg:flex-col">
          <Link href="/admin" className="flex h-24 items-center gap-3 border-b border-[#263049] px-7">
            <BrandLogo className="size-11" withRing />
            <span className="leading-tight">
              <span className="block text-xl font-bold text-[#f4ad3e]">Хэнц Хурга</span>
              <span className="block text-xs uppercase tracking-[0.14em] text-[#d7dae7]">System Oversight</span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-4 text-sm text-[#c3cadb] transition-colors hover:bg-[#202a42] hover:text-white",
                    active && "bg-[#252e45] font-semibold text-white shadow-[inset_4px_0_0_#f0a93c]"
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-[#f0a93c]" : "text-[#d6c8b1]")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="m-4 flex items-center gap-3 rounded-lg border border-[#32405d] bg-[#17223a] p-3">
            <BrandLogo className="size-9 rounded-full" withRing />
            <div className="min-w-0 text-xs">
              <p className="truncate font-semibold text-white">Admin User</p>
              <p className="text-[#f0a93c]">Superadmin</p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-20 items-center gap-4 border-b border-[#25304a] bg-[#0d1627]/95 px-4 backdrop-blur md:px-8">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-[#f4ad3e] lg:hidden">
              <BrandLogo className="size-8" withRing />
              Хэнц Хурга
            </Link>
            <div className="hidden text-lg font-semibold text-[#f4ad3e] xl:block">{sectionTitle}</div>
            <div className="relative max-w-xl flex-1 xl:mx-auto">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#aab3c8]" />
              <input
                value={query}
                onChange={(event) => updateSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    runSearch();
                  }
                }}
                className="h-10 w-full rounded-lg border border-[#31405e] bg-[#172039] pl-11 pr-11 text-sm text-white outline-none transition focus:border-[#f0a93c]"
                placeholder={searchPlaceholder}
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Хайлт цэвэрлэх"
                  onClick={() => updateSearch("")}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[#aab3c8] hover:bg-[#26324d] hover:text-white"
                >
                  <X className="size-4" />
                </button>
              ) : null}
              {!onSearchChange && query ? (
                <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-lg border border-[#33415f] bg-[#121c31] shadow-2xl shadow-black/30">
                  {quickMatches.length > 0 ? (
                    quickMatches.slice(0, 6).map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => {
                            router.push(item.href);
                            setInternalSearch("");
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#dbe3f5] hover:bg-[#202b48]"
                        >
                          <Icon className="size-4 text-[#f0a93c]" />
                          <span>{item.label}</span>
                          <span className="ml-auto text-xs text-[#8995ad]">{item.href}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-[#9faabe]">Илэрц олдсонгүй</div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="relative flex shrink-0 items-center gap-1 md:gap-3">
              <IconButton label="Мэдэгдэл" active={utilityPanel === "notifications"} onClick={() => setUtilityPanel((panel) => panel === "notifications" ? null : "notifications")}>
                <Bell />
              </IconButton>
              <IconButton label="Тохиргоо" active={utilityPanel === "settings"} onClick={() => setUtilityPanel((panel) => panel === "settings" ? null : "settings")}>
                <Settings />
              </IconButton>
              <IconButton label="Тусламж" active={utilityPanel === "help"} onClick={() => setUtilityPanel((panel) => panel === "help" ? null : "help")}>
                <CircleHelp />
              </IconButton>
              <span className="hidden h-8 w-px bg-[#2e3851] md:block" />
              <button
                type="button"
                onClick={() => setUtilityPanel((panel) => panel === "profile" ? null : "profile")}
                className="hidden items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-[#202a42] md:flex"
              >
                <div className="text-right text-xs">
                  <p className="font-semibold text-white">Админ</p>
                  <p className="text-[#b3bdd2]">Хэнц Хурга Admin</p>
                </div>
                <BrandLogo className="size-10 rounded-full" withRing />
              </button>
              <UtilityPanel
                panel={utilityPanel}
                onClose={() => setUtilityPanel(null)}
                onNavigate={(href) => {
                  router.push(href);
                  setUtilityPanel(null);
                }}
                onSignOut={() => {
                  clearSession();
                  void window.Clerk?.signOut?.({ redirectUrl: "/admin/login" });
                  if (!window.Clerk?.signOut) {
                    router.push("/admin/login");
                  }
                  setUtilityPanel(null);
                }}
              />
            </div>
          </header>

          <div className="border-b border-[#25304a] bg-[#11192a] px-4 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[#283550] px-3 text-xs text-[#cbd3e6]",
                      active && "border-[#f0a93c] bg-[#f0a93c] text-[#11192a]"
                    )}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <section className="flex-1 px-4 py-8 md:px-8 lg:px-10">{children}</section>
        </div>
      </div>
    </main>
  );
}

function IconButton({
  label,
  children,
  onClick,
  active = false,
}: {
  label: string;
  children: React.ReactElement;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg text-[#d6c8b1] transition hover:bg-[#202a42] hover:text-white",
        active && "bg-[#26324d] text-[#f0a93c]",
      )}
    >
      {children}
    </button>
  );
}

function UtilityPanel({
  panel,
  onClose,
  onNavigate,
  onSignOut,
}: {
  panel: "notifications" | "settings" | "help" | "profile" | null;
  onClose: () => void;
  onNavigate: (href: string) => void;
  onSignOut: () => void;
}) {
  if (!panel) return null;

  const title = {
    notifications: "Мэдэгдэл",
    settings: "Шуурхай тохиргоо",
    help: "Тусламж",
    profile: "Админ хэрэглэгч",
  }[panel];

  return (
    <div className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[#33415f] bg-[#121c31] shadow-2xl shadow-black/35">
      <div className="flex items-center justify-between border-b border-[#283550] px-4 py-3">
        <p className="font-semibold text-white">{title}</p>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-[#9faabe] hover:bg-[#202b48] hover:text-white" aria-label="Хаах">
          <X className="size-4" />
        </button>
      </div>

      {panel === "notifications" ? (
        <div className="divide-y divide-[#283550]">
          {[
            ["3 offline gate байна", "Devices хэсэгт шалгана"],
            ["48 tag хүсэлт хүлээгдэж байна", "Tag inventory дээр шийднэ"],
            ["Гадаад байгууллагын хүсэлт ирсэн", "Approvals хэсэгт нээнэ"],
          ].map(([main, sub]) => (
            <button key={main} type="button" onClick={() => onNavigate(main.includes("gate") ? "/admin/devices" : main.includes("tag") ? "/admin/tags" : "/admin/registrations")} className="block w-full px-4 py-3 text-left hover:bg-[#202b48]">
              <span className="block text-sm font-semibold text-[#e7ecff]">{main}</span>
              <span className="mt-1 block text-xs text-[#9faabe]">{sub}</span>
            </button>
          ))}
        </div>
      ) : null}

      {panel === "settings" ? (
        <div className="grid gap-2 p-3">
          <button type="button" onClick={() => onNavigate("/admin/settings")} className="rounded-lg px-3 py-3 text-left text-sm hover:bg-[#202b48]">Tag тохиргоо нээх</button>
          <button type="button" onClick={() => onNavigate("/admin/users")} className="rounded-lg px-3 py-3 text-left text-sm hover:bg-[#202b48]">Хэрэглэгчийн эрх шалгах</button>
          <button type="button" onClick={() => onNavigate("/admin/tags")} className="rounded-lg px-3 py-3 text-left text-sm hover:bg-[#202b48]">Tag импорт хийх</button>
        </div>
      ) : null}

      {panel === "help" ? (
        <div className="space-y-3 p-4 text-sm leading-6 text-[#c6cfdf]">
          <p><span className="font-semibold text-white">Search:</span> нэр, утас, tag, төхөөрөмжийн ID бичээд тухайн page дээр шууд шүүнэ.</p>
          <p><span className="font-semibold text-white">Action:</span> live backend асаалттай үед block, approve, import, export шууд ажиллана.</p>
          <button type="button" onClick={() => onNavigate("/admin")} className="mt-2 rounded-lg border border-[#42506f] px-3 py-2 text-xs font-semibold text-[#e1e7f5] hover:bg-[#202b48]">Dashboard руу очих</button>
        </div>
      ) : null}

      {panel === "profile" ? (
        <div className="space-y-3 p-4">
          <div className="rounded-lg bg-[#1a243d] p-3 text-sm">
            <p className="font-semibold text-white">Admin User</p>
            <p className="text-xs text-[#f0a93c]">Superadmin</p>
          </div>
          <button type="button" onClick={onSignOut} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#42506f] px-3 py-2 text-sm font-semibold text-[#e1e7f5] hover:bg-[#202b48]">
            <LogOut className="size-4" />
            Гарах
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-normal text-[#e8edff] md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b5bed4]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-[#2c3855] bg-[#1a243d] shadow-lg shadow-black/10", className)}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-semibold text-[#e7ecff]">{title}</p>
      {description ? <p className="mt-2 text-sm text-[#9faabe]">{description}</p> : null}
    </div>
  );
}

export function StatTile({
  icon,
  label,
  value,
  meta,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "text-[#f0a93c] bg-[#f0a93c]/12",
    success: "text-[#43d3c5] bg-[#43d3c5]/12",
    warning: "text-[#f0a93c] bg-[#f0a93c]/12",
    danger: "text-[#ff9f9a] bg-[#ff9f9a]/12",
  };

  return (
    <Panel className="p-6">
      <div className="flex items-start justify-between gap-4">
        <span className={cn("flex size-10 items-center justify-center rounded-lg", tones[tone])}>{icon}</span>
        {meta ? <span className="rounded-md bg-[#26324d] px-2 py-1 text-xs font-semibold text-[#49d8c9]">{meta}</span> : null}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase leading-5 text-[#d9c7ae]">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#e9eeff]">{value}</p>
    </Panel>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  const tones: Record<string, string> = {
    success: "border-[#15b8ae]/40 bg-[#123b46] text-[#58e0d4]",
    warning: "border-[#f0a93c]/45 bg-[#3a2f24] text-[#f0a93c]",
    danger: "border-[#ff9f9a]/45 bg-[#3a2733] text-[#ffaaa5]",
    muted: "border-[#46516b] bg-[#202942] text-[#8f98af]",
    neutral: "border-[#3a4663] bg-[#222d49] text-[#dbe2f7]",
  };

  return (
    <span className={cn("inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold", tones[tone] ?? tones.neutral)}>
      {children}
    </span>
  );
}

export function AdminButton({
  children,
  variant = "primary",
  className,
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "danger";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "border-[#f0a93c] bg-[#f0a93c] text-[#11192a] hover:bg-[#ffb84f]",
    outline: "border-[#42506f] bg-transparent text-[#dfe5f7] hover:bg-[#232e49]",
    danger: "border-[#ff9f9a]/55 bg-transparent text-[#ffaaa5] hover:bg-[#3a2733]",
  };

  return (
    <button
      type="button"
      className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition", variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function ExportButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <AdminButton variant="outline" {...props}>
      <Download className="size-4" />
      Export CSV
    </AdminButton>
  );
}

export function FilterButton({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("inline-flex h-9 items-center gap-2 rounded-lg border border-[#344260] bg-[#10182a] px-3 text-xs font-semibold text-[#dce3f5] transition hover:bg-[#202b48]", className)}
      {...props}
    >
      {children}
      <SlidersHorizontal className="size-3.5 text-[#d6c8b1]" />
    </button>
  );
}
