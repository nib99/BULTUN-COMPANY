-- BULTUM COMPANY marketplace foundation.
-- Money is integer santim: 1 ETB = 100 santim. Do not store birr as a float.
-- Identifiers are text (app-generated UUID or stable demo ids), not guessable sequences.

create table if not exists seller_profiles (
  user_id text primary key,
  display_name text not null,
  city text not null,
  kind text not null default 'individual' check (kind in ('individual', 'dealer')),
  bio text not null default '',
  verified boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists role_assignments (
  user_id text not null,
  role text not null check (role in ('user', 'moderator', 'admin', 'super_admin', 'platform_owner')),
  granted_by text,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists telegram_identities (
  telegram_user_id text primary key,
  user_id text not null unique,
  username text,
  linked_at timestamptz not null default now()
);

create table if not exists listings (
  id text primary key,
  seller_user_id text not null references seller_profiles (user_id),
  category text not null check (category in ('cars', 'trucks', 'machinery', 'agriculture')),
  status text not null check (status in ('draft', 'pending', 'published', 'paused', 'sold', 'archived', 'removed')),
  condition text not null check (condition in ('new', 'used')),
  price_santim bigint not null check (price_santim >= 0),
  currency text not null default 'ETB' check (currency = 'ETB'),
  city text not null,
  year integer check (year is null or (year >= 1950 and year <= 2035)),
  make text not null,
  model text not null,
  mileage_km integer check (mileage_km is null or mileage_km >= 0),
  hours integer check (hours is null or hours >= 0),
  cover_path text not null,
  featured boolean not null default false,
  is_demo boolean not null default false,
  source_locale text not null check (source_locale in ('en', 'om', 'am', 'so')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists listing_translations (
  listing_id text not null references listings (id) on delete cascade,
  locale text not null check (locale in ('en', 'om', 'am', 'so')),
  title text not null,
  summary text not null,
  primary key (listing_id, locale)
);

create table if not exists favorites (
  user_id text not null,
  listing_id text not null references listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists inquiries (
  id text primary key,
  listing_id text not null references listings (id) on delete cascade,
  buyer_user_id text not null,
  message text not null check (char_length(message) between 10 and 800),
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id text primary key,
  listing_id text not null references listings (id) on delete cascade,
  reporter_user_id text not null,
  reason text not null check (reason in ('misleading', 'scam', 'other')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists moderation_actions (
  id text primary key,
  listing_id text references listings (id) on delete set null,
  actor_user_id text not null,
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists payment_orders (
  id text primary key,
  user_id text not null,
  purpose text not null,
  amount_santim bigint not null check (amount_santim > 0),
  currency text not null default 'ETB' check (currency = 'ETB'),
  reference_code text not null unique,
  status text not null check (status in ('awaiting_payment', 'pending_review', 'approved', 'rejected', 'needs_evidence')),
  created_at timestamptz not null default now()
);

create table if not exists payment_reviews (
  id text primary key,
  order_id text not null references payment_orders (id),
  reviewer_user_id text not null,
  decision text not null check (decision in ('approved', 'rejected', 'needs_evidence')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists entitlements (
  id text primary key,
  user_id text not null,
  order_id text not null unique references payment_orders (id),
  kind text not null,
  granted_at timestamptz not null default now()
);

create table if not exists dealer_subscriptions (
  id text primary key,
  user_id text not null,
  plan text not null,
  status text not null check (status in ('inactive', 'pending', 'active', 'expired')),
  order_id text unique references payment_orders (id),
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key,
  actor_user_id text,
  action text not null,
  entity text not null,
  entity_id text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists telegram_updates (
  update_id text primary key,
  received_at timestamptz not null default now()
);

create index if not exists listings_public_idx on listings (status, category, created_at);
create index if not exists listings_seller_idx on listings (seller_user_id, status);
create index if not exists listings_city_idx on listings (city);
create index if not exists inquiries_listing_idx on inquiries (listing_id);
create index if not exists inquiries_buyer_idx on inquiries (buyer_user_id);
create index if not exists favorites_user_idx on favorites (user_id);

-- A reviewer cannot decide their own payment order.
create or replace function dalala_reject_self_review() returns trigger as $$
begin
  if exists (
    select 1 from payment_orders o
    where o.id = new.order_id and o.user_id = new.reviewer_user_id
  ) then
    raise exception 'reviewer cannot decide their own payment order';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists payment_reviews_no_self on payment_reviews;
create trigger payment_reviews_no_self
  before insert or update on payment_reviews
  for each row execute function dalala_reject_self_review();
