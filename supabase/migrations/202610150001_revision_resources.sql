-- Apply after the four 20261014 foundation migrations. Existing scripts stay unchanged.
-- Published resource associations now change only with save_content publication.
begin;

lock table public.course_items, public.content_drafts, public.item_assets in share row exclusive mode;

-- The old implementation did not record whether links came from a pending draft.
-- Do not guess which of those links should be public. Empty/new projects pass.
do $$ begin
  if exists(select 1 from public.item_assets a join public.content_drafts d on d.item_id=a.item_id) then
    raise exception 'Resource migration needs review: items have both pending drafts and existing resource links. No changes applied. Review those links before retrying.';
  end if;
end $$;

alter table public.item_assets add column source text not null default 'attached'
  check(source in ('attached','embedded'));
-- Existing links without pending drafts remain attached. Their historical origin
-- cannot be reconstructed, so they are never silently removed by this migration.

create function public.guard_published_resources() returns trigger
language plpgsql set search_path=public as $$
declare item uuid;
begin
  item := case when tg_op='DELETE' then old.item_id else new.item_id end;
  if current_setting('bakerversity.resource_publish_item',true) is distinct from item::text then
    raise exception 'Resources must be saved with the item draft and published through save_content.' using errcode='42501';
  end if;
  if tg_op='UPDATE' and old.item_id is distinct from new.item_id then
    raise exception 'A resource association cannot move between items';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger guard_published_resources before insert or update or delete on public.item_assets
  for each row execute function public.guard_published_resources();
revoke all on function public.guard_published_resources() from public,anon,authenticated;

create or replace function public.save_content(p_item uuid,p_author uuid,p_expected_version integer,p_patch jsonb,p_action text default 'draft') returns jsonb
language plpgsql security invoker set search_path=public as $$
declare
  i public.course_items; target_table text; old_data jsonb; prior_data jsonb; next_data jsonb;
  cols text; projection text; next_version integer; selection jsonb; resource jsonb;
  resource_id uuid; author_role text; course_owner uuid; embedded jsonb; publish_context text;
