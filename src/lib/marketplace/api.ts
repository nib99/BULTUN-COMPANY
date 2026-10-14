import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { etbToSantim } from "./money";
import {
  canSellerTransition,
  categoryCover,
  isCategory,
  isListingStatus,
  type Category,
  type ListingStatus,
} from "./status";

const localeSchema = z.enum(["en", "om", "am", "so"]);
const categorySchema = z.enum(["cars", "trucks", "machinery", "agriculture"]);
const citySchema = z.enum([
  "addis",
  "adama",
  "hawassa",
  "bahirdar",
  "diredawa",
  "mekelle",
  "jimma",
  "gondar",
]);

export type ListingCard = {
  id: string;
  category: Category;
  condition: "new" | "used";
  priceSantim: number;
  city: string;
  year: number | null;
  make: string;
  model: string;
  mileageKm: number | null;
  hours: number | null;
  title: string;
  summary: string;
  image: string;
  featured: boolean;
  isDemo: boolean;
  status: ListingStatus;
};

export type ListingDetail = ListingCard & {
  seller: {
    displayName: string;
    city: string;
    kind: "individual" | "dealer";
    isDemo: boolean;
  };
  owns: boolean;
};

type Raw = {
  id: string;
  category: string;
  condition: string;
  price_santim: number;
  city: string;
  year: number | null;
  make: string;
  model: string;
  mileage_km: number | null;
  hours: number | null;
  title: string;
  summary: string;
  cover_path: string;
  featured: boolean;
  is_demo: boolean;
  status: string;
};

const CARD_SQL = `
  select l.id, l.category, l.condition, l.price_santim, l.city, l.year, l.make, l.model,
         l.mileage_km, l.hours, l.cover_path, l.featured, l.is_demo, l.status,
         coalesce(pref.title, src.title) as title,
         coalesce(pref.summary, src.summary) as summary
  from listings l
  join listing_translations src on src.listing_id = l.id and src.locale = l.source_locale
  left join listing_translations pref on pref.listing_id = l.id and pref.locale = $1
`;

function mapCard(row: Raw): ListingCard {
  const category = isCategory(row.category) ? row.category : "cars";
  const status = isListingStatus(row.status) ? row.status : "removed";
  return {
    id: row.id,
    category,
    condition: row.condition === "new" ? "new" : "used",
    priceSantim: Number(row.price_santim),
    city: row.city,
    year: row.year === null ? null : Number(row.year),
    make: row.make,
    model: row.model,
    mileageKm: row.mileage_km === null ? null : Number(row.mileage_km),
    hours: row.hours === null ? null : Number(row.hours),
    title: row.title,
    summary: row.summary,
    image: row.cover_path,
    featured: Boolean(row.featured),
    isDemo: Boolean(row.is_demo),
    status,
  };
}

async function db() {
  const { getSql, dbSource } = await import("@/lib/db");
  const { ensureDemoSeed } = await import("./seed");
  const sql = await getSql();
  await ensureDemoSeed(sql, dbSource);
  return sql;
}

function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export const getYard = createServerFn({ method: "GET" })
  .validator((input: unknown) => localeSchema.parse(input))
  .handler(async ({ data: locale }) => {
    const sql = await db();
    const rows = await sql.query<Raw>(
      `${CARD_SQL}
       where l.status = 'published'
       order by l.featured desc, l.created_at desc
       limit 8`,
      [locale],
    );
    const counts = await sql<{ category: string; n: number }>`
      select category, count(*)::int as n
      from listings
      where status = 'published'
      group by category
    `;
    const tally = { cars: 0, trucks: 0, machinery: 0, agriculture: 0 };
    for (const row of counts) {
      if (isCategory(row.category)) tally[row.category] = Number(row.n);
    }
    const items = rows.map(mapCard);
    return {
      items,
      counts: tally,
      sample: items.some((item) => item.isDemo),
    };
  });

const searchSchema = z.object({
  locale: localeSchema,
  q: z.string().max(80).default(""),
  category: z.enum(["all", "cars", "trucks", "machinery", "agriculture"]).default("all"),
  condition: z.enum(["any", "new", "used"]).default("any"),
  city: z.enum(["any", ...citySchema.options]).default("any"),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.number().int().min(1).max(40).default(1),
});

