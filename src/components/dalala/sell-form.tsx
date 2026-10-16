import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PlusCircle, ShieldCheck } from "lucide-react";
import { dict, type Locale } from "@/lib/i18n";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { CATEGORIES, CITIES } from "@/lib/marketplace/status";
import { attachListingMedia, createDraft, listMine, setListingStatus, type ListingCard } from "@/lib/marketplace/api";
import { btnGhost, btnPrimary, cityName, PriceTag } from "./chrome";
import { MediaUploader, type UploadedMedia } from "./media-uploader";

export function SellDesk({ locale }: { locale: Locale }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="rounded-card border border-line-soft bg-card p-6 text-muted">Loading seller workspace…</div>;
  if (!user) return <RedirectToSignIn />;
  return <SellBody locale={locale} />;
}

function SellBody({ locale }: { locale: Locale }) {
  const copy = dict(locale);
  const [items, setItems] = useState<ListingCard[] | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("cars");
  const [tick, setTick] = useState(0);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const heavy = category === "machinery" || category === "agriculture";

  useEffect(() => {
    let live = true;
    listMine({ data: locale })
      .then((result) => live && setItems(result.items))
      .catch(() => live && setItems([]));
    return () => { live = false; };
  }, [locale, tick]);

  const refresh = () => setTick((value) => value + 1);

  async function submit(form: HTMLFormElement, review: boolean) {
    setPending(true);
    setNote("");
    const fd = new FormData(form);
    const year = Number(fd.get("year"));
    const mileage = String(fd.get("mileageKm") ?? "").trim();
    const hours = String(fd.get("hours") ?? "").trim();
    try {
      const created = await createDraft({
        data: {
          locale,
          category,
          condition: String(fd.get("condition")) === "new" ? "new" : "used",
          make: String(fd.get("make") ?? ""),
          model: String(fd.get("model") ?? ""),
          year,
          city: String(fd.get("city") ?? "addis") as (typeof CITIES)[number],
          priceBirr: String(fd.get("priceBirr") ?? ""),
          title: String(fd.get("title") ?? ""),
          summary: String(fd.get("summary") ?? ""),
          displayName: String(fd.get("displayName") ?? ""),
          mileageKm: heavy ? null : mileage ? Number(mileage) : null,
          hours: heavy ? (hours ? Number(hours) : null) : null,
        },
      });
      if (media.length) await attachListingMedia({ data: { listingId: created.id, media } });
      if (review) await setListingStatus({ data: { id: created.id, to: "pending" } });
      form.reset();
      setMedia([]);
      setNote(review ? copy.sell.submitted : copy.sell.saved);
      refresh();
    } catch (error) {
      setNote(error instanceof Error && error.message === "required" ? copy.common.required : copy.common.error);
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(id: string, to: "pending" | "paused" | "sold" | "archived") {
    setPending(true);
    try {
      await setListingStatus({ data: { id, to } });
      refresh();
    } catch {
      setNote(copy.common.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[1.75rem] bg-ink p-5 text-ivory shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold text-ink"><ShieldCheck className="size-5" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Seller studio</p>
            <h2 className="mt-1 font-display text-2xl">Create once. Review before public.</h2>
            <p className="mt-2 text-sm text-ivory/70">Add clear vehicle details, price in ETB and a buyer-friendly description. Publishing remains moderated.</p>
          </div>
        </div>
      </section>

      <form className="space-y-5 rounded-[1.5rem] border border-line-soft bg-card p-4 shadow-sm sm:p-6" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget, true); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field"><span>{copy.sell.name}</span><input name="displayName" required minLength={2} maxLength={60} placeholder="Company or seller name" /></label>
          <label className="field"><span>{copy.sell.category}</span><select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>{CATEGORIES.map((value) => <option key={value} value={value}>{copy.cat[value]}</option>)}</select></label>
          <label className="field"><span>{copy.sell.condition}</span><select name="condition" defaultValue="used"><option value="used">{copy.cond.used}</option><option value="new">{copy.cond.new}</option></select></label>
          <label className="field"><span>{copy.sell.city}</span><select name="city" defaultValue="addis">{CITIES.map((value) => <option key={value} value={value}>{cityName(locale, value)}</option>)}</select></label>
          <label className="field"><span>{copy.sell.make}</span><input name="make" required maxLength={40} placeholder="Toyota, CAT, Volvo…" /></label>
          <label className="field"><span>{copy.sell.model}</span><input name="model" required maxLength={40} placeholder="Land Cruiser, 320D, 336…" /></label>
          <label className="field"><span>{copy.sell.year}</span><input name="year" type="number" inputMode="numeric" min="1970" max="2030" defaultValue="2020" required /></label>
          <label className="field"><span>{copy.sell.price}</span><input name="priceBirr" inputMode="decimal" required placeholder="3,500,000" /></label>
          {!heavy ? <label className="field"><span>{copy.sell.mileage}</span><input name="mileageKm" type="number" inputMode="numeric" min="0" placeholder="85000" /></label> : <label className="field"><span>{copy.sell.hours}</span><input name="hours" type="number" inputMode="numeric" min="0" placeholder="4200" /></label>}
        </div>
        <label className="field"><span>{copy.sell.titleField}</span><input name="title" required minLength={4} maxLength={80} placeholder="2019 Toyota Land Cruiser Prado TXL" /></label>
        <label className="field"><span>{copy.sell.summary}</span><textarea name="summary" required minLength={10} maxLength={600} rows={5} placeholder="Condition, ownership, service history, location, and important buyer information…" /></label>
        <MediaUploader value={media} onChange={setMedia} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" disabled={pending} className={btnPrimary}>{pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlusCircle className="mr-2 size-4" />}{copy.sell.submitReview}</button>
          <button type="button" disabled={pending} className={btnGhost} onClick={(event) => { const form = event.currentTarget.form; if (form) void submit(form, false); }}>{copy.sell.submit}</button>
          {note ? <span className="flex items-center gap-2 text-sm font-semibold text-emerald"><CheckCircle2 className="size-4" />{note}</span> : null}
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-2">Seller dashboard</p><h2 className="mt-1 font-display text-3xl">{copy.sell.mine}</h2></div></div>
        {!items?.length ? <div className="rounded-card border border-dashed border-line-soft p-6 text-muted">{items ? copy.sell.empty : copy.common.loading}</div> : <div className="grid gap-4 sm:grid-cols-2">{items.map((item) => <article key={item.id} className="rounded-card border border-line-soft bg-card p-4"><div className="flex gap-3"><img src={item.image} alt="" className="size-24 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold uppercase tracking-wider text-gold-2">{copy.status[item.status]}</p><h3 className="mt-1 font-display text-xl">{item.title}</h3><PriceTag santim={item.priceSantim} locale={locale} /><div className="mt-3 flex flex-wrap gap-2">{item.status === "draft" ? <button className="chip" onClick={() => void changeStatus(item.id, "pending")}>{copy.sell.submitReview}</button> : null}{item.status === "pending" ? <button className="chip" onClick={() => void changeStatus(item.id, "paused")}>{copy.sell.pause}</button> : null}{item.status === "published" ? <><button className="chip" onClick={() => void changeStatus(item.id, "sold")}>{copy.sell.sold}</button><button className="chip" onClick={() => void changeStatus(item.id, "paused")}>{copy.sell.pause}</button></> : null}{item.status === "paused" ? <button className="chip" onClick={() => void changeStatus(item.id, "pending")}>{copy.sell.resume}</button> : null}{["draft", "paused", "sold"].includes(item.status) ? <button className="chip" onClick={() => void changeStatus(item.id, "archived")}>{copy.sell.archive}</button> : null}</div></div></div></article>)}</div>}
      </section>
    </div>
  );
}
