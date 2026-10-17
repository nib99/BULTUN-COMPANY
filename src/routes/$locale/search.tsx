import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { dict } from "@/lib/i18n";
import { searchListings } from "@/lib/marketplace/api";
import { CATEGORIES, CITIES, isCategory, isCity } from "@/lib/marketplace/status";
import { btnPrimary, cityName } from "@/components/dalala/chrome";
import { ListingCardView } from "@/components/dalala/listing-card";

type SearchIn = {
  q: string;
  category: "all" | (typeof CATEGORIES)[number];
  condition: "any" | "new" | "used";
  city: "any" | (typeof CITIES)[number];
  sort: "newest" | "price_asc" | "price_desc";
  page: number;
};

function readSearch(search: Record<string, unknown>): SearchIn {
  const category = typeof search.category === "string" && (search.category === "all" || isCategory(search.category)) ? search.category : "all";
  const condition = search.condition === "new" || search.condition === "used" ? search.condition : "any";
  const city = typeof search.city === "string" && (search.city === "any" || isCity(search.city)) ? search.city : "any";
  const sort = search.sort === "price_asc" || search.sort === "price_desc" ? search.sort : "newest";
  const pageNum = Number(search.page);
  const page = Number.isFinite(pageNum) ? Math.min(40, Math.max(1, Math.floor(pageNum))) : 1;
  return {
    q: typeof search.q === "string" ? search.q.slice(0, 80) : "",
    category,
    condition,
    city,
    sort,
    page,
  };
}

export const Route = createFileRoute("/$locale/search")({
  validateSearch: (search) => readSearch(search),
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) => searchListings({ data: { locale: params.locale, ...deps } }),
  component: SearchPage,
});

function SearchPage() {
  const { locale } = Route.useParams();
  const search = Route.useSearch();
  const result = Route.useLoaderData();
  const navigate = useNavigate({ from: "/$locale/search" });
  const copy = dict(locale);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="font-display text-4xl">{copy.search.title}</h1>
      <form
        className="grid gap-3 rounded-card border border-line-soft bg-card p-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void navigate({
            search: {
              q: String(form.get("q") ?? ""),
              category: String(form.get("category") ?? "all") as SearchIn["category"],
              condition: String(form.get("condition") ?? "any") as SearchIn["condition"],
              city: String(form.get("city") ?? "any") as SearchIn["city"],
              sort: String(form.get("sort") ?? "newest") as SearchIn["sort"],
              page: 1,
            },
          });
        }}
      >
        <label className="text-sm font-semibold sm:col-span-2">
          {copy.search.placeholder}
          <input name="q" defaultValue={search.q} className="mt-1 w-full rounded-xl border border-line-soft bg-ivory px-3 py-3" />
        </label>
        <label className="text-sm font-semibold">
          {copy.home.categories}
          <select name="category" defaultValue={search.category} className="mt-1 w-full rounded-xl border border-line-soft bg-ivory px-3 py-3">
            <option value="all">{copy.search.all}</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {copy.cat[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          {copy.search.condition}
          <select name="condition" defaultValue={search.condition} className="mt-1 w-full rounded-xl border border-line-soft bg-ivory px-3 py-3">
            <option value="any">{copy.search.any}</option>
            <option value="used">{copy.cond.used}</option>
            <option value="new">{copy.cond.new}</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          {copy.search.city}
          <select name="city" defaultValue={search.city} className="mt-1 w-full rounded-xl border border-line-soft bg-ivory px-3 py-3">
            <option value="any">{copy.search.any}</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {cityName(locale, city)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          {copy.search.sort}
          <select name="sort" defaultValue={search.sort} className="mt-1 w-full rounded-xl border border-line-soft bg-ivory px-3 py-3">
            <option value="newest">{copy.search.newest}</option>
            <option value="price_asc">{copy.search.priceLow}</option>
            <option value="price_desc">{copy.search.priceHigh}</option>
          </select>
        </label>
        <button type="submit" className={btnPrimary}>
          {copy.search.apply}
        </button>
      </form>
      <p className="text-sm text-muted">
        {copy.search.results}: {result.total}
      </p>
      {result.items.length === 0 ? <p>{copy.search.empty}</p> : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((item) => (
          <li key={item.id}>
            <ListingCardView item={item} locale={locale} />
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        {search.page > 1 ? (
          <button type="button" className={btnPrimary} onClick={() => void navigate({ search: { ...search, page: search.page - 1 } })}>
            {copy.search.prev}
          </button>
        ) : null}
        {search.page < pages ? (
          <button type="button" className={btnPrimary} onClick={() => void navigate({ search: { ...search, page: search.page + 1 } })}>
            {copy.search.next}
          </button>
        ) : null}
      </div>
    </main>
  );
}
