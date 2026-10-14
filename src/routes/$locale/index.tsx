import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Building2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { dict, isLocale } from "@/lib/i18n";
import { getYard } from "@/lib/marketplace/api";
import { CATEGORIES } from "@/lib/marketplace/status";
import { btnGhost, btnPrimary } from "@/components/dalala/chrome";
import { ListingCardView } from "@/components/dalala/listing-card";

const PHOTOS = { cars: "/media/land-cruiser.jpg", trucks: "/media/truck.jpg", machinery: "/media/excavator.jpg", agriculture: "/media/tractor.jpg" } as const;

export const Route = createFileRoute("/$locale/")({
  loader: ({ params }) => getYard({ data: params.locale }),
  head: ({ params }) => {
    const locale = isLocale(params.locale) ? params.locale : "en";
    const copy = dict(locale);
    const description = locale === "am" ? "በኢትዮጵያ መኪናዎችን፣ የጭነት መኪናዎችን እና ማሽኖችን ያግኙ።" : locale === "om" ? "Itoophiyaa keessatti konkolaataa fi maashinoota amanamoo barbaadi." : "Buy and sell cars, trucks and machinery across Ethiopia.";
    return { meta: [{ title: `${copy.brand.name} — ${copy.brand.motors}` }, { name: "description", content: description }, { property: "og:title", content: `${copy.brand.name} — ${copy.brand.motors}` }, { property: "og:description", content: description }, { property: "og:image", content: "/og.jpg" }] };
  },
  component: Home,
});

function Home() {
  const { locale } = Route.useParams();
  const yard = Route.useLoaderData();
  const copy = dict(locale);
  return (
    <main>
      <section className="relative overflow-hidden bg-ink text-ivory">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-6 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:py-12">
          <div className="order-2 lg:order-1">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ivory/15 bg-ivory/5 px-3 py-1.5 text-xs font-bold text-gold"><Sparkles className="size-3.5" /> Ethiopia's motors marketplace</div>
            <h1 className="max-w-2xl font-display text-4xl leading-[1.02] sm:text-6xl">{copy.home.title}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ivory/70 sm:text-lg">{copy.home.lede}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/$locale/search" params={{ locale }} className={btnPrimary}>{copy.home.browse}<ArrowRight className="ml-2 size-4" /></Link>
              <Link to="/$locale/sell" params={{ locale }} className="inline-flex min-h-11 items-center justify-center rounded-full border border-ivory/20 bg-ivory/5 px-5 text-sm font-semibold text-ivory hover:bg-ivory/10">{copy.home.sell}</Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-2 text-xs sm:max-w-md">
              {[{icon: ShieldCheck, text: copy.home.trustModeration}, {icon: BadgeCheck, text: copy.home.trustBirr}, {icon: Building2, text: copy.home.trustLang}].map(({icon: Icon, text}) => <div key={text} className="rounded-2xl border border-ivory/10 bg-ivory/5 p-3"><Icon className="mb-2 size-4 text-gold" /><span className="text-ivory/70">{text}</span></div>)}
            </div>
          </div>
          <div className="order-1 overflow-hidden rounded-[1.75rem] border border-ivory/10 bg-panel shadow-2xl lg:order-2">
            <div className="relative aspect-[4/3]"><img src="/media/hero.jpg" alt={copy.home.heroAlt} width={1600} height={900} className="h-full w-full object-cover" /><div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-ink/85 p-4 backdrop-blur"><p className="text-xs font-bold uppercase tracking-[.18em] text-gold">{copy.home.kicker}</p><p className="mt-1 font-display text-2xl">Cars · Trucks · Machinery</p></div></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-5 px-4 py-9">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-gold-2">Browse</p><h2 className="mt-1 font-display text-3xl sm:text-4xl">{copy.home.categories}</h2></div><Link to="/$locale/search" params={{ locale }} className="hidden items-center gap-1 text-sm font-bold text-emerald sm:flex">{copy.home.browse}<ArrowRight className="size-4" /></Link></div>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CATEGORIES.map((category) => <li key={category}><Link to="/$locale/c/$category" params={{ locale, category }} className="group block overflow-hidden rounded-[1.25rem] border border-line-soft bg-card shadow-sm"><div className="media-frame overflow-hidden"><img src={PHOTOS[category]} alt={copy.cat[category]} width={1400} height={933} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /></div><div className="p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-display text-xl">{copy.cat[category]}</h3><ArrowRight className="mt-1 size-4 text-muted transition group-hover:translate-x-1 group-hover:text-emerald" /></div><p className="mt-1 text-sm text-muted">{copy.cat[`${category}Blurb`]}</p><p className="mt-3 text-xs font-bold text-emerald">{yard.counts[category]} {copy.home.featured}</p></div></Link></li>)}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl space-y-5 px-4 pb-12">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-gold-2">Latest listings</p><h2 className="mt-1 font-display text-3xl sm:text-4xl">{copy.home.featured}</h2></div><Link to="/$locale/search" params={{ locale }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-soft bg-card px-4 text-sm font-bold"> <Search className="size-4" /> {copy.nav.search}</Link></div>
        {yard.sample ? <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold-2">{copy.home.demo}</p> : null}
        {yard.items.length === 0 ? <p className="rounded-card border border-dashed border-line-soft p-8 text-center text-muted">{copy.home.empty}</p> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{yard.items.map((item) => <li key={item.id}><ListingCardView item={item} locale={locale} /></li>)}</ul>}
      </section>
    </main>
  );
}
