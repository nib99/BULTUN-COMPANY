import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bell, Building2, CarFront, ChevronRight, CircleUserRound, Search, ShieldCheck, Sparkles, Tractor, Truck } from "lucide-react";
import { dict, isLocale } from "@/lib/i18n";
import { getYard } from "@/lib/marketplace/api";
import { CATEGORIES } from "@/lib/marketplace/status";
import { btnPrimary } from "@/components/bultum/chrome";
import { ListingCardView } from "@/components/bultum/listing-card";
import { Mark } from "@/components/bultum/chrome";

const PHOTOS = { cars: "/media/land-cruiser.jpg", trucks: "/media/truck.jpg", machinery: "/media/excavator.jpg", agriculture: "/media/tractor.jpg" } as const;
const CATEGORY_ICONS = { cars: CarFront, trucks: Truck, machinery: Building2, agriculture: Tractor } as const;

export const Route = createFileRoute("/$locale/")({
  loader: ({ params }) => getYard({ data: params.locale }),
  head: ({ params }) => {
    const locale = isLocale(params.locale) ? params.locale : "en";
    const copy = dict(locale);
    const description = locale === "am" ? "በኢትዮጵያ መኪናዎችን፣ የጭነት መኪናዎችን እና ማሽነሪዎችን ያግኙ።" : locale === "om" ? "Itoophiyaa keessatti konkolaataa, tiraakii fi maashinoota barbaadi." : "Buy and sell cars, trucks and machinery across Ethiopia with BULTUM COMPANY.";
    return { meta: [{ title: `${copy.brand.name} — ${copy.brand.motors}` }, { name: "description", content: description }, { property: "og:title", content: `${copy.brand.name} — ${copy.brand.motors}` }, { property: "og:description", content: description }, { property: "og:image", content: "/og.jpg" }] };
  },
  component: Home,
});

function Home() {
  const { locale } = Route.useParams();
  const yard = Route.useLoaderData();
  const copy = dict(locale);
  return (
    <main className="bg-[#f5f7fb] pb-24">
      <section className="relative overflow-hidden bg-[#061A33] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(243,183,0,.28),transparent_34%),linear-gradient(180deg,rgba(6,26,51,.12),rgba(6,26,51,.94))]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-4 safe-top sm:pb-12">
          <header className="flex items-center gap-3">
            <Link to="/$locale" params={{ locale }} className="flex min-h-12 items-center gap-3">
              <span className="rounded-2xl bg-white p-1 shadow-lg"><Mark className="size-12" /></span>
              <span className="leading-none"><strong className="block text-lg font-black tracking-tight">BULTUM COMPANY</strong><span className="mt-1 block text-xs font-bold text-white/70">Cars & Machinery</span></span>
            </Link>
            <Link to="/$locale/account" params={{ locale }} aria-label={copy.nav.account} className="ml-auto grid size-11 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur"><CircleUserRound className="size-5" /></Link>
            <button type="button" aria-label="Notifications" className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/10"><Bell className="size-5" /></button>
          </header>

          <div className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-black/10 shadow-2xl">
            <img src="/media/hero.jpg" alt={copy.home.heroAlt} width={1600} height={900} className="absolute inset-0 h-full w-full object-cover opacity-55" />
            <div className="relative min-h-[330px] p-5 sm:min-h-[390px] sm:p-9">
              <div className="absolute inset-0 bg-gradient-to-t from-[#061A33] via-[#061A33]/25 to-transparent" />
              <div className="relative flex min-h-[290px] flex-col justify-end sm:min-h-[350px]">
                <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#ffd83d]/30 bg-[#ffd83d]/10 px-3 py-1.5 text-xs font-black text-[#ffd83d]"><Sparkles className="size-3.5" /> Ethiopia's motors marketplace</div>
                <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Find the right car or machine for your business.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">Cars, trucks, heavy equipment and agricultural machinery from sellers across Ethiopia.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 -mt-7 rounded-2xl bg-white p-2 shadow-2xl sm:-mt-8 sm:p-2.5">
            <Link to="/$locale/search" params={{ locale }} className="flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 px-4 text-left text-slate-400">
              <Search className="size-5 text-[#0b5cab]" /><span className="flex-1 text-sm font-semibold">Search cars, trucks, machinery...</span><span className="grid size-10 place-items-center rounded-xl bg-[#0b5cab] text-white"><ChevronRight className="size-5" /></span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-5">
        <Link to="/$locale/sell" params={{ locale }} className="flex min-h-16 items-center gap-4 rounded-2xl bg-[#f3b700] px-5 text-[#061A33] shadow-lg shadow-yellow-900/10 transition hover:-translate-y-0.5">
          <span className="grid size-11 place-items-center rounded-xl bg-white/30 text-xl font-black">+</span>
          <span className="flex-1"><strong className="block text-lg font-black">Buy / Sell</strong><span className="text-xs font-bold text-[#061A33]/65">List your vehicle or machinery</span></span><ArrowRight className="size-6" />
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#0b5cab]">Browse</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{copy.home.categories}</h2></div><Link to="/$locale/search" params={{ locale }} className="text-sm font-black text-[#0b5cab]">View all</Link></div>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CATEGORIES.map((category) => { const Icon = CATEGORY_ICONS[category]; return <li key={category}><Link to="/$locale/c/$category" params={{ locale, category }} className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="aspect-[1.22/1] overflow-hidden"><img src={PHOTOS[category]} alt={copy.cat[category]} width={900} height={700} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" /><div className="absolute bottom-0 left-0 right-0 p-3 text-white"><span className="mb-1 grid size-9 place-items-center rounded-full border border-white/25 bg-black/20 backdrop-blur"><Icon className="size-5" /></span><h3 className="text-base font-black leading-tight">{copy.cat[category]}</h3></div></div></Link></li> })}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#0b5cab]">Featured inventory</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{copy.home.featured}</h2></div><Link to="/$locale/search" params={{ locale }} className="text-sm font-black text-[#0b5cab]">{copy.nav.search}</Link></div>
        {yard.sample ? <p className="mb-4 flex items-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800"><ShieldCheck className="size-4" /> {copy.home.demo}</p> : null}
        {yard.items.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-muted">{copy.home.empty}</p> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{yard.items.map((item) => <li key={item.id}><ListingCardView item={item} locale={locale} /></li>)}</ul>}
      </section>
    </main>
  );
}
