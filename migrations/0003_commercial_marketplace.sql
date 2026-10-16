-- BULTUM COMPANY commercial marketplace upgrade.

alter table seller_profiles add column if not exists phone text not null default '';
alter table seller_profiles add column if not exists whatsapp text not null default '';
alter table seller_profiles add column if not exists website text not null default '';
alter table seller_profiles add column if not exists logo_url text not null default '';
alter table seller_profiles add column if not exists verification_status text not null default 'unverified';
alter table seller_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists listing_media (
  id text primary key,
  listing_id text not null references listings (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null,
  public_id text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index if not exists listing_media_listing_idx on listing_media (listing_id, sort_order);

create table if not exists push_subscriptions (
  id text primary key,
  user_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

create table if not exists notification_logs (
  id text primary key,
  user_id text,
  channel text not null check (channel in ('web_push', 'telegram', 'whatsapp')),
  event text not null,
  reference_id text not null,
  status text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists notification_logs_reference_idx on notification_logs (reference_id, created_at);
