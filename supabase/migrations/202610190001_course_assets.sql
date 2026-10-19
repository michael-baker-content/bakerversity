-- Course libraries organize existing storage objects; URLs remain public.
begin;
create table public.course_assets (
 course_id uuid not null references public.courses on delete cascade,
 asset_id uuid not null references public.assets on delete restrict,
 default_alt_text text,
 default_caption text,
 created_at timestamptz not null default now(),
 primary key(course_id,asset_id)
);
create index course_assets_asset on public.course_assets(asset_id);
alter table public.course_assets enable row level security;
revoke all on public.course_assets from anon, authenticated;
grant all on public.course_assets to service_role;
insert into public.course_assets(course_id,asset_id,default_alt_text)
 select distinct i.course_id,a.id,a.alt_text from public.item_assets ia
 join public.course_items i on i.id=ia.item_id join public.assets a on a.id=ia.asset_id
 on conflict do nothing;
-- Include draft and historical references that may not have published associations.
insert into public.course_assets(course_id,asset_id,default_alt_text)
 select distinct i.course_id,a.id,a.alt_text from (
 select item_id,snapshot from public.content_drafts union all
 select item_id,snapshot from public.content_revisions
 ) d join public.course_items i on i.id=d.item_id
 join public.assets a on (strpos(d.snapshot::text,a.id::text)>0
 or (a.object_path is not null and strpos(d.snapshot::text,a.object_path)>0)
 or (a.external_url is not null and strpos(d.snapshot::text,a.external_url)>0))
 on conflict do nothing;
create function public.collect_course_asset() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.course_assets(course_id,asset_id,default_alt_text)
 select i.course_id,a.id,a.alt_text from public.course_items i,public.assets a
 where i.id=new.item_id and a.id=new.asset_id on conflict do nothing;
 return new;
end $$;
revoke all on function public.collect_course_asset() from public;
create trigger collect_course_asset after insert on public.item_assets for each row execute function public.collect_course_asset();
commit;
