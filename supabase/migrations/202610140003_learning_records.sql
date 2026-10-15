begin;
-- All functions below are available only to the application service role.
create function public.can_learn(p_user uuid,p_course uuid) returns boolean
language sql stable set search_path=public as $$
  select exists(select 1 from public.courses c join public.users u on u.id=p_user
    where c.id=p_course and c.is_published and c.archived_at is null
    and (c.price_cents=0 or c.instructor_id=u.id or u.role='admin'
      or exists(select 1 from public.enrollments e where e.course_id=c.id and e.user_id=u.id)));
$$;

create function public.refresh_course_completion(p_user uuid,p_course uuid) returns boolean
language plpgsql set search_path=public as $$
declare required_count integer; finished boolean; evidence jsonb;
begin
  if not public.can_learn(p_user,p_course) then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_course::text,0));
  select count(*),coalesce(bool_and(case i.kind
    when 'lesson' then exists(select 1 from public.lesson_completions l where l.user_id=p_user and l.lesson_id=i.id)
    when 'page' then exists(select 1 from public.course_page_views v where v.user_id=p_user and v.course_page_id=i.id)
    when 'assessment' then exists(select 1 from public.assessment_completions a where a.user_id=p_user and a.assessment_id=i.id and a.passed)
    end),false),jsonb_agg(jsonb_build_object('item_id',i.id,'kind',i.kind,'title',i.title,'version',coalesce(i.published_version,1)))
  into required_count,finished,evidence from public.course_items i where i.course_id=p_course and i.status='published' and i.is_required;
  finished := required_count>0 and finished;
  if finished then
    insert into public.enrollments(user_id,course_id,completed_at) values(p_user,p_course,now())
      on conflict(user_id,course_id) do update set completed_at=coalesce(enrollments.completed_at,excluded.completed_at);
    insert into public.certificates(user_id,course_id,completion_snapshot)
      values(p_user,p_course,jsonb_build_object('course_title',(select title from public.courses where id=p_course),'required_items',evidence))
      on conflict(user_id,course_id) do nothing;
  else
    update public.enrollments set completed_at=null where user_id=p_user and course_id=p_course;
    -- An earned certificate remains historical evidence; revocation is explicit.
  end if;
  return finished;
end $$;

create function public.set_item_completion(p_user uuid,p_item uuid,p_complete boolean) returns boolean
language plpgsql set search_path=public as $$
declare i public.course_items;
begin
  select * into strict i from public.course_items where id=p_item and status='published';
  if not public.can_learn(p_user,i.course_id) then raise exception 'Not authorized to access this course' using errcode='42501'; end if;
  insert into public.enrollments(user_id,course_id) values(p_user,i.course_id) on conflict(user_id,course_id) do nothing;
  if i.kind='lesson' then
    if p_complete then insert into public.lesson_completions(user_id,lesson_id,course_id) values(p_user,p_item,i.course_id) on conflict(user_id,lesson_id) do nothing;
    else delete from public.lesson_completions where user_id=p_user and lesson_id=p_item; end if;
  elsif i.kind='page' then
    if p_complete then insert into public.course_page_views(user_id,course_page_id) values(p_user,p_item) on conflict(user_id,course_page_id) do nothing;
    else delete from public.course_page_views where user_id=p_user and course_page_id=p_item; end if;
  else raise exception 'Assessment completion requires a graded submission'; end if;
  perform public.refresh_course_completion(p_user,i.course_id);
  return p_complete;
end $$;