export const searchListings = createServerFn({ method: "GET" })
  .validator((input: unknown) => searchSchema.parse(input))
  .handler(async ({ data }) => {
    const sql = await db();
    const order = {
      newest: "l.created_at desc",
      price_asc: "l.price_santim asc",
      price_desc: "l.price_santim desc",
    }[data.sort];
    const pattern = likePattern(data.q.trim());
    const params = [
      data.locale,
      data.category,
      data.condition,
      data.city,
      data.q.trim(),
      pattern,
    ];
    const where = `
      where l.status = 'published'
        and ($2 = 'all' or l.category = $2)
        and ($3 = 'any' or l.condition = $3)
        and ($4 = 'any' or l.city = $4)
        and (
          $5 = ''
          or coalesce(pref.title, src.title) ilike $6 escape '\\'
          or l.make ilike $6 escape '\\'
          or l.model ilike $6 escape '\\'
        )
    `;
    const totalRows = await sql.query<{ n: number }>(
      `select count(*)::int as n
       from listings l
       join listing_translations src on src.listing_id = l.id and src.locale = l.source_locale
       left join listing_translations pref on pref.listing_id = l.id and pref.locale = $1
       ${where}`,
      params,
    );
    const pageSize = 12;
    const rows = await sql.query<Raw>(
      `${CARD_SQL} ${where} order by ${order} limit ${pageSize} offset ${(data.page - 1) * pageSize}`,
      params,
    );
    return {
      items: rows.map(mapCard),
      total: Number(totalRows[0]?.n ?? 0),
      page: data.page,
      pageSize,
    };
  });

export const getListing = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    z
      .object({
        locale: localeSchema,
        id: z.string().regex(/^[a-z0-9-]{4,80}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const sql = await db();
    const rows = await sql.query<
      Raw & {
        seller_name: string;
        seller_city: string;
        seller_kind: string;
        seller_demo: boolean;
      }
    >(
      `${CARD_SQL.replace("from listings l", `, s.display_name as seller_name, s.city as seller_city, s.kind as seller_kind, s.is_demo as seller_demo
        from listings l`)}
       join seller_profiles s on s.user_id = l.seller_user_id
       where l.id = $2 and l.status in ('published', 'sold')`,
      [data.locale, data.id],
    );
    const row = rows[0];
    if (!row) return null;
    const card = mapCard(row);
    return {
      ...card,
      owns: false,
      seller: {
        displayName: row.seller_name,
        city: row.seller_city,
        kind: row.seller_kind === "dealer" ? "dealer" : "individual",
        isDemo: Boolean(row.seller_demo),
      },
    } satisfies ListingDetail;
  });

export const listingsByIds = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    z
      .object({
        locale: localeSchema,
        ids: z.array(z.string().regex(/^[a-z0-9-]{4,80}$/)).max(30),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (!data.ids.length) return [];
    const sql = await db();
    const rows = await sql.query<Raw>(`${CARD_SQL} where l.status in ('published', 'sold') and l.id = any($2::text[])`, [
      data.locale,
      data.ids,
    ]);
    return rows.map(mapCard);
  });

const draftSchema = z.object({
  locale: localeSchema,
  category: categorySchema,
  condition: z.enum(["new", "used"]),
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(40),
  year: z.number().int().min(1970).max(2030),
  city: citySchema,
  priceBirr: z.string().trim().min(1).max(16),
  title: z.string().trim().min(4).max(80),
  summary: z.string().trim().min(10).max(600),
  displayName: z.string().trim().min(2).max(60),
  mileageKm: z.number().int().min(0).max(2_000_000).nullable(),
  hours: z.number().int().min(0).max(200_000).nullable(),
});

export const createDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => draftSchema.parse(input))
  .handler(async ({ data, context }) => {
    const price = etbToSantim(data.priceBirr);
    if (price === null || price <= 0) throw new Error("required");
    const sql = await db();
    await sql`
      insert into seller_profiles (user_id, display_name, city, kind, is_demo)
      values (${context.userId}, ${data.displayName}, ${data.city}, 'individual', false)
      on conflict (user_id) do update
        set display_name = excluded.display_name, city = excluded.city
    `;
    const id = crypto.randomUUID();
    const heavy = data.category === "machinery" || data.category === "agriculture";
    await sql`
      insert into listings (
        id, seller_user_id, category, status, condition, price_santim, city, year, make, model,
        mileage_km, hours, cover_path, featured, is_demo, source_locale
      ) values (
        ${id}, ${context.userId}, ${data.category}, 'draft', ${data.condition}, ${price},
        ${data.city}, ${data.year}, ${data.make}, ${data.model},
        ${heavy ? null : data.mileageKm}, ${heavy ? data.hours : null},
        ${categoryCover(data.category)}, false, false, ${data.locale}
      )
    `;
    await sql`
      insert into listing_translations (listing_id, locale, title, summary)
      values (${id}, ${data.locale}, ${data.title}, ${data.summary})
    `;
    return { id };
  });

export const listMine = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => localeSchema.parse(input))
  .handler(async ({ data: locale, context }) => {
    const sql = await db();
    const rows = await sql.query<Raw>(
      `${CARD_SQL} where l.seller_user_id = $2 order by l.updated_at desc limit 40`,
      [locale, context.userId],
    );
    const profile = await sql<{ n: number }>`
      select count(*)::int as n from seller_profiles where user_id = ${context.userId} and is_demo = false
    `;
    return { items: rows.map(mapCard), hasSeller: Number(profile[0]?.n ?? 0) > 0 };
  });

