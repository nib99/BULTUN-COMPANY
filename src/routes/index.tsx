import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mark } from "@/components/dalala/chrome";
import { dict, isLocale, LOCALE_STORAGE_KEY, rememberLocale, type Locale } from "@/lib/i18n";

export const Route = createFileRoute("/")({ component: Door });

function Door() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const copy = dict("en");

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved)) {
      void navigate({ to: "/$locale", params: { locale: saved }, replace: true });
      return;
    }
    setReady(true);
  }, [navigate]);

  return (
    <main className="min-h-screen bg-ivory">
      <section className="bg-ink px-5 pb-10 pt-16 text-ivory safe-top">
        <span className="inline-flex rounded-2xl bg-ivory p-1">
          <Mark className="size-14" />
        </span>
        <p className="mt-8 text-xs font-semibold tracking-widest text-gold">{copy.door.kicker}</p>
        <h1 className="mt-3 max-w-sm font-display text-5xl text-ivory">{copy.brand.name}</h1>
        <p className="mt-2 text-sm text-gold">{copy.brand.motors}</p>
      </section>
      <section className="mx-auto max-w-lg space-y-4 px-5 py-8">
        <h2 className="font-display text-3xl">{ready ? copy.door.title : copy.common.loading}</h2>
        <p className="text-muted">{copy.door.lede}</p>
        <ul className="space-y-3">
          {(["en", "om", "am", "so"] as const).map((locale) => (
            <li key={locale}>
              <button
                type="button"
                className="flex min-h-16 w-full items-center justify-between rounded-card border border-line-soft bg-card px-4 text-left"
                onClick={() => choose(locale, navigate)}
              >
                <span className="font-display text-2xl">{copy.lang[locale]}</span>
                <span className="text-sm font-semibold text-emerald">{copy.door.enter}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function choose(locale: Locale, navigate: ReturnType<typeof useNavigate>) {
  rememberLocale(locale);
  void navigate({ to: "/$locale", params: { locale } });
}
