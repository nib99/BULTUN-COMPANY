import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { dict } from "@/lib/i18n";
import { searchListings } from "@/lib/marketplace/api";
import { isCategory } from "@/lib/marketplace/status";
import { ListingCardView } from "@/components/dalala/listing-card";

export const Route = createFileRoute("/$locale/c/$category")({
  beforeLoad: ({ params }) => {
    if (!isCategory(params.category)) throw notFound();
  },
  loader: ({ params }) =>
    searchListings({
      data: {
        locale: params.locale,
        category: params.category,
        q: "",
        condition: "any",
        city: "any",
        sort: "newest",
        page: 1,
      },
    }),
  component: CategoryPage,
});

function CategoryPage() {
  const { locale, category } = Route.useParams();
  const result = Route.useLoaderData();
  const copy = dict(locale);
  if (!isCategory(category)) return null;
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <p className="text-xs font-semibold tracking-widest text-gold-2">{copy.home.categories}</p>
      <h1 className="font-display text-4xl">{copy.cat[category]}</h1>
      <p className="max-w-xl text-muted">{copy.cat[`${category}Blurb`]}</p>
      <Link to="/$locale/search" params={{ locale }} search={{ q: "", category, condition: "any", city: "any", sort: "newest", page: 1 }} className="text-sm font-semibold text-emerald">
        {copy.search.title}
      </Link>
      {result.items.length === 0 ? <p>{copy.search.empty}</p> : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((item) => (
          <li key={item.id}>
            <ListingCardView item={item} locale={locale} />
          </li>
        ))}
      </ul>
    </main>
  );
}
