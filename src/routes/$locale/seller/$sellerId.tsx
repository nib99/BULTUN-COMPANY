import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, Globe, Phone, MessageCircle } from "lucide-react";
import { getSellerProfile } from "@/lib/marketplace/api";
import { dict } from "@/lib/i18n";
import { cityName } from "@/components/bultum/chrome";
import { ListingCardView } from "@/components/bultum/listing-card";

export const Route = createFileRoute("/$locale/seller/$sellerId")({
  loader: async ({ params }) => {
    const profile = await getSellerProfile({ data: { locale: params.locale, userId: params.sellerId } });
    if (!profile) throw notFound();
    return profile;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.profile.displayName} — BULTUM COMPANY` },
      { name: "description", content: loaderData.profile.bio || `${loaderData.profile.displayName} on BULTUM COMPANY` },
    ] : [],
  }),
  component: SellerPage,
});

function SellerPage() {
  const { locale } = Route.useParams();
  const { profile, items } = Route.useLoaderData();
  const copy = dict(locale);
  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-6">
      <section className="overflow-hidden rounded-[2rem] bg-[#061A33] p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {profile.logoUrl ? <img src={profile.logoUrl} alt="" className="size-24 rounded-3xl bg-white object-cover" /> : <img src="/icons/bultum-icon-192.png" alt="BULTUM COMPANY" className="size-24 rounded-3xl" />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-4xl text-white">{profile.displayName}</h1>{profile.verified ? <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD33D] px-3 py-1 text-xs font-black text-[#061A33]"><BadgeCheck className="size-4" /> Verified</span> : null}</div>
            <p className="mt-1 text-sm font-bold text-[#FFD33D]">{profile.kind === "dealer" ? "Company / Dealer" : "Seller"} · {cityName(locale, profile.city)}</p>
            {profile.bio ? <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{profile.bio}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.phone ? <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold"><Phone className="size-3.5" /> Call</a> : null}
              {profile.whatsapp ? <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-3 py-2 text-xs font-black text-white"><MessageCircle className="size-3.5" /> WhatsApp</a> : null}
              {profile.website ? <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold"><Globe className="size-3.5" /> Website</a> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#0b5cab]">{copy.brand.name}</p><h2 className="mt-1 font-display text-3xl">{profile.displayName} inventory</h2></div>
        {items.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <ListingCardView key={item.id} item={item} locale={locale} />)}</div> : <p className="rounded-2xl border border-dashed border-line-soft p-8 text-center text-muted">No public listings yet.</p>}
      </section>
      <Link to="/$locale" params={{ locale }} className="inline-flex text-sm font-bold text-emerald">← Back to BULTUM COMPANY</Link>
    </main>
  );
}
