-- Replace the built-in demo listing photos with the supplied BULTUM COMPANY photos.
-- This keeps the demo listing records/metadata intact while replacing their media.

with ranked as (
  select
    id,
    category,
    row_number() over (partition by category order by created_at asc, id asc) as rn
  from listings
  where is_demo = true
    and status = 'published'
), mapped as (
  select
    id,
    case
      when category = 'cars' and rn % 2 = 1 then '/marketplace/byd-white.jpg'
      when category = 'cars' then '/marketplace/byd-gray.jpg'
      when category in ('machinery', 'agriculture') and rn % 2 = 1 then '/marketplace/hitachi-1.jpg'
      when category in ('machinery', 'agriculture') then '/marketplace/hitachi-2.jpg'
      else null
    end as url
  from ranked
)
update listings as l
set cover_path = mapped.url,
    updated_at = now()
from mapped
where l.id = mapped.id
  and mapped.url is not null;

-- Make the listing detail gallery use the same replacement images.
delete from listing_media
where listing_id in (
  select id from listings where is_demo = true and status = 'published'
);

with ranked as (
  select
    id,
    category,
    row_number() over (partition by category order by created_at asc, id asc) as rn
  from listings
  where is_demo = true
    and status = 'published'
), mapped as (
  select
    id as listing_id,
    case
      when category = 'cars' and rn % 2 = 1 then '/marketplace/byd-white.jpg'
      when category = 'cars' then '/marketplace/byd-gray.jpg'
      when category in ('machinery', 'agriculture') and rn % 2 = 1 then '/marketplace/hitachi-1.jpg'
      when category in ('machinery', 'agriculture') then '/marketplace/hitachi-2.jpg'
      else null
    end as url
  from ranked
)
insert into listing_media (id, listing_id, kind, url, public_id, sort_order)
select
  md5(m.listing_id || ':' || m.url),
  m.listing_id,
  'image',
  m.url,
  '',
  0
from mapped as m
where m.url is not null
on conflict (id) do nothing;
