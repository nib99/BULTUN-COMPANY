import { createFileRoute } from "@tanstack/react-router";
import { SellDesk } from "@/components/dalala/sell-form";
import { dict } from "@/lib/i18n";

export const Route = createFileRoute("/$locale/sell")({
  component: SellPage,
});

function SellPage() {
  const { locale } = Route.useParams();
  const copy = dict(locale);
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <p className="text-xs font-semibold tracking-widest text-gold-2">{copy.nav.sell}</p>
      <h1 className="font-display text-4xl">{copy.sell.title}</h1>
      <p className="text-muted">{copy.sell.lede}</p>
      <SellDesk locale={locale} />
    </main>
  );
}
