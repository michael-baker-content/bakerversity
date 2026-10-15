-- Read-only checks after all four migrations.
select count(*) as preserved_accounts,
       count(*) filter (where role='instructor') as instructors
from public.users; -- Expected: 3 accounts, 1 instructor for the reset project.

select table_name from information_schema.tables where table_schema='public'
and table_name in ('course_items','taxonomy_terms','course_terms','item_terms','assets','item_assets','content_revisions','content_drafts') order by table_name;
-- Expected: all eight tables.

select column_name from information_schema.columns where table_schema='public'
and table_name='response_feedback' and column_name in ('quiz_attempt_id','assessment_attempt_id');
-- Expected: assessment_attempt_id only.

select has_table_privilege('anon','courses','SELECT') as public_catalogue,
       has_table_privilege('authenticated','assessment_questions','SELECT') as browser_answer_keys,
       has_function_privilege('authenticated','public.submit_assessment(uuid,uuid,jsonb,uuid)','EXECUTE') as browser_grading,
       has_function_privilege('service_role','public.submit_assessment(uuid,uuid,jsonb,uuid)','EXECUTE') as server_grading;
-- Expected: true, false, false, true.

select count(*) as courses from public.courses; -- Expected: 0 until authoring begins.
select count(*) as shared_items from public.course_items; -- Expected: 0.
