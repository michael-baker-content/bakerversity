begin;
-- Questions are edited only while the assessment is unpublished. Attempts retain
-- a full snapshot even after a subsequent edit. Draft question sets are deferred.
create function public.validate_assessment_question() returns trigger language plpgsql set search_path=public as $$
declare published boolean; answer_count integer;
begin
  select is_published into published from public.assessments where id=coalesce(new.assessment_id,old.assessment_id) for update;
  if published then raise exception 'Unpublish this assessment before changing its questions.' using errcode='23514'; end if;
  if tg_op='DELETE' then return old; end if;
  if new.question_type='multiple_choice' then
    if jsonb_typeof(new.options) is distinct from 'array' then raise exception 'Multiple choice requires an options array'; end if;
    answer_count:=jsonb_array_length(new.options);
    if answer_count<2 or new.correct_answer is null or new.correct_answer !~ '^[0-9]+$' or new.correct_answer::integer>=answer_count then raise exception 'Choose a valid correct option'; end if;
  elsif new.question_type='true_false' and (new.correct_answer is null or new.correct_answer not in ('true','false')) then raise exception 'True/false requires a correct answer';
  elsif new.question_type='short_answer' then
    if jsonb_typeof(new.accepted_answers) is distinct from 'array' then raise exception 'Short answer requires accepted answers'; end if;
    if jsonb_array_length(new.accepted_answers)=0 or exists(select 1 from jsonb_array_elements(new.accepted_answers) a where jsonb_typeof(a)<>'string' or btrim(a#>>'{}')='') then raise exception 'Accepted answers must be nonempty strings'; end if;
  end if;
  return new;
end $$;
create trigger validate_question before insert or update or delete on public.assessment_questions for each row execute function public.validate_assessment_question();

create function public.save_course_classification(p_course uuid,p_author uuid,p_language text,p_difficulty text,p_objectives text[],p_terms jsonb) returns void
language plpgsql set search_path=public as $$
declare term jsonb; term_id_value uuid; term_slug text;
begin
  if not exists(select 1 from public.courses c join public.users u on u.id=p_author where c.id=p_course and (u.role='admin' or (u.role='instructor' and c.instructor_id=u.id))) then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_language !~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' then raise exception 'Enter a valid language code'; end if;
  if jsonb_typeof(p_terms)<>'array' or jsonb_array_length(p_terms)>50 then raise exception 'Invalid terms'; end if;
  update public.courses set language_code=p_language,difficulty=p_difficulty,learning_objectives=p_objectives where id=p_course;
  delete from public.course_terms where course_id=p_course;
  for term in select * from jsonb_array_elements(p_terms) loop
    term_slug:=trim(both '-' from regexp_replace(lower(btrim(term->>'name')),'[^a-z0-9]+','-','g'));
    if coalesce(term_slug,'')='' then raise exception 'Term needs a searchable name'; end if;
    insert into public.taxonomy_terms(kind,name,slug) values(term->>'kind',btrim(term->>'name'),term_slug)
      on conflict(kind,slug) do update set slug=excluded.slug returning id into term_id_value;
    insert into public.course_terms(course_id,term_id) values(p_course,term_id_value) on conflict do nothing;
  end loop;
end $$;
revoke all on function public.save_course_classification(uuid,uuid,text,text,text[],jsonb) from public,anon,authenticated;
grant execute on function public.save_course_classification(uuid,uuid,text,text,text[],jsonb) to service_role;
revoke all on function public.validate_assessment_question() from public,anon,authenticated;
grant execute on function public.validate_assessment_question() to service_role;
commit;
