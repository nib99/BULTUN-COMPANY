-- BULTUM COMPANY listing moderation metadata.
-- Approval/rejection remains server-authorized; these fields provide a durable review trail.
alter table listings add column if not exists moderation_note text not null default '';
alter table listings add column if not exists reviewed_by text;
alter table listings add column if not exists reviewed_at timestamptz;

create index if not exists listings_pending_idx on listings (status, created_at desc);
