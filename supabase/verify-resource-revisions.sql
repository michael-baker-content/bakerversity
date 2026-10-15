-- Read-only verification after 202610150001_revision_resources.sql.
-- All rows in the first result should report true. The second reports row counts.
select 'resource source column' as check_name, exists(
  select 1 from information_schema.columns where table_schema='public' and table_name='item_assets' and column_name='source'
) as passed
union all select 'direct resource writes guarded', exists(
  select 1 from pg_trigger where tgrelid='public.item_assets'::regclass and tgname='guard_published_resources' and tgenabled='O'
)
union all select 'authoring reader installed', to_regprocedure('public.get_authoring_content(uuid,uuid,text)') is not null
union all select 'anonymous reader denied', not has_function_privilege('anon','public.get_authoring_content(uuid,uuid,text)','EXECUTE')
union all select 'authenticated reader denied', not has_function_privilege('authenticated','public.get_authoring_content(uuid,uuid,text)','EXECUTE')
union all select 'service reader allowed', has_function_privilege('service_role','public.get_authoring_content(uuid,uuid,text)','EXECUTE')
union all select 'anonymous save denied', not has_function_privilege('anon','public.save_content(uuid,uuid,integer,jsonb,text)','EXECUTE')
union all select 'authenticated save denied', not has_function_privilege('authenticated','public.save_content(uuid,uuid,integer,jsonb,text)','EXECUTE')
union all select 'service save allowed', has_function_privilege('service_role','public.save_content(uuid,uuid,integer,jsonb,text)','EXECUTE');

select (select count(*) from public.users) as accounts,
       (select count(*) from public.courses) as courses,
       (select count(*) from public.assets) as library_files,
       (select count(*) from public.item_assets) as current_associations,
       (select count(*) from public.content_drafts) as saved_drafts;
