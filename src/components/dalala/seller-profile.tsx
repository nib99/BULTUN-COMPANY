import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, Save, Upload } from "lucide-react";
import { CITIES } from "@/lib/marketplace/status";
import { cityName, btnPrimary } from "./chrome";
import { dict, type Locale } from "@/lib/i18n";
import { createCloudinaryUpload } from "@/lib/media/cloudinary";
import { getMySellerProfile, requestSellerVerification, updateSellerProfile, type SellerProfile } from "@/lib/marketplace/api";

export function SellerProfileEditor({ locale }: { locale: Locale }) {
  const copy = dict(locale);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    getMySellerProfile().then(setProfile).catch(() => setProfile(null)).finally(() => setLoading(false));
  }, []);

  async function save(form: HTMLFormElement) {
    setBusy(true);
    setNote("");
    const fd = new FormData(form);
    try {
      await updateSellerProfile({ data: {
        displayName: String(fd.get("displayName") ?? ""),
        city: String(fd.get("city") ?? "addis") as SellerProfile["city"],
        kind: String(fd.get("kind") ?? "individual") as "individual" | "dealer",
        bio: String(fd.get("bio") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        whatsapp: String(fd.get("whatsapp") ?? ""),
        website: String(fd.get("website") ?? ""),
        logoUrl: String(fd.get("logoUrl") ?? ""),
      } });
      setProfile(await getMySellerProfile());
      setNote(copy.seller.saved);
    } catch {
      setNote(copy.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const signed = await createCloudinaryUpload({ data: { kind: "image" } });
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signed.apiKey);
      form.append("timestamp", signed.timestamp);
      form.append("folder", `${signed.folder}/profile`);
      // The signature was generated for the folder returned by the server; keep profile logos in the same secure user folder.
      form.set("folder", signed.folder);
      form.append("signature", signed.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body: form });
      if (!response.ok) throw new Error("upload");
      const result = (await response.json()) as { secure_url?: string };
      if (!result.secure_url) throw new Error("upload");
      setProfile((current) => current ? { ...current, logoUrl: result.secure_url ?? "" } : current);
    } catch {
      setNote(copy.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    try {
      await requestSellerVerification();
      setProfile((current) => current ? { ...current, verificationStatus: "pending" } : current);
      setNote(copy.seller.requested);
    } catch {
      setNote(copy.seller.profileFirst);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="rounded-2xl border border-line-soft bg-card p-5 text-sm text-muted">Loading seller profile…</div>;

  const current = profile ?? {
    userId: "", displayName: "", city: "addis", kind: "individual" as const, bio: "", phone: "", whatsapp: "", website: "", logoUrl: "", verified: false, verificationStatus: "unverified" as const,
  };

  return (
    <section className="space-y-4 rounded-[1.5rem] border border-line-soft bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#061A33] text-[#FFD33D]"><BadgeCheck className="size-5" /></div>
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-gold-2">{copy.seller.profile}</p><h2 className="font-display text-2xl">{copy.seller.trust}</h2><p className="text-sm text-muted">{copy.seller.desc}</p></div>
      </div>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }}>
        <label className="field"><span>{copy.seller.name}</span><input name="displayName" defaultValue={current.displayName} required minLength={2} maxLength={80} /></label>
        <label className="field"><span>{copy.seller.type}</span><select name="kind" defaultValue={current.kind}><option value="individual">Individual</option><option value="dealer">Company / Dealer</option></select></label>
        <label className="field"><span>{copy.seller.city}</span><select name="city" defaultValue={current.city}>{CITIES.map((city) => <option key={city} value={city}>{cityName(locale, city)}</option>)}</select></label>
        <label className="field"><span>{copy.seller.phone}</span><input name="phone" defaultValue={current.phone} inputMode="tel" placeholder="+251 9…" /></label>
        <label className="field"><span>{copy.seller.whatsapp}</span><input name="whatsapp" defaultValue={current.whatsapp} inputMode="tel" placeholder="2519…" /></label>
        <label className="field"><span>{copy.seller.website}</span><input name="website" defaultValue={current.website} type="url" placeholder="https://…" /></label>
        <label className="field sm:col-span-2"><span>{copy.seller.bio}</span><textarea name="bio" defaultValue={current.bio} maxLength={800} rows={4} placeholder="Who you are, what you sell, years in business, service area…" /></label>
        <input type="hidden" name="logoUrl" value={current.logoUrl} readOnly />
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          {current.logoUrl ? <img src={current.logoUrl} alt="Seller logo" className="size-16 rounded-2xl border border-line-soft object-cover" /> : <div className="grid size-16 place-items-center rounded-2xl bg-ink text-xs font-black text-white">LOGO</div>}
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-soft bg-card px-4 text-sm font-bold"><Upload className="mr-2 size-4" />{copy.seller.logo}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadLogo(event.target.files?.[0])} /></label>
          <button disabled={busy} type="submit" className={btnPrimary}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}{copy.seller.save}</button>
          {!current.verified && current.verificationStatus !== "pending" ? <button disabled={busy} type="button" onClick={() => void verify()} className="min-h-11 rounded-full border border-[#0b5cab] px-4 text-sm font-black text-[#0b5cab]">{copy.seller.request}</button> : null}
          {current.verificationStatus === "pending" ? <span className="text-sm font-bold text-amber-700">{copy.seller.pending}</span> : null}
          {current.verified ? <span className="inline-flex items-center gap-1 text-sm font-black text-emerald"><BadgeCheck className="size-4" /> {copy.seller.verified}</span> : null}
        </div>
        {note ? <p className="sm:col-span-2 text-sm font-semibold text-muted">{note}</p> : null}
      </form>
    </section>
  );
}