export const setListingStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().regex(/^[a-z0-9-]{4,80}$/),
        to: z.enum(["pending", "paused", "published", "sold", "archived"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    const current = await sql<{ status: string }>`
      select status from listings where id = ${data.id} and seller_user_id = ${context.userId}
    `;
    const from = current[0]?.status;
    if (!from || !isListingStatus(from) || !canSellerTransition(from, data.to)) {
      throw new Error("forbidden");
    }
    await sql`
      update listings set status = ${data.to}, updated_at = now()
      where id = ${data.id} and seller_user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

const hits = new Map<string, number[]>();

function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export const sendInquiry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        listingId: z.string().regex(/^[a-z0-9-]{4,80}$/),
        message: z.string().trim().min(10).max(800),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!allow(`inq:${context.userId}`, 8, 10 * 60 * 1000)) throw new Error("rate");
    const sql = await db();
    const rows = await sql<{ seller_user_id: string; status: string }>`
      select seller_user_id, status from listings where id = ${data.listingId}
    `;
    const listing = rows[0];
    if (!listing || (listing.status !== "published" && listing.status !== "sold")) {
      throw new Error("forbidden");
    }
    if (listing.seller_user_id === context.userId) throw new Error("own");
    const id = crypto.randomUUID();
    await sql`
      insert into inquiries (id, listing_id, buyer_user_id, message)
      values (${id}, ${data.listingId}, ${context.userId}, ${data.message})
    `;
    return { id };
  });

export const sendReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        listingId: z.string().regex(/^[a-z0-9-]{4,80}$/),
        reason: z.enum(["misleading", "scam", "other"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!allow(`rep:${context.userId}`, 6, 10 * 60 * 1000)) throw new Error("rate");
    const sql = await db();
    const id = crypto.randomUUID();
    const inserted = await sql`
      insert into reports (id, listing_id, reporter_user_id, reason)
      select ${id}, l.id, ${context.userId}, ${data.reason}
      from listings l
      where l.id = ${data.listingId} and l.status in ('published', 'sold')
      returning id
    `;
    if (!inserted.length) throw new Error("forbidden");
    return { ok: true as const };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ listingId: z.string().regex(/^[a-z0-9-]{4,80}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    const existing = await sql<{ listing_id: string }>`
      select listing_id from favorites
      where user_id = ${context.userId} and listing_id = ${data.listingId}
    `;
    if (existing.length) {
      await sql`
        delete from favorites
        where user_id = ${context.userId} and listing_id = ${data.listingId}
      `;
      return { saved: false };
    }
    await sql`
      insert into favorites (user_id, listing_id)
      select ${context.userId}, id from listings
      where id = ${data.listingId} and status in ('published', 'sold')
    `;
    return { saved: true };
  });

export const listSaved = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => localeSchema.parse(input))
  .handler(async ({ data: locale, context }) => {
    const sql = await db();
    const rows = await sql.query<Raw>(
      `${CARD_SQL}
       join favorites f on f.listing_id = l.id
       where f.user_id = $2 and l.status in ('published', 'sold')
       order by f.created_at desc`,
      [locale, context.userId],
    );
    return rows.map(mapCard);
  });

export const listInquiries = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const sent = await sql<{ id: string; message: string; title: string; listing_id: string }>`
      select i.id, i.message, coalesce(t.title, l.make) as title, i.listing_id
      from inquiries i
      join listings l on l.id = i.listing_id
      left join listing_translations t on t.listing_id = l.id and t.locale = l.source_locale
      where i.buyer_user_id = ${context.userId}
      order by i.created_at desc
      limit 20
    `;
    const received = await sql<{
      id: string;
      message: string;
      title: string;
      buyer_name: string;
    }>`
      select i.id, i.message, coalesce(t.title, l.make) as title,
             coalesce(u."name", 'Buyer') as buyer_name
      from inquiries i
      join listings l on l.id = i.listing_id
      left join listing_translations t on t.listing_id = l.id and t.locale = l.source_locale
      left join "user" u on u.id = i.buyer_user_id
      where l.seller_user_id = ${context.userId}
      order by i.created_at desc
      limit 20
    `;
    return { sent, received };
  });

export const accountFacts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const roles = await sql<{ role: string }>`
      select role from role_assignments where user_id = ${context.userId}
    `;
    const seller = await sql<{ n: number }>`
      select count(*)::int as n from seller_profiles
      where user_id = ${context.userId} and is_demo = false
    `;
    return {
      roles: roles.map((row) => row.role),
      hasSeller: Number(seller[0]?.n ?? 0) > 0,
    };
  });

export const ownsListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().regex(/^[a-z0-9-]{4,80}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    const rows = await sql<{ id: string }>`
      select id from listings where id = ${data.id} and seller_user_id = ${context.userId}
    `;
    return rows.length > 0;
  });

