-- Optional course-specific asset tags. Existing library entries start untagged.
begin;
create function public.course_asset_tags_valid(value text[]) returns boolean
language sql immutable set search_path = pg_catalog as $$
 select value is not null and cardinality(value) <= 20
 and (cardinality(value)=0 or array_ndims(value)=1)
 and not exists (select 1 from unnest(value) tag where tag is null or char_length(tag) not between 1 and 50 or tag<>btrim(tag) or tag ~ '[[:cntrl:],]')
 and (select count(*) from unnest(value) tag)=(select count(distinct lower(tag)) from unnest(value) tag);
$$;
revoke all on function public.course_asset_tags_valid(text[]) from public;
grant execute on function public.course_asset_tags_valid(text[]) to service_role;
alter table public.course_assets add column tags text[] not null default '{}';
alter table public.course_assets add constraint course_asset_tags_valid check(public.course_asset_tags_valid(tags));
comment on column public.course_assets.tags is 'Optional course-specific search tags; up to 20 distinct tags of 50 characters each.';
commit;