begin
  select * into strict i from public.course_items where id=p_item for update;
  select u.role,c.instructor_id into author_role,course_owner
    from public.courses c join public.users u on u.id=p_author
    where c.id=i.course_id and (u.role='admin' or (u.role='instructor' and c.instructor_id=u.id));
  if author_role is null then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_expected_version is distinct from i.version then raise exception 'This item changed in another tab. Reload before saving.' using errcode='40001'; end if;
  if i.status='archived' then raise exception 'Restore this archived item before saving'; end if;
  if p_action is null or p_action not in ('draft','publish','unpublish','restore') then raise exception 'Invalid action'; end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' then raise exception 'Content patch must be an object'; end if;
  if p_patch ?| array['id','course_id','created_at','updated_at','archived_at','is_published','position'] then raise exception 'Protected fields cannot be edited here'; end if;
  target_table := case i.kind when 'lesson' then 'lessons' when 'page' then 'course_pages' else 'assessments' end;
  execute format('select to_jsonb(t) from public.%I t where id=$1',target_table) into old_data using p_item;
  select coalesce(jsonb_agg(jsonb_build_object('asset_id',asset_id,'purpose',purpose) order by asset_id,purpose),'[]'::jsonb)
    into selection from public.item_assets where item_id=p_item and source='attached';
  old_data := old_data || jsonb_build_object('resources',selection);
  select snapshot into prior_data from public.content_drafts where item_id=p_item;
  prior_data := coalesce(prior_data,old_data);
  -- Legacy drafts without resource history retain the existing attached selection.
  if not (prior_data ? 'resources') then prior_data := prior_data || jsonb_build_object('resources',selection); end if;
  next_data := prior_data || p_patch;
  selection := next_data->'resources';
  if jsonb_typeof(selection) is distinct from 'array' then raise exception 'Resources must be an array'; end if;
  if jsonb_array_length(selection)>500 then raise exception 'An item can reference at most 500 attached resources'; end if;
  for resource in select value from jsonb_array_elements(selection) loop
    if jsonb_typeof(resource)<>'object' or jsonb_typeof(resource->'asset_id') is distinct from 'string'
      or jsonb_typeof(resource->'purpose') is distinct from 'string'
      or (resource->>'purpose') not in ('image','slides','download','starter','example','transcript','video')
      or (resource - 'asset_id' - 'purpose') <> '{}'::jsonb then
      raise exception 'Invalid resource selection';
    end if;
    resource_id := (resource->>'asset_id')::uuid;
    if not exists(select 1 from public.assets a where a.id=resource_id and
      (author_role='admin' or a.owner_id in (p_author,course_owner)
       or exists(select 1 from public.item_assets ia where ia.item_id=p_item and ia.asset_id=a.id)
       or exists(select 1 from jsonb_array_elements(prior_data->'resources') r where r->>'asset_id'=a.id::text))) then
      raise exception 'Resource not found or not available to this course' using errcode='42501';
    end if;
  end loop;
  select coalesce(jsonb_agg(r order by r->>'asset_id',r->>'purpose'),'[]'::jsonb) into selection
    from (select distinct jsonb_build_object('asset_id',(value->>'asset_id')::uuid,'purpose',value->>'purpose') r from jsonb_array_elements(selection)) resources;
  next_data := next_data || jsonb_build_object('resources',selection);

  -- Embedded files are derived from exact registered URLs, never from a path
  -- mentioned incidentally in prose. This set is recomputed on every publication.
  select coalesce(jsonb_agg(jsonb_build_object('asset_id',a.id,'purpose',case when a.mime_type like 'image/%' then 'image' else 'slides' end)),'[]'::jsonb)
    into embedded from public.assets a
    where (author_role='admin' or a.owner_id in (p_author,course_owner)
      or exists(select 1 from public.item_assets ia where ia.item_id=p_item and ia.asset_id=a.id))
    and exists(select 1 from jsonb_path_query(next_data - 'resources', '$.** ? (@.type() == "string")') value
      where (a.external_url is not null and value #>> '{}' = a.external_url)
         or (a.bucket is not null and a.object_path is not null
           and value #>> '{}' like 'https://%'
           and right(value #>> '{}',length('/storage/v1/object/public/'||a.bucket||'/'||a.object_path))='/storage/v1/object/public/'||a.bucket||'/'||a.object_path));

  insert into public.content_revisions(item_id,version,author_id,snapshot) values(p_item,i.version,p_author,old_data) on conflict(item_id,version) do nothing;
  next_version := i.version+1;
  if p_action in ('publish','unpublish') then
    next_data := next_data || jsonb_build_object('is_published',p_action='publish');
  end if;
  insert into public.content_revisions(item_id,version,author_id,snapshot) values(p_item,next_version,p_author,next_data);
  if p_action in ('publish','unpublish') then
    select string_agg(quote_ident(column_name),','),string_agg('r.'||quote_ident(column_name),',') into cols,projection
      from information_schema.columns where table_schema='public' and information_schema.columns.table_name=target_table
      and column_name not in ('id','course_id','created_at','updated_at','position','archived_at');
    execute format('update public.%I set (%s)=(select %s from jsonb_populate_record(null::public.%I,$1) r) where id=$2',target_table,cols,projection,target_table) using next_data,p_item;
    publish_context := current_setting('bakerversity.resource_publish_item',true);
    perform set_config('bakerversity.resource_publish_item',p_item::text,true);
    delete from public.item_assets where item_id=p_item;
    insert into public.item_assets(item_id,asset_id,purpose,source)
      select p_item,(r->>'asset_id')::uuid,r->>'purpose','attached' from jsonb_array_elements(selection) r;
    insert into public.item_assets(item_id,asset_id,purpose,source)
      select p_item,(r->>'asset_id')::uuid,r->>'purpose','embedded' from jsonb_array_elements(embedded) r
      on conflict(item_id,asset_id,purpose) do nothing;
    perform set_config('bakerversity.resource_publish_item',coalesce(publish_context,''),true);
    delete from public.content_drafts where item_id=p_item;
  else
    insert into public.content_drafts(item_id,snapshot,updated_by) values(p_item,next_data,p_author)
      on conflict(item_id) do update set snapshot=excluded.snapshot,updated_by=p_author,updated_at=now();
  end if;
  update public.course_items set version=next_version,published_version=case when p_action='publish' then next_version else published_version end,updated_at=now() where id=p_item;
  return jsonb_build_object('ok',true,'version',next_version);
end $$;

revoke all on function public.save_content(uuid,uuid,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_content(uuid,uuid,integer,jsonb,text) to service_role;

-- Load content, resource selections and the expected version under the same item
-- lock used by saves. Separate HTTP reads could otherwise mix different revisions.
create function public.get_authoring_content(p_item uuid,p_author uuid,p_kind text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare i public.course_items; source_data jsonb; draft_data jsonb; attachments jsonb; target_table text;
begin
  select * into i from public.course_items where id=p_item for share;
  if not found or i.kind is distinct from p_kind then return null; end if;
  if not exists(select 1 from public.courses c join public.users u on u.id=p_author
    where c.id=i.course_id and (u.role='admin' or (u.role='instructor' and c.instructor_id=u.id))) then
    raise exception 'Forbidden' using errcode='42501';
  end if;
  target_table := case i.kind when 'lesson' then 'lessons' when 'page' then 'course_pages' else 'assessments' end;
  execute format('select to_jsonb(t) from public.%I t where id=$1',target_table) into source_data using p_item;
  select snapshot into draft_data from public.content_drafts where item_id=p_item;
  select coalesce(jsonb_agg(jsonb_build_object('asset_id',asset_id,'purpose',purpose) order by asset_id,purpose),'[]'::jsonb)
    into attachments from public.item_assets where item_id=p_item and source='attached';
  return source_data || coalesce(draft_data,'{}'::jsonb) || jsonb_build_object(
    'resources',coalesce(draft_data->'resources',attachments),
    'is_published',source_data->'is_published','version',i.version,'has_draft',draft_data is not null);
end $$;
revoke all on function public.get_authoring_content(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.get_authoring_content(uuid,uuid,text) to service_role;
notify pgrst, 'reload schema';
commit;
