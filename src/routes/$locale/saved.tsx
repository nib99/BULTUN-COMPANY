import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListingCardView } from "@/components/dalala/listing-card";
import { readLocalSaved } from "@/components/dalala/listing-actions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { dict } from "@/lib/i18n";
import { listSaved, listingsByIds, type ListingCard } from "@/lib/marketplace/api";

export const Route = createFileRoute("/$locale/saved")({ component: SavedPage });

function SavedPage() {
  const { locale } = Route.useParams();
  const copy = dict(locale);
  const { user, isPending } = useCurrentUserState();
  const [items, setItems] = useState<ListingCard[]>([]);
  const [local, setLocal] = useState(false);

  useEffect(() => {
    if (isPending) return;
    let live = true;
    const done = (rows: ListingCard[], onDevice: boolean) => {
      if (!live) return;
      setItems(rows);
      setLocal(onDevice);
    };
    if (!user) {
      const ids = readLocalSaved();
      listingsByIds({ data: { locale, ids } })
        .then((rows) => done(rows, true))
        .catch(() => done([], true));
    } else {
      listSaved({ data: locale })
        .then((rows) => done(rows, false))
        .catch(() => done([], false));
    }
    return () => {
      live = false;
    };
  }, [user?.id, isPending, locale]);

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-4xl">{copy.savedPage.title}</h1>
      {local ? <p className="text-sm text-muted">{copy.savedPage.local}</p> : null}
      {isPending ? <p className="text-sm text-muted">{copy.common.loading}</p> : null}
      {!isPending && items.length === 0 ? <p>{copy.savedPage.empty}</p> : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <ListingCardView item={item} locale={locale} />
          </li>
        ))}
      </ul>
    </main>
  );
}
