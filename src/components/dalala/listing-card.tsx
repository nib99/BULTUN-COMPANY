import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BadgeCheck, MapPin } from "lucide-react";
import { dict, type Locale } from "@/lib/i18n";
import type { ListingCard } from "@/lib/marketplace/api";
import { cityName, PriceTag } from "./chrome";

export function ListingCardView({ item, locale }: { item: ListingCard; locale: Locale }) {
  const copy = dict(locale);
  return (
    <article className="group overflow-hidden rounded-[1.25rem] border border-line-soft bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Link to="/$locale/l/$listingId" params={{ locale, listingId: item.id }} className="block">
        <div className="media-frame relative overflow-hidden bg-ivory-2">
          <img src={item.image} alt={item.title} width={1400} height={933} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2"><span className="rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-bold text-ivory backdrop-blur">{copy.cat[item.category]}</span>{item.featured ? <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold text-ink">{copy.common.featured}</span> : null}</div>
        </div>
        <div className="space-y-2 p-4">
          <p className="text-xs font-semibold text-muted">{copy.cond[item.condition]} · {item.year ?? "—"}</p>
          <div className="flex items-start justify-between gap-3"><h3 className="line-clamp-2 font-display text-xl text-ink">{item.title}</h3><ArrowUpRight className="mt-1 size-4 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald" /></div>
          <PriceTag santim={item.priceSantim} locale={locale} featured={false} />
          <p className="flex items-center gap-1 text-sm text-muted"><MapPin className="size-3.5" />{cityName(locale, item.city)}{item.mileageKm !== null ? ` · ${item.mileageKm.toLocaleString()} km` : item.hours !== null ? ` · ${item.hours.toLocaleString()} h` : ""}</p>
          <p className="flex items-center gap-1 text-xs font-bold text-muted">{item.sellerName}{item.sellerVerified ? <BadgeCheck className="size-3.5 text-[#0b5cab]" /> : null}</p>
        </div>
      </Link>
    </article>
  );
}
