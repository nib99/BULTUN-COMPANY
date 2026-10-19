import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, ExternalLink, Phone } from "lucide-react";
import { ListingActions } from "@/components/dalala/listing-actions";
import { DalalaAiButton } from "@/components/dalala/contact-ai";
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
        <div className="grid gap-3 sm:grid-cols-2">
          {(listing.media.length ? listing.media : [{ id: "cover", kind: "image" as const, url: listing.image, sortOrder: 0 }]).map((media) =>
            media.kind === "video" ? (
              <video key={media.id} src={media.url} controls playsInline preload="metadata" className="media-frame w-full rounded-card bg-black object-cover sm:col-span-2" />
            ) : (
              <img key={media.id} src={media.url} alt={listing.title} width={1400} height={933} className="media-frame h-full w-full rounded-card bg-ivory-2 object-cover" />
            ),
          )}
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
          <div className="mt-1 flex items-center gap-2">
            {listing.seller.logoUrl ? <img src={listing.seller.logoUrl} alt="" className="size-9 rounded-xl bg-white object-cover" /> : null}
            <Link to="/$locale/seller/$sellerId" params={{ locale, sellerId: listing.seller.userId }} className="font-display text-2xl text-ivory hover:underline">{listing.seller.displayName}</Link>
            {listing.seller.verified ? <span title="Verified seller"><BadgeCheck className="size-5 text-[#FFD33D]" /></span> : null}
          </div>
          <p className="text-sm text-gold">
            {listing.seller.isDemo ? copy.listing.sample : listing.seller.verified ? "Verified seller" : copy.listing.member} · {cityName(locale, listing.seller.city)}
          </p>
          {listing.seller.bio ? <p className="mt-3 text-sm leading-6 text-ivory/75">{listing.seller.bio}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {listing.seller.phone ? <a href={`tel:${listing.seller.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold"><Phone className="size-3.5" /> {listing.seller.phone}</a> : null}
            {listing.seller.website ? <a href={listing.seller.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold"><ExternalLink className="size-3.5" /> Website</a> : null}
          </div>
        </div>
        <div className="rounded-2xl border border-[#b7d8ff] bg-[#eef7ff] p-4">
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#0b5cab]">BULTUM COMPANY</p>
          <p className="mt-1 text-sm font-semibold text-ink">Contact the company owner directly to ask about this vehicle or machine.</p>
        </div>
        <ListingActions locale={locale} listingId={listing.id} title={listing.title} isDemo={listing.isDemo} sellerWhatsApp={listing.seller.whatsapp} sellerPhone={listing.seller.phone} />
        <DalalaAiButton
          locale={locale}
          listing={{
            id: listing.id,
            title: listing.title,
            category: listing.category,
            make: listing.make,
            model: listing.model,
            year: listing.year,
            condition: listing.condition,
            city: listing.city,
            price: `${listing.priceSantim / 100} ETB`,
            mileageKm: listing.mileageKm,
            hours: listing.hours,
            summary: listing.summary,
            imageUrl: listing.image.startsWith("https://") ? listing.image : undefined,
          }}
        />
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