alter table public.assessment_attempts add column request_id uuid;
create unique index assessment_request_unique on public.assessment_attempts(user_id,assessment_id,request_id) where request_id is not null;
create function public.submit_assessment(p_user uuid,p_assessment uuid,p_answers jsonb,p_request uuid) returns jsonb
language plpgsql set search_path=public as $$
declare a public.assessments; q record; previous jsonb; answer text; correct boolean; results jsonb:='[]'; safe_answers jsonb:='{}'; questions jsonb:='[]'; total integer:=0; earned integer:=0; final_score integer; did_pass boolean; response jsonb;
begin
  if jsonb_typeof(p_answers)<>'object' or p_answers is null or octet_length(p_answers::text)>1000000 then raise exception 'Invalid answers'; end if;
  select * into strict a from public.assessments where id=p_assessment and is_published and archived_at is null for share;
  if not public.can_learn(p_user,a.course_id) then raise exception 'Not authorized to access this course' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_assessment::text,0));
  if p_request is not null then
    select grading_snapshot into previous from public.assessment_attempts where user_id=p_user and assessment_id=p_assessment and request_id=p_request;
    if previous is not null then return previous; end if;
  end if;
  for q in select * from public.assessment_questions where assessment_id=p_assessment order by position,id for share loop
    answer := case when jsonb_typeof(p_answers->q.id::text)='string' then btrim(p_answers->>q.id::text) else '' end;
    if length(answer)>20000 then raise exception 'Answer too long'; end if;
    safe_answers := safe_answers||jsonb_build_object(q.id::text,answer);
    questions := questions||jsonb_build_array(to_jsonb(q));
    correct := null;
    if q.question_type<>'text_response' then
      total := total+1;
      if q.question_type='short_answer' then
        select exists(select 1 from jsonb_array_elements_text(coalesce(q.accepted_answers,'[]')) v where lower(btrim(v))=lower(answer)) into correct;
      else correct := answer<>'' and answer=q.correct_answer; end if;
      if coalesce(correct,false) then earned:=earned+1; end if;
    end if;
    results:=results||jsonb_build_array(jsonb_build_object('question_id',q.id,'question_type',q.question_type,'given_answer',answer,'is_correct',correct,'correct_answer',case when q.question_type in ('multiple_choice','true_false') then q.correct_answer else null end));
  end loop;
  if jsonb_array_length(questions)=0 or (a.is_graded and total=0) then raise exception 'This assessment has no gradable questions'; end if;
  final_score := case when a.is_graded then round(100.0*earned/total)::integer else null end;
  did_pass := not a.is_graded or final_score>=a.passing_score;
  response := jsonb_build_object('score',final_score,'passed',did_pass,'passing_score',a.passing_score,'assessment_type',a.assessment_type,'is_graded',a.is_graded,'results',results);
  insert into public.enrollments(user_id,course_id) values(p_user,a.course_id) on conflict(user_id,course_id) do nothing;
  insert into public.assessment_attempts(user_id,assessment_id,answers,score,passed,question_snapshot,grading_snapshot,request_id)
    values(p_user,p_assessment,safe_answers,final_score,did_pass,questions,response,p_request);
  insert into public.assessment_completions(user_id,assessment_id,course_id,score,passed) values(p_user,p_assessment,a.course_id,final_score,did_pass)
    on conflict(user_id,assessment_id) do update set
      score=case when excluded.score is null then assessment_completions.score else greatest(assessment_completions.score,excluded.score) end,
      passed=assessment_completions.passed or excluded.passed,
      completed_at=case when coalesce(excluded.score,-1)>coalesce(assessment_completions.score,-1) or (excluded.passed and not assessment_completions.passed) then now() else assessment_completions.completed_at end;
  perform public.refresh_course_completion(p_user,a.course_id);
  return response;
end $$;

create function public.validate_feedback() returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from public.assessment_attempts a join public.assessments s on s.id=a.assessment_id
    join public.courses c on c.id=s.course_id join public.users u on u.id=new.instructor_id
    join public.assessment_questions q on q.id=new.question_id and q.assessment_id=a.assessment_id
    where a.id=new.assessment_attempt_id and a.user_id=new.student_id and
    (u.role='admin' or (u.role='instructor' and c.instructor_id=u.id))) then
    raise exception 'Feedback does not match the learner, assessment, or instructor' using errcode='23514';
  end if;
  return new;
end $$;
create trigger validate_feedback before insert or update on public.response_feedback for each row execute function public.validate_feedback();

create function public.reorder_course_items(p_course uuid,p_author uuid,p_items jsonb) returns void
language plpgsql set search_path=public as $$
declare entry jsonb; i public.course_items; t text;
begin
  if not exists(select 1 from public.courses c join public.users u on u.id=p_author where c.id=p_course and (u.role='admin' or (u.role='instructor' and c.instructor_id=u.id))) then raise exception 'Forbidden' using errcode='42501'; end if;
  if jsonb_typeof(p_items)<>'array' then raise exception 'Items must be an array'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_course::text,0));
  for entry in select * from jsonb_array_elements(p_items) loop
    select * into strict i from public.course_items where id=(entry->>'id')::uuid and course_id=p_course;
    t:=case i.kind when 'lesson' then 'lessons' when 'page' then 'course_pages' else 'assessments' end;
    execute format('update public.%I set position=$1 where id=$2',t) using (entry->>'position')::integer,i.id;
  end loop;
end $$;

do $$ declare f record; begin
  for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in ('can_learn','refresh_course_completion','set_item_completion','submit_assessment','reorder_course_items','validate_feedback','prepare_course_item','sync_course_item') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
commit;
