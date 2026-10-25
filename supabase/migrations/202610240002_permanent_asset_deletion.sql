begin;
create or replace function public.course_asset_usage(p_course uuid,p_asset uuid) returns jsonb
language sql stable security invoker set search_path=public as $$
with target as (
 select a.* from assets a where a.id=p_asset
), documents as (
 select i.id,i.kind,i.title,
 case when i.status='archived' then 'Archived' when i.status='published' then 'Published' else 'Saved' end as state,
 coalesce(to_jsonb(l),to_jsonb(p),to_jsonb(a)) as snapshot
 from course_items i
 left join lessons l on l.id=i.id and i.kind='lesson'
 left join course_pages p on p.id=i.id and i.kind='page'
 left join assessments a on a.id=i.id and i.kind='assessment'
 where i.course_id=p_course and (i.status in ('published','archived') or not exists(select 1 from content_drafts d where d.item_id=i.id))
 union all
 select i.id,i.kind,coalesce(d.snapshot->>'title',i.title),case when i.status='archived' then 'Archived' else 'Draft' end,d.snapshot
 from content_drafts d join course_items i on i.id=d.item_id where i.course_id=p_course
 union all
 select i.id,i.kind,i.title,case when i.status='archived' then 'Archived' when i.status='published' then 'Published' else 'Saved' end,to_jsonb(q)
 from assessment_questions q join course_items i on i.id=q.assessment_id where i.course_id=p_course
 union all
 select c.id,'course',c.title,case when c.archived_at is null then 'Saved' else 'Archived' end,to_jsonb(c) from courses c where c.id=p_course
 union all
 select m.id,'module',m.title,'Saved',to_jsonb(m) from modules m where m.course_id=p_course
 union all
 select v.id,'video',coalesce(v.title,'Video'),'Saved',to_jsonb(v) from videos v where v.course_id=p_course
 union all
 select i.id,i.kind,i.title,'Learning record',to_jsonb(attempt) from assessment_attempts attempt join course_items i on i.id=attempt.assessment_id where i.course_id=p_course
), found as (
 select distinct d.id,d.kind,d.title,d.state from documents d cross join target a
 where strpos(d.snapshot::text,a.id::text)>0
 or (a.object_path is not null and strpos(d.snapshot::text,a.object_path)>0)
 or (a.external_url is not null and strpos(d.snapshot::text,a.external_url)>0)
 union
 select i.id,i.kind,i.title,case when i.status='archived' then 'Archived' when i.status='published' then 'Published' else 'Saved' end
 from item_assets ia join course_items i on i.id=ia.item_id join target a on a.id=ia.asset_id
 where i.course_id=p_course
), history as (
 select count(*) from content_revisions r join course_items i on i.id=r.item_id cross join target a
 where i.course_id=p_course and (strpos(r.snapshot::text,a.id::text)>0
 or (a.object_path is not null and strpos(r.snapshot::text,a.object_path)>0)
 or (a.external_url is not null and strpos(r.snapshot::text,a.external_url)>0))
)
select jsonb_build_object(
 'uses',coalesce((select jsonb_agg(jsonb_build_object('item_id',id,'kind',kind,'title',title,'state',state) order by title,state) from found),'[]'::jsonb),
 'history_count',(select count from history),
 'removed',exists(select 1 from course_assets where course_id=p_course and asset_id=p_asset and removed_at is not null)
);
$$;

-- A small tombstone remains for audit/retry safety, never an asset-library entry.
create table public.asset_deletions (
 asset_id uuid primary key, title text not null, bucket text, object_path text, external_url text,
 requested_by uuid not null references public.users, requested_at timestamptz not null default now(),
 override_history boolean not null, deleted_at timestamptz
);
alter table public.asset_deletions enable row level security;
revoke all on public.asset_deletions from public,anon,authenticated;
grant all on public.asset_deletions to service_role;

create function public.asset_deletion_review(p_asset uuid) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare result jsonb; uses jsonb; histories integer; active integer; eligible timestamptz;
begin
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'removed_at',ca.removed_at) order by c.title),'[]'::jsonb),
 count(*) filter(where ca.removed_at is null),max(ca.removed_at)+interval '30 days'
 into result,active,eligible from course_assets ca join courses c on c.id=ca.course_id where ca.asset_id=p_asset;
 select coalesce(jsonb_agg(u.value || jsonb_build_object('course_id',c.id,'course_title',c.title)),'[]'::jsonb)
 into uses from courses c cross join lateral jsonb_array_elements(course_asset_usage(c.id,p_asset)->'uses') u;
 select coalesce(sum((course_asset_usage(c.id,p_asset)->>'history_count')::integer),0) into histories from courses c;
 return jsonb_build_object('courses',result,'uses',uses,'history_count',histories,'eligible_at',eligible,
 'blocked',active>0 or eligible is null or eligible>now() or exists(select 1 from jsonb_array_elements(uses) u where u->>'state'<>'Archived'));
