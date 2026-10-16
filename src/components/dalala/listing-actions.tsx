import { useEffect, useState } from "react";
import { SignInGate } from "@/lib/auth/gates";
import { AUTH_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { dict, type Locale } from "@/lib/i18n";
import { ownsListing, listSaved, sendInquiry, sendReport, toggleFavorite } from "@/lib/marketplace/api";
import { btnGhost, btnPrimary } from "./chrome";
import { COMPANY_PHONE } from "@/lib/company";
import { ReminderButton } from "./reminder-button";

const SAVED_KEY = "bultum-saved";

function readSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeLocalSaved(ids: string[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
}

export function readLocalSaved() {
  return readSaved();
}

export function ListingActions({
  locale,
  listingId,
  title,
  isDemo,
  sellerWhatsApp,
  sellerPhone,
}: {
  locale: Locale;
  listingId: string;
  title: string;
  isDemo: boolean;
  sellerWhatsApp?: string;
  sellerPhone?: string;
}) {
  const copy = dict(locale);
  const { user, isPending } = useCurrentUserState();
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState("");
  const [owns, setOwns] = useState(false);
  const [reason, setReason] = useState<"misleading" | "scam" | "other">("misleading");

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setSaved(readSaved().includes(listingId));
      setOwns(false);
      return;
    }
    let live = true;
    ownsListing({ data: { id: listingId } })
      .then((value) => {
        if (live) setOwns(value);
      })
      .catch(() => {
        if (live) setOwns(false);
      });
    listSaved({ data: locale })
      .then((rows) => {
        if (live) setSaved(rows.some((row) => row.id === listingId));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [user?.id, isPending, listingId, locale]);

  useEffect(() => {
    const button = window.Telegram?.WebApp?.MainButton;
    if (!button || owns) return;
    const press = () => document.getElementById("inquiry")?.scrollIntoView({ behavior: "smooth" });
    button.setText(copy.listing.inquire);
    button.onClick(press);
    button.show();
    return () => {
      button.offClick?.(press);
      button.hide();
    };
  }, [copy.listing.inquire, owns]);

  const contactNumber = (sellerWhatsApp || COMPANY_PHONE).replace(/\D/g, "");
  const displayNumber = sellerWhatsApp || COMPANY_PHONE;
  const whatsappMessage = `Hello BULTUM COMPANY, I am interested in ${title}. Listing: ${window.location.href}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={`https://wa.me/${contactNumber}?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#25D366] px-5 text-sm font-black text-white shadow-sm transition hover:brightness-95"
        >
          {copy.listing.whatsapp} · {displayNumber}
        </a>
        <a
          href={`tel:${(sellerPhone || COMPANY_PHONE).replace(/\s/g, "")}`}
          className={btnGhost}
        >
          {copy.listing.callOwner}
        </a>
      </div>
      <ReminderButton locale={locale} listingId={listingId} title={title} label={copy.listing.remind} setLabel={copy.listing.setReminder} updateLabel={copy.listing.updateReminder} hint={copy.listing.reminderHint} invalidText={copy.listing.reminderFuture} blockedText={copy.listing.reminderBlocked} successText={copy.listing.reminderSet} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            if (!user) {
              const ids = readSaved();
              const next = ids.includes(listingId) ? ids.filter((id) => id !== listingId) : [...ids, listingId];
              writeLocalSaved(next);
              setSaved(next.includes(listingId));
              return;
            }
            toggleFavorite({ data: { listingId } })
              .then((result) => setSaved(result.saved))
              .catch(() => setNote(copy.common.error));
          }}
        >
          {saved ? copy.listing.saved : copy.listing.save}
        </button>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            const url = window.location.href;
            const href = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
            const tg = window.Telegram?.WebApp;
            if (tg?.openTelegramLink) {
              tg.openTelegramLink(href);
              return;
            }
            if (navigator.share) {
              void navigator.share({ title, url }).catch(() => undefined);
              return;
            }
            void navigator.clipboard.writeText(url).then(() => setNote(copy.listing.copied));
          }}
        >
          {copy.listing.share}
        </button>
      </div>
      {isDemo ? <p className="text-sm text-gold-2">{copy.listing.categoryPhoto}</p> : null}
      {owns ? <p className="text-sm text-muted">{copy.listing.ownListing}</p> : null}
      <section id="inquiry" className="space-y-3 rounded-card border border-line-soft bg-card p-4">
        <h2 className="font-display text-2xl">{copy.listing.inquire}</h2>
        {isPending ? <p className="text-sm text-muted">{copy.common.loading}</p> : null}
        {!isPending && !owns ? (
          <SignInGate
            fallback={
              <div className="space-y-3">
                <p className="text-sm text-muted">{copy.listing.signIn}</p>
                {AUTH_PROVIDERS.map((provider) => (
                  <button
                    key={provider.providerId}
                    type="button"
                    className={btnPrimary}
                    onClick={() => signIn(provider.providerId, { callbackURL: window.location.pathname })}
                  >
                    {copy.login.continue} {provider.label}
                  </button>
                ))}
              </div>
            }
          >
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const message = String(new FormData(event.currentTarget).get("message") ?? "");
                sendInquiry({ data: { listingId, message } })
                  .then(() => {
                    setNote(copy.listing.sent);
                    (event.target as HTMLFormElement).reset();
                  })
                  .catch((error: unknown) => {
                    const text = error instanceof Error ? error.message : "";
                    setNote(text.includes("own") ? copy.listing.ownListing : copy.common.required);
                  });
              }}
            >
              <label className="block text-sm font-semibold">
                {copy.listing.message}
                <textarea name="message" required minLength={10} maxLength={800} rows={4} className="mt-1 w-full rounded-xl border border-line-soft bg-ivory px-3 py-3" />
              </label>
              <button type="submit" className={btnPrimary}>
                {copy.listing.send}
              </button>
            </form>
          </SignInGate>
        ) : null}
        {note ? <p className="text-sm">{note}</p> : null}
      </section>
      {!owns && user ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            sendReport({ data: { listingId, reason } })
              .then(() => setNote(copy.listing.reported))
              .catch(() => setNote(copy.common.error));
          }}
        >
          <label className="text-sm font-semibold">
            {copy.listing.report}
            <select
              className="mt-1 block rounded-xl border border-line-soft bg-card px-3 py-3"
              value={reason}
              onChange={(event) => setReason(event.target.value as typeof reason)}
            >
              <option value="misleading">{copy.listing.reportMisleading}</option>
              <option value="scam">{copy.listing.reportScam}</option>
              <option value="other">{copy.listing.reportOther}</option>
            </select>
          </label>
          <button type="submit" className={btnGhost}>
            {copy.listing.report}
          </button>
        </form>
      ) : null}
    </div>
  );
}
