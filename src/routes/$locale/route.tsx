import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { BottomNav, TopBar } from "@/components/bultum/chrome";
import { TelegramBridge } from "@/components/bultum/telegram";
import { dict, isLocale } from "@/lib/i18n";

export const Route = createFileRoute("/$locale")({
  beforeLoad: ({ params }) => {
    if (!isLocale(params.locale)) throw notFound();
  },
  component: LocaleShell,
});

function LocaleShell() {
  const { locale } = Route.useParams();
  const copy = dict(locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <div className="min-h-screen bg-ivory pb-24 md:pb-10">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:bg-card focus:px-3 focus:py-2">
        {copy.common.back}
      </a>
      <TopBar locale={locale} />
      <div id="content">
        <Outlet />
      </div>
      <BottomNav locale={locale} />
      <TelegramBridge locale={locale} />
    </div>
  );
}