end $$;

create function public.begin_asset_deletion(p_asset uuid,p_author uuid,p_override boolean) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare review jsonb; a assets; job asset_deletions;
begin
 if not exists(select 1 from users where id=p_author and role='admin') then raise exception 'Administrators only' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(724109);
 select * into job from asset_deletions where asset_id=p_asset;
 if found then return to_jsonb(job); end if;
 select * into a from assets where id=p_asset for update;
 if not found then raise exception 'Asset not found' using errcode='P0002'; end if;
 review:=asset_deletion_review(p_asset);
 if (review->>'blocked')::boolean then raise exception 'File must be removed from every course for 30 days and have no current content references.' using errcode='23503'; end if;
 if ((review->>'history_count')::integer>0 or jsonb_array_length(review->'uses')>0) and not coalesce(p_override,false) then
 raise exception 'Confirm that older revisions and archived content may lose this file.' using errcode='23503'; end if;
 if exists(select 1 from assets b where b.id<>a.id and ((a.external_url is not null and b.external_url=a.external_url) or (a.bucket is not null and b.bucket=a.bucket and b.object_path=a.object_path))) then
 raise exception 'Another asset record uses this file. Resolve the duplicate before deleting.' using errcode='23503'; end if;
 insert into asset_deletions(asset_id,title,bucket,object_path,external_url,requested_by,override_history)
 values(a.id,a.title,a.bucket,a.object_path,a.external_url,p_author,coalesce(p_override,false)) returning * into job;
 return to_jsonb(job);
end $$;

create function public.finish_asset_deletion(p_asset uuid,p_author uuid) returns void
language plpgsql security invoker set search_path=public as $$
declare linked uuid; prior_context text;
begin
 if not exists(select 1 from users where id=p_author and role='admin') then raise exception 'Administrators only' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(724109);
 if not exists(select 1 from asset_deletions where asset_id=p_asset) then raise exception 'Deletion has not been reserved'; end if;
 -- Active references were checked before reservation; guards prevent new references.
 prior_context:=current_setting('bakerversity.resource_publish_item',true);
 for linked in select distinct item_id from item_assets where asset_id=p_asset loop
 perform set_config('bakerversity.resource_publish_item',linked::text,true);
 delete from item_assets where asset_id=p_asset and item_id=linked;
 end loop;
 perform set_config('bakerversity.resource_publish_item',coalesce(prior_context,''),true);
 delete from course_assets where asset_id=p_asset;
 delete from assets where id=p_asset;
 update asset_deletions set deleted_at=coalesce(deleted_at,now()) where asset_id=p_asset;
end $$;

-- Serialize saves with deletion reservation. Tombstones reject stale editors trying
-- to reinsert a deleted URL, and prevent restore/reuse while storage removal retries.
create function public.guard_deleted_assets() returns trigger
language plpgsql security definer set search_path=public as $$
declare document text;
begin
 perform pg_advisory_xact_lock(724109);
 document:=to_jsonb(new)::text;
 if exists(select 1 from asset_deletions d where strpos(document,d.asset_id::text)>0
 or (d.object_path is not null and strpos(document,d.object_path)>0)
 or (d.external_url is not null and strpos(document,d.external_url)>0)) then
 raise exception 'A referenced file is being permanently deleted or has been deleted. Remove or replace it before saving.' using errcode='23503'; end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['assets','course_assets','item_assets','content_drafts','lessons','course_pages','assessments','assessment_questions','courses','modules','videos','assessment_attempts'] loop
 execute format('create trigger protect_deleted_assets before insert or update on public.%I for each row execute function public.guard_deleted_assets()',t);
 end loop;
end $$;
revoke all on function public.guard_deleted_assets() from public,anon,authenticated;
revoke all on function public.asset_deletion_review(uuid) from public,anon,authenticated;
revoke all on function public.begin_asset_deletion(uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function public.finish_asset_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.asset_deletion_review(uuid),public.begin_asset_deletion(uuid,uuid,boolean),public.finish_asset_deletion(uuid,uuid) to service_role;
commit;
