import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { dict, TRANSLATION_REVIEW } from "@/lib/i18n";
import { accountFacts, listInquiries } from "@/lib/marketplace/api";
import { btnPrimary } from "@/components/dalala/chrome";
import { readTelegramResult } from "@/components/dalala/telegram";
import type { TelegramAuthResult } from "@/lib/telegram/api";

export const Route = createFileRoute("/$locale/account")({ component: AccountPage });

function AccountPage() {
  const { locale } = Route.useParams();
  const copy = dict(locale);
  const { user, isPending } = useCurrentUserState();
  const [facts, setFacts] = useState<{ roles: string[]; hasSeller: boolean } | null>(null);
  const [mail, setMail] = useState<{ sent: { id: string; title: string; message: string }[]; received: { id: string; title: string; message: string; buyer_name: string }[] } | null>(null);
  const [telegram, setTelegram] = useState<TelegramAuthResult | null>(null);

  useEffect(() => {
    setTelegram(readTelegramResult());
  }, []);

  useEffect(() => {
    if (!user) return;
    let live = true;
    accountFacts()
      .then((value) => {
        if (live) setFacts(value);
      })
      .catch(() => {
        if (live) setFacts({ roles: [], hasSeller: false });
      });
    listInquiries()
      .then((value) => {
        if (live) setMail(value);
      })
      .catch(() => {
        if (live) setMail({ sent: [], received: [] });
      });
    return () => {
      live = false;
    };
  }, [user?.id]);

  const role = facts?.roles[0];
  const roleLabel =
    role === "moderator"
      ? copy.account.roleModerator
      : role === "admin"
        ? copy.account.roleAdmin
        : role === "super_admin"
          ? copy.account.roleSuper
          : role === "platform_owner"
            ? copy.account.roleOwner
            : copy.account.roleUser;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="font-display text-4xl">{copy.account.title}</h1>
      {isPending ? <p className="text-sm text-muted">{copy.common.loading}</p> : null}
      {!isPending && !user ? (
        <section className="space-y-3 rounded-card border border-line-soft bg-card p-4">
          <p>{copy.account.guest}</p>
          {GROK_PROVIDERS.map((provider) => (
            <button
              key={provider.providerId}
              type="button"
              className={btnPrimary}
              onClick={() => signIn(provider.providerId, { callbackURL: `/${locale}/account` })}
            >
              {copy.login.continue} {provider.label}
            </button>
          ))}
          <Link to="/login" className="text-sm font-semibold text-emerald">
            {copy.account.signInTitle}
          </Link>
        </section>
      ) : null}
      {user ? (
        <section className="space-y-3 rounded-card border border-line-soft bg-card p-4">
          <UserButton />
          <p className="text-sm text-muted">{facts?.hasSeller ? copy.account.sellerYes : copy.account.sellerNo}</p>
          <p className="text-sm">
            {copy.account.role}: {roleLabel}
          </p>
        </section>
      ) : null}
      <section className="space-y-2">
        <h2 className="font-display text-2xl">{copy.account.language}</h2>
        {TRANSLATION_REVIEW.includes(locale) ? <p className="text-sm text-muted">{copy.account.review}</p> : null}
      </section>
      <section className="space-y-2 rounded-card bg-ink p-5 text-ivory">
        <h2 className="font-display text-2xl text-ivory">{copy.account.telegramTitle}</h2>
        <p className="text-sm text-gold">{copy.account.telegramBody}</p>
        <p className="text-sm">{telegramMessage(copy, telegram)}</p>
      </section>
      {user && mail ? (
        <>
          <InquiryList title={copy.account.sentTitle} empty={copy.account.noInquiries} rows={mail.sent.map((row) => ({ id: row.id, title: row.title, message: row.message }))} />
          <InquiryList
            title={copy.account.receivedTitle}
            empty={copy.account.noInquiries}
            rows={mail.received.map((row) => ({ id: row.id, title: `${copy.account.fromBuyer}: ${row.buyer_name} — ${row.title}`, message: row.message }))}
          />
        </>
      ) : null}
    </main>
  );
}

function telegramMessage(copy: ReturnType<typeof dict>, result: TelegramAuthResult | null) {
  if (!result) return copy.account.telegramIdle;
  if (result.ok) return copy.account.telegramOk;
  if (result.code === "not_configured") return copy.account.telegramOff;
  if (result.code === "rate_limited") return copy.account.telegramRate;
  if (result.code === "expired" || result.code === "bad_signature" || result.code === "malformed" || result.code === "missing_user") {
    return copy.account.telegramBad;
  }
  return copy.account.telegramIdle;
}

function InquiryList({ title, empty, rows }: { title: string; empty: string; rows: { id: string; title: string; message: string }[] }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-2xl">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">{empty}</p> : null}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-card border border-line-soft bg-card p-3">
            <p className="text-sm font-semibold">{row.title}</p>
            <p className="text-sm text-muted">{row.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
