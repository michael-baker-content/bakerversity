-- Reversible course-library removal. Storage objects and historical references remain intact.
begin;
alter table public.course_assets add column removed_at timestamptz;

create function public.course_asset_usage(p_course uuid,p_asset uuid) returns jsonb
language sql stable security invoker set search_path=public as $$
with target as (
 select a.* from assets a join course_assets ca on ca.asset_id=a.id
 where ca.course_id=p_course and a.id=p_asset
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
revoke all on function public.course_asset_usage(uuid,uuid) from public,anon,authenticated;
grant execute on function public.course_asset_usage(uuid,uuid) to service_role;

create function public.set_course_asset_removed(p_course uuid,p_asset uuid,p_author uuid,p_removed boolean) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare usage jsonb;
begin
 if not exists(select 1 from courses c join users u on u.id=p_author where c.id=p_course
 and (u.role='admin' or (u.role='instructor' and c.instructor_id=u.id))) then
 raise exception 'Forbidden' using errcode='42501'; end if;
 perform 1 from course_assets where course_id=p_course and asset_id=p_asset for update;
 if not found then raise exception 'Asset not found in this course.' using errcode='P0002'; end if;
 if p_removed is null then raise exception 'Choose remove or restore.'; end if;
 usage:=course_asset_usage(p_course,p_asset);
 if p_removed and exists(select 1 from jsonb_array_elements(usage->'uses') u where u->>'state'<>'Archived') then
 raise exception 'This file is still used by saved course content. Remove those references and save before removing it from the library.' using errcode='23503';
 end if;
 update course_assets set removed_at=case when p_removed then coalesce(removed_at,now()) else null end
 where course_id=p_course and asset_id=p_asset;
 return jsonb_build_object('ok',true,'removed',p_removed);
end $$;
revoke all on function public.set_course_asset_removed(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_course_asset_removed(uuid,uuid,uuid,boolean) to service_role;
-- Publishing a resource reference brings a removed library entry back into view.
create or replace function public.collect_course_asset() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.course_assets(course_id,asset_id,default_alt_text)
 select i.course_id,a.id,a.alt_text from public.course_items i,public.assets a
 where i.id=new.item_id and a.id=new.asset_id
 on conflict(course_id,asset_id) do update set removed_at=null;
 return new;
end $$;
commit;
