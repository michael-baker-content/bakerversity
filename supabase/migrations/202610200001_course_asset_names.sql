-- Names belong to a course's use of an asset, not its storage object.
begin;
alter table public.course_assets add column display_name text;
alter table public.course_assets add constraint course_asset_display_name_valid
 check (display_name is null or (char_length(display_name) between 1 and 200 and display_name = btrim(display_name) and display_name <> ''));
comment on column public.course_assets.display_name is 'Optional course-specific resource name. Null falls back to assets.title; renames affect published labels immediately.';
commit;
