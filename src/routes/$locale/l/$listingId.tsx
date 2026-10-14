import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ListingActions } from "@/components/dalala/listing-actions";
import { cityName, PriceTag } from "@/components/dalala/chrome";
import { dict } from "@/lib/i18n";
import { getListing } from "@/lib/marketplace/api";

export const Route = createFileRoute("/$locale/l/$listingId")({
  loader: async ({ params }) => {
    const listing = await getListing({ data: { id: params.listingId, locale: params.locale } });
    if (!listing) throw notFound();
    return listing;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.title} — BULTUM COMPANY` }, { name: "description", content: loaderData.summary }] : [],
  }),
  notFoundComponent: Missing,
  component: Detail,
});

function Missing() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl">BULTUM COMPANY</h1>
      <p className="mt-3 text-muted">This listing is not available.</p>
    </main>
  );
}

function Detail() {
  const { locale } = Route.useParams();
  const listing = Route.useLoaderData();
  const copy = dict(locale);
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-4">
        <div className="media-frame overflow-hidden rounded-card bg-ivory-2">
          <img src={listing.image} alt={listing.title} width={1400} height={933} className="h-full w-full object-cover" />
        </div>
        <p className="text-xs font-semibold tracking-widest text-gold-2">{copy.cat[listing.category]}</p>
        <h1 className="font-display text-4xl">{listing.title}</h1>
        {listing.status === "sold" ? <p className="text-sm font-semibold text-danger">{copy.listing.soldBanner}</p> : null}
        <p className="text-muted">{listing.summary}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Spec label={copy.listing.year} value={listing.year ? String(listing.year) : "—"} />
          <Spec label={copy.listing.condition} value={copy.cond[listing.condition]} />
          <Spec label={copy.listing.city} value={cityName(locale, listing.city)} />
          {listing.mileageKm !== null ? <Spec label={copy.listing.mileage} value={`${listing.mileageKm.toLocaleString()} ${copy.listing.km}`} /> : null}
          {listing.hours !== null ? <Spec label={copy.listing.hours} value={listing.hours.toLocaleString()} /> : null}
        </dl>
      </div>
      <aside className="space-y-4">
        <div className="rounded-card bg-ink p-5 text-ivory">
          <PriceTag santim={listing.priceSantim} locale={locale} featured={listing.featured} onDark />
          <p className="mt-4 text-xs font-semibold tracking-widest text-gold">{copy.listing.seller}</p>
          <p className="mt-1 font-display text-2xl text-ivory">{listing.seller.displayName}</p>
          <p className="text-sm text-gold">
            {listing.seller.isDemo ? copy.listing.sample : copy.listing.member} · {cityName(locale, listing.seller.city)}
          </p>
        </div>
        <ListingActions locale={locale} listingId={listing.id} title={listing.title} isDemo={listing.isDemo} />
        <Link to="/$locale/c/$category" params={{ locale, category: listing.category }} className="text-sm font-semibold text-emerald">
          {copy.common.back}
        </Link>
      </aside>
    </main>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line-soft bg-card p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
