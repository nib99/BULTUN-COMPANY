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

const MARKETPLACE_ADMIN_ROLES = ["admin", "super_admin", "platform_owner", "moderator"] as const;

async function requireMarketplaceAdmin(sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>, userId: string) {
  const roles = await sql<{ role: string }>`
    select role from role_assignments where user_id = ${userId}
  `;
  if (!roles.some((row) => (MARKETPLACE_ADMIN_ROLES as readonly string[]).includes(row.role))) {
    throw new Error("forbidden");
  }
}

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
  sellerName: string;
  sellerVerified: boolean;
};

export type ListingDetail = ListingCard & {
  seller: {
    userId: string;
    displayName: string;
    city: string;
    kind: "individual" | "dealer";
    isDemo: boolean;
    verified: boolean;
    verificationStatus: string;
    phone: string;
    whatsapp: string;
    website: string;
    bio: string;
    logoUrl: string;
  };
  media: { id: string; kind: "image" | "video"; url: string; sortOrder: number }[];
  owns: boolean;
};

export type SellerProfile = {
  userId: string;
  displayName: string;
  city: string;
  kind: "individual" | "dealer";
  bio: string;
  phone: string;
  whatsapp: string;
  website: string;
  logoUrl: string;
  verified: boolean;
  verificationStatus: "unverified" | "pending" | "verified";
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
  seller_user_id?: string;
  seller_name?: string;
  seller_verified?: boolean;
};

const CARD_SQL = `
  select l.id, l.category, l.condition, l.price_santim, l.city, l.year, l.make, l.model,
         l.mileage_km, l.hours, l.cover_path, l.featured, l.is_demo, l.status,
         coalesce(pref.title, src.title) as title,
         coalesce(pref.summary, src.summary) as summary,
         s.user_id as seller_user_id, s.display_name as seller_name, s.verified as seller_verified
  from listings l
  join seller_profiles s on s.user_id = l.seller_user_id
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
    sellerName: row.seller_name ?? "Seller",
    sellerVerified: Boolean(row.seller_verified),
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
        seller_user_id: string;
        seller_name: string;
        seller_city: string;
        seller_kind: string;
        seller_demo: boolean;
        seller_verified: boolean;
        seller_verification_status: string;
        seller_phone: string;
        seller_whatsapp: string;
        seller_website: string;
        seller_bio: string;
        seller_logo_url: string;
      }
    >(
      `${CARD_SQL.replace("from listings l", `, s.city as seller_city, s.kind as seller_kind, s.is_demo as seller_demo,
        s.verification_status as seller_verification_status, s.phone as seller_phone,
        s.whatsapp as seller_whatsapp, s.website as seller_website, s.bio as seller_bio, s.logo_url as seller_logo_url
        from listings l`)}
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
        verified: Boolean(row.seller_verified),
        verificationStatus: row.seller_verification_status,
        phone: row.seller_phone ?? "",
        whatsapp: row.seller_whatsapp ?? "",
        website: row.seller_website ?? "",
        bio: row.seller_bio ?? "",
        logoUrl: row.seller_logo_url ?? "",
        userId: row.seller_user_id,
      },
      media: await sql<{ id: string; kind: "image" | "video"; url: string; sort_order: number }>`
        select id, kind, url, sort_order from listing_media where listing_id = ${data.id} order by sort_order asc, created_at asc
      `.then((media) => media.map((item) => ({ id: item.id, kind: item.kind, url: item.url, sortOrder: Number(item.sort_order) }))),
    } satisfies ListingDetail;
  });


export const getSellerProfile = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ locale: localeSchema, userId: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const sql = await db();
    const profiles = await sql<SellerProfile>`
      select user_id as "userId", display_name as "displayName", city, kind, bio, phone, whatsapp,
             website, logo_url as "logoUrl", verified, verification_status as "verificationStatus"
      from seller_profiles where user_id = ${data.userId} and is_demo = false
    `;
    const profile = profiles[0];
    if (!profile) return null;
    const rows = await sql.query<Raw>(
      `${CARD_SQL} where l.seller_user_id = $2 and l.status in ('published', 'sold') order by l.featured desc, l.created_at desc limit 60`,
      [data.locale, data.userId],
    );
    return { profile, items: rows.map(mapCard) };
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
        set display_name = excluded.display_name, city = excluded.city, updated_at = now()
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
    if (data.to === "published") throw new Error("forbidden");
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

    const listingMeta = await sql<{ seller_user_id: string; title: string }>`
      select l.seller_user_id, coalesce(t.title, l.make || 'listing') as title
      from listings l
      left join listing_translations t on t.listing_id = l.id and t.locale = l.source_locale
      where l.id = ${data.listingId}
    `;
    const sellerId = listingMeta[0]?.seller_user_id;
    const title = listingMeta[0]?.title ?? "BULTUM listing";
    if (sellerId) {
      const buyer = await sql<{ name: string; email: string }>`
        select coalesce("name", 'Buyer') as name, coalesce(email, '') as email from "user" where id = ${context.userId}
      `;
      const buyerName = buyer[0]?.name ?? "Buyer";
      const baseUrl = process.env.APP_PUBLIC_URL?.trim() || "";
      const url = baseUrl ? `${baseUrl}/en/l/${data.listingId}` : `/en/l/${data.listingId}`;
      await Promise.allSettled([
        import("@/lib/notifications").then(({ notifyUser }) =>
          notifyUser(sellerId, `New BULTUM inquiry: ${title}`, `${buyerName}: ${data.message.slice(0, 180)}`, url),
        ),
        import("@/lib/notification-channels").then(({ notifyInquiryChannels }) =>
          notifyInquiryChannels({ sellerUserId: sellerId, buyerName, buyerEmail: buyer[0]?.email ?? "", title, message: data.message, url }),
        ),
      ]);
    }
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


const sellerProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  city: citySchema,
  kind: z.enum(["individual", "dealer"]),
  bio: z.string().trim().max(800).default(""),
  phone: z.string().trim().max(30).default(""),
  whatsapp: z.string().trim().max(30).default(""),
  website: z.string().trim().max(160).default(""),
  logoUrl: z.string().url().max(2000).or(z.literal("")),
});

export const getMySellerProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const rows = await sql<SellerProfile>`
      select user_id as "userId", display_name as "displayName", city, kind, bio, phone, whatsapp,
             website, logo_url as "logoUrl", verified, verification_status as "verificationStatus"
      from seller_profiles where user_id = ${context.userId} and is_demo = false
    `;
    return rows[0] ?? null;
  });

export const updateSellerProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => sellerProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    await sql`
      insert into seller_profiles (user_id, display_name, city, kind, bio, phone, whatsapp, website, logo_url, is_demo)
      values (${context.userId}, ${data.displayName}, ${data.city}, ${data.kind}, ${data.bio}, ${data.phone}, ${data.whatsapp}, ${data.website}, ${data.logoUrl}, false)
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        city = excluded.city,
        kind = excluded.kind,
        bio = excluded.bio,
        phone = excluded.phone,
        whatsapp = excluded.whatsapp,
        website = excluded.website,
        logo_url = excluded.logo_url,
        updated_at = now()
    `;
    return { ok: true as const };
  });

export const requestSellerVerification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const rows = await sql<{ user_id: string }>`select user_id from seller_profiles where user_id = ${context.userId} and is_demo = false`;
    if (!rows.length) throw new Error("profile_required");
    await sql`update seller_profiles set verification_status = 'pending', updated_at = now() where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const attachListingMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({
    listingId: z.string().regex(/^[a-z0-9-]{4,80}$/),
    media: z.array(z.object({
      kind: z.enum(["image", "video"]),
      url: z.string().url().max(3000),
      publicId: z.string().max(500).default(""),
    })).max(21),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    const owned = await sql<{ id: string }>`select id from listings where id = ${data.listingId} and seller_user_id = ${context.userId}`;
    if (!owned.length) throw new Error("forbidden");
    await sql`delete from listing_media where listing_id = ${data.listingId}`;
    for (let index = 0; index < data.media.length; index += 1) {
      const item = data.media[index];
      await sql`
        insert into listing_media (id, listing_id, kind, url, public_id, sort_order)
        values (${crypto.randomUUID()}, ${data.listingId}, ${item.kind}, ${item.url}, ${item.publicId}, ${index})
      `;
    }
    const firstImage = data.media.find((item) => item.kind === "image");
    if (firstImage) {
      await sql`update listings set cover_path = ${firstImage.url}, updated_at = now() where id = ${data.listingId}`;
    }
    return { ok: true as const };
  });

export const adminListPendingListings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ locale: localeSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    await requireMarketplaceAdmin(sql, context.userId);
    const rows = await sql.query<Raw>(
      `${CARD_SQL}
       where l.status = 'pending'
       order by l.created_at asc
       limit 100`,
      [data.locale],
    );
    return rows.map(mapCard);
  });

export const adminModerateListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({
      id: z.string().regex(/^[a-z0-9-]{4,80}$/),
      to: z.enum(["published", "archived"]),
      note: z.string().trim().max(1000).default(""),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sql = await db();
    await requireMarketplaceAdmin(sql, context.userId);

    const current = await sql<{ status: string }>`
      select status from listings where id = ${data.id}
    `;
    if (current[0]?.status !== "pending") throw new Error("invalid_transition");

    const updated = await sql<{ id: string; status: string }>`
      update listings
      set status = ${data.to},
          moderation_note = ${data.note},
          reviewed_by = ${context.userId},
          reviewed_at = now(),
          updated_at = now()
      where id = ${data.id} and status = 'pending'
      returning id, status
    `;
    if (!updated.length) throw new Error("conflict");

    return { ok: true as const, id: data.id, status: data.to };
  });

export const setSellerVerification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ userId: z.string().min(1), verified: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const sql = await db();
    const roles = await sql<{ role: string }>`select role from role_assignments where user_id = ${context.userId}`;
    if (!roles.some((row) => ["admin", "super_admin", "platform_owner", "moderator"].includes(row.role))) throw new Error("forbidden");
    await sql`update seller_profiles set verified = ${data.verified}, verification_status = ${data.verified ? "verified" : "unverified"}, updated_at = now() where user_id = ${data.userId}`;
    return { ok: true as const };
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

