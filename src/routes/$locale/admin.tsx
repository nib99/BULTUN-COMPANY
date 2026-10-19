import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, Loader2, ShieldAlert, X } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { adminListPendingListings, adminModerateListing, type ListingCard } from "@/lib/marketplace/api";
import { dict, type Locale } from "@/lib/i18n";
import { btnGhost, btnPrimary, cityName, PriceTag } from "@/components/bultum/chrome";

export const Route = createFileRoute("/$locale/admin")({ component: AdminPage });

function AdminPage() {
  const { locale } = Route.useParams();
  const { user, isPending: authPending } = useCurrentUserState();
  if (authPending) return <AdminLoading />;
  if (!user) return <RedirectToSignIn />;
  return <AdminWorkspace locale={locale} />;
}

function AdminLoading() {
  return <main className="mx-auto max-w-5xl px-4 py-12"><p className="text-sm text-muted">Loading admin workspace…</p></main>;
}

function AdminWorkspace({ locale }: { locale: Locale }) {
  const copy = dict(locale);
  const [items, setItems] = useState<ListingCard[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setError("");
    adminListPendingListings({ data: { locale } })
      .then((value) => {
        if (live) setItems(value);
      })
      .catch((reason: unknown) => {
        if (!live) return;
        setItems([]);
        setError(reason instanceof Error && reason.message === "forbidden" ? "You do not have marketplace moderation access." : copy.common.error);
      });
    return () => { live = false; };
  }, [locale, tick, copy.common.error]);

  const pendingCount = items?.length ?? 0;
  const title = useMemo(() => `${copy.brand.name} Admin`, [copy.brand.name]);

  async function moderate(id: string, to: "published" | "archived") {
    setBusyId(id);
    setError("");
    try {
      await adminModerateListing({
        data: {
          id,
          to,
          note: notes[id] ?? "",
        },
      });
      setTick((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error && reason.message === "forbidden" ? "You do not have marketplace moderation access." : copy.common.error);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-6 pb-24">
      <header className="overflow-hidden rounded-[2rem] bg-ink p-6 text-ivory shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">Moderation</p>
            <h1 className="mt-1 font-display text-4xl text-ivory">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ivory/70">Review seller submissions before they become visible to buyers. Approval changes the listing to public inventory.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center">
            <p className="text-3xl font-black text-gold">{pendingCount}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-ivory/60">Pending</p>
          </div>
        </div>
      </header>

      {error ? (
        <section className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-danger" />
          <div><p className="font-bold">Admin access</p><p className="mt-1 text-muted">{error}</p></div>
        </section>
      ) : null}

      {items === null ? <p className="rounded-2xl border border-line-soft bg-card p-8 text-center text-muted">Loading pending listings…</p> : null}
      {items?.length === 0 && !error ? (
        <section className="rounded-[1.75rem] border border-dashed border-line-soft bg-card p-10 text-center">
          <Check className="mx-auto size-9 text-emerald" />
          <h2 className="mt-3 font-display text-2xl">No pending listings</h2>
          <p className="mt-2 text-sm text-muted">New seller submissions will appear here automatically.</p>
        </section>
      ) : null}

      {items?.length ? (
        <section className="grid gap-5 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[1.75rem] border border-line-soft bg-card shadow-sm">
              <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                <img src={item.image} alt="" className="h-48 w-full object-cover sm:h-full sm:min-h-56" />
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-gold-2">{copy.cat[item.category]}</p>
                      <h2 className="mt-1 font-display text-2xl">{item.title}</h2>
                    </div>
                    {item.sellerVerified ? <BadgeCheck className="size-6 shrink-0 text-emerald" title="Verified seller" /> : null}
                  </div>
                  <PriceTag santim={item.priceSantim} locale={locale} />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Meta label="Seller" value={item.sellerName} />
                    <Meta label="Location" value={cityName(locale, item.city)} />
                    <Meta label="Make" value={item.make} />
                    <Meta label="Model" value={item.model} />
                    <Meta label="Year" value={item.year ? String(item.year) : "—"} />
                    <Meta label="Status" value={copy.status[item.status]} />
                  </div>
                  <p className="text-sm leading-6 text-muted">{item.summary}</p>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Moderation note</span>
                    <textarea
                      value={notes[item.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                      maxLength={1000}
                      rows={3}
                      placeholder="Optional reason or internal review note…"
                      className="mt-1 min-h-20 w-full rounded-2xl border border-line-soft bg-ivory px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busyId === item.id} className={btnPrimary} onClick={() => void moderate(item.id, "published")}>
                      {busyId === item.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                      Approve & publish
                    </button>
                    <button type="button" disabled={busyId === item.id} className={btnGhost} onClick={() => void moderate(item.id, "archived")}>
                      <X className="mr-2 size-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line-soft bg-ivory p-2.5"><p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p><p className="mt-0.5 truncate text-sm font-semibold">{value}</p></div>;
}
