-- Run once against the existing Bakerversity database. Account data is untouched.
begin;
alter type public.course_page_type add value if not exists 'conclusion';
alter table public.courses add column if not exists thumbnail_attribution jsonb;
alter table public.videos add column if not exists source_type text not null default 'external';
do $$
declare c record;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='response_feedback' and column_name='quiz_attempt_id') then
    for c in select conname from pg_constraint where conrelid='public.response_feedback'::regclass and contype='f' and pg_get_constraintdef(oid) like '%quiz_attempt_id%' loop
      execute format('alter table public.response_feedback drop constraint %I', c.conname);
    end loop;
    alter table public.response_feedback rename column quiz_attempt_id to assessment_attempt_id;
    alter table public.response_feedback add constraint response_feedback_attempt_fk foreign key (assessment_attempt_id) references public.assessment_attempts(id) on delete cascade;
  end if;
end $$;
-- Consolidate retired completion records before removing the obsolete table.
do $$ begin
  if to_regclass('public.lesson_progress') is not null then
    insert into public.lesson_completions(user_id,lesson_id,course_id,completed_at)
      select p.user_id,p.lesson_id,l.course_id,p.completed_at from public.lesson_progress p join public.lessons l on l.id=p.lesson_id
      on conflict(user_id,lesson_id) do nothing;
    drop table public.lesson_progress;
  end if;
end $$;
commit;
