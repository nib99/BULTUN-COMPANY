import { Link, useRouterState } from "@tanstack/react-router";
import { Bookmark, CircleUser, House, Plus, Search } from "lucide-react";
import { dict, rememberLocale, type Locale } from "@/lib/i18n";
import { formatEtb } from "@/lib/marketplace/money";

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-emerald px-5 text-sm font-semibold text-ivory transition-colors hover:bg-emerald-2";
export const btnGhost =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-line-soft bg-card px-5 text-sm font-semibold text-ink transition-colors hover:border-gold";

export function Mark({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="BULTUM COMPANY logo">
      <defs>
        <linearGradient id="bultumGold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#FFD83D" />
          <stop offset="1" stopColor="#F0A900" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="92" height="92" rx="26" fill="#061A33" />
      <circle cx="48" cy="46" r="35" fill="none" stroke="url(#bultumGold)" strokeWidth="6" strokeDasharray="7 5" />
      <path d="M30 25h17c11 0 18 7 18 18s-7 18-18 18h-8v10H30V25Zm9 9v18h7c5.5 0 9-3.1 9-9s-3.5-9-9-9h-7Z" fill="white" />
      <path d="m49 62 12-16 6 5-12 17-9 2 3-8Z" fill="url(#bultumGold)" />
      <path d="M59 49 69 38l7 2-11 14-6-5Z" fill="#FFD83D" />
      <path d="m69 38 9 2 7-6-4-5-10 4-2 5Z" fill="#F0A900" />
      <path d="M63 54h12l7 6-2 6H59l4-12Z" fill="#F0A900" />
      <circle cx="65" cy="69" r="5" fill="#061A33" stroke="#FFD83D" strokeWidth="3" />
      <circle cx="78" cy="69" r="5" fill="#061A33" stroke="#FFD83D" strokeWidth="3" />
    </svg>
  );
}

const CODES: Record<Locale, string> = { en: "EN", om: "OM", am: "AM", so: "SO" };

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const copy = dict(locale);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const suffix = path.startsWith(`/${locale}`) ? path.slice(locale.length + 1) : "";
  return (
    <div className="flex rounded-full border border-line-soft bg-card p-1" role="group" aria-label={copy.account.language}>
      {(["en", "om", "am"] as const).map((code) => {
        const active = code === locale;
        return (
          <a
            key={code}
            href={`/${code}${suffix}${search}`}
            aria-label={copy.lang[code]}
            aria-current={active ? "true" : undefined}
            onClick={() => rememberLocale(code)}
            className={
              active
                ? "grid min-h-11 min-w-11 place-items-center rounded-full bg-ink px-2 text-xs font-semibold text-ivory"
                : "grid min-h-11 min-w-11 place-items-center rounded-full px-2 text-xs font-semibold text-muted"
            }
          >
            {CODES[code]}
          </a>
        );
      })}
    </div>
  );
}

export function TopBar({ locale }: { locale: Locale }) {
  const copy = dict(locale);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const items = navItems(locale, copy);
  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-ivory safe-top">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/$locale" params={{ locale }} className="flex min-h-11 items-center gap-2">
          <Mark className="size-9" />
          <span className="leading-none">
            <span className="block text-base font-black tracking-tight text-ink">BULTUM COMPANY</span>
            <span className="block text-[11px] font-bold text-muted">Cars & Machinery</span>
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label={copy.brand.name}>
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              params={{ locale }}
              aria-current={item.active(path) ? "page" : undefined}
              className={
                item.active(path)
                  ? "rounded-full bg-ink px-3 py-2 text-sm font-semibold text-ivory"
                  : "rounded-full px-3 py-2 text-sm font-semibold text-ink"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto md:ml-3">
          <LanguageSwitch locale={locale} />
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ locale }: { locale: Locale }) {
  const copy = dict(locale);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const items = [
    { to: "/$locale" as const, label: copy.nav.home, icon: House, active: (p: string) => p === `/${locale}` },
    { to: "/$locale/search" as const, label: copy.nav.search, icon: Search, active: (p: string) => p.includes("/search") || p.includes("/c/") },
    { to: "/$locale/sell" as const, label: copy.nav.sell, icon: Plus, active: (p: string) => p.endsWith("/sell") },
    { to: "/$locale/saved" as const, label: copy.nav.saved, icon: Bookmark, active: (p: string) => p.endsWith("/saved") },
    { to: "/$locale/account" as const, label: copy.nav.account, icon: CircleUser, active: (p: string) => p.endsWith("/account") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line-soft bg-ivory safe-bottom md:hidden" aria-label={copy.brand.name}>
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const on = item.active(path);
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                params={{ locale }}
                aria-current={on ? "page" : undefined}
                className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold"
              >
                <Icon className={on ? "size-5 text-emerald" : "size-5 text-ink"} strokeWidth={1.75} aria-hidden="true" />
                <span className={on ? "text-emerald" : "text-muted"}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function navItems(locale: Locale, copy: ReturnType<typeof dict>) {
  return [
    { to: "/$locale" as const, label: copy.nav.home, active: (p: string) => p === `/${locale}` },
    { to: "/$locale/search" as const, label: copy.nav.search, active: (p: string) => p.includes("/search") || p.includes("/c/") },
    { to: "/$locale/sell" as const, label: copy.nav.sell, active: (p: string) => p.endsWith("/sell") },
    { to: "/$locale/saved" as const, label: copy.nav.saved, active: (p: string) => p.endsWith("/saved") },
    { to: "/$locale/account" as const, label: copy.nav.account, active: (p: string) => p.endsWith("/account") },
  ];
}

export function PriceTag({
  santim,
  locale,
  featured,
  onDark = false,
}: {
  santim: number;
  locale: Locale;
  featured?: boolean;
  onDark?: boolean;
}) {
  const copy = dict(locale);
  return (
    <p className="flex flex-wrap items-baseline gap-2">
      <span className={onDark ? "font-display text-3xl tabular-nums text-ivory" : "font-display text-2xl tabular-nums text-ink"}>
        {formatEtb(santim, locale)}
      </span>
      <span className={onDark ? "text-xs font-semibold tracking-wide text-gold" : "text-xs font-semibold tracking-wide text-gold-2"}>{copy.common.etb}</span>
      {featured ? <span className={onDark ? "text-xs font-semibold text-gold" : "text-xs font-semibold text-emerald"}>{copy.common.featured}</span> : null}
    </p>
  );
}

export function cityName(locale: Locale, city: string) {
  const copy = dict(locale);
  if (city in copy.city) return copy.city[city as keyof typeof copy.city];
  return city;
}
