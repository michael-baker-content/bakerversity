-- GENERATED: fresh installations only. Existing projects apply supabase/migrations in order.
-- Regenerate with npm run db:generate.
-- ============================================================
-- Bakerversity — Supabase Schema (current as of May 2026, migration 005)
-- ============================================================
-- Run this in Supabase SQL Editor on a fresh project.
-- Extensions, tables, indexes, RLS policies, and grants
-- are all included. Run in one pass.
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- CUSTOM TYPES
-- ============================================================
create type course_page_type as enum (
  'custom', 'overview', 'introduction', 'syllabus', 'requirements', 'resources'
);

-- ============================================================
-- USERS
-- ============================================================
create table users (
  id          uuid primary key default gen_random_uuid(),
  clerk_id    text unique not null,
  email       text unique not null,
  full_name   text,
  avatar_url  text,
  role        text not null default 'student'
                check (role in ('student', 'instructor', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- COURSES
-- ============================================================
create table courses (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references users(id) on delete restrict,
  title         text not null,
  slug          text unique not null,
  description   text,
  price_cents   integer not null default 0,
  currency      text not null default 'usd',
  is_published  boolean not null default false,
  is_public     boolean not null default false,
  thumbnail_url text,
  intro_description text,
  conclusion_description text,
  editor_tools  text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- MODULES
-- ============================================================
create table modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  title       text not null,
  description text,
  slug        text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- VIDEOS
-- ============================================================
create table videos (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references courses(id) on delete cascade,
  title         text,
  description   text,
  url           text not null,
  thumbnail_url text,
  duration_secs integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- LESSONS
-- ============================================================
create table lessons (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references courses(id) on delete cascade,
  module_id     uuid references modules(id) on delete set null,
  title         text not null,
  content       jsonb,
  position      integer not null default 0,
  youtube_url   text,
  slides_url    text,
  slides_meta   jsonb,
  introduction  text,
  slug          text,
  video_id      uuid references videos(id) on delete set null,
  lesson_type   text not null default 'standard'
                  check (lesson_type in ('standard', 'video')),
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- COURSE PAGES
-- ============================================================
create table course_pages (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references courses(id) on delete cascade,
  module_id    uuid references modules(id) on delete set null,
  page_type    course_page_type not null default 'custom',
  title        text not null,
  slug         text,
  content      jsonb,
  introduction text,
  video_id     uuid references videos(id) on delete set null,
  position     integer not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- COURSE PAGE VIEWS
-- ============================================================
create table course_page_views (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  course_page_id uuid not null references course_pages(id) on delete cascade,
  viewed_at      timestamptz not null default now(),
  unique (user_id, course_page_id)
);

-- ============================================================
-- ASSESSMENTS
-- Quizzes, exams, and practice sets as first-class sequence
-- items. Replaces the old lesson-attached quizzes model.
--
-- assessment_type:
--   'quiz'     — short graded check within a module
--   'exam'     — longer graded assessment, end of module/course
--   'practice' — ungraded; infinite attempts, no score recorded
--
-- is_graded: false for practice assessments.
-- intro_content: optional TipTap JSON preamble shown before questions.
-- ============================================================
create table assessments (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references courses(id) on delete cascade,
  module_id       uuid references modules(id) on delete set null,
  title           text not null,
  slug            text,
  assessment_type text not null default 'quiz'
                    check (assessment_type in ('quiz', 'exam', 'practice')),
  is_graded       boolean not null default true,
  passing_score   integer not null default 70
                    check (passing_score between 0 and 100),
  intro_content   jsonb,
  position        integer not null default 0,
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- ASSESSMENT QUESTIONS
-- Questions belong directly to an assessment (no intermediate
-- quiz table). Supports four question types:
--
--   multiple_choice — auto-graded by index string match
--   true_false      — auto-graded ('true'/'false')
--   short_answer    — auto-graded; accepted_answers stores all
--                     valid responses pre-normalised (trimmed,
--                     lowercased) at write time
--   text_response   — never graded; optional reflection prompt
--
-- content / explanation_content: TipTap JSON for rich bodies.
-- question_text / explanation: plain-text fallbacks.
-- At least one of content or question_text must be non-null
-- (enforced by the question_has_body check constraint).
-- ============================================================
create table assessment_questions (
  id                  uuid primary key default gen_random_uuid(),
  assessment_id       uuid not null references assessments(id) on delete cascade,
  question_type       text not null default 'multiple_choice'
                        check (question_type in (
                          'multiple_choice',
                          'true_false',
                          'short_answer',
                          'text_response'
                        )),
  content             jsonb,
  question_text       text,
  options             jsonb,
  correct_answer      text,
  accepted_answers    jsonb,
  explanation_content jsonb,
  explanation         text,
  position            integer not null default 0,
  created_at          timestamptz not null default now(),
  constraint question_has_body check (content is not null or question_text is not null)
);

-- ============================================================
-- ASSESSMENT ATTEMPTS
-- One row per submission. Infinite retakes allowed.
-- answers: { question_id: answer_string }
-- score: percentage of graded questions correct (0–100).
-- text_response questions are excluded from score calculation.
-- ============================================================
create table assessment_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  assessment_id uuid not null references assessments(id) on delete cascade,
  answers       jsonb not null,
  score         integer not null check (score between 0 and 100),
  passed        boolean not null,
  attempted_at  timestamptz not null default now()
);

-- ============================================================
-- ASSESSMENT COMPLETIONS
-- One row per student per assessment; updated on best score.
-- Best-score-wins: upserted whenever a new attempt beats the
-- stored score. Practice assessments always pass (passed=true).
-- ============================================================
create table assessment_completions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  assessment_id uuid not null references assessments(id) on delete cascade,
  course_id     uuid not null references courses(id) on delete cascade,
  passed        boolean not null default false,
  score         integer,
  completed_at  timestamptz not null default now(),
  unique (user_id, assessment_id)
);

-- ============================================================
-- ENROLLMENTS
-- ============================================================
create table enrollments (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references users(id) on delete cascade,
  course_id                 uuid not null references courses(id) on delete cascade,
  stripe_payment_intent_id  text unique,
  enrolled_at               timestamptz not null default now(),
  completed_at              timestamptz,
  unique (user_id, course_id)
);

-- ============================================================
-- LESSON COMPLETIONS
-- Student-initiated mark complete per lesson.
-- ============================================================
create table lesson_completions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  lesson_id    uuid not null references lessons(id) on delete cascade,
  course_id    uuid not null references courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- ============================================================
-- LESSON PROGRESS (legacy — retained for backward compat)
-- ============================================================
create table lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  lesson_id    uuid not null references lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- ============================================================
-- CERTIFICATES
-- ============================================================
create table certificates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  course_id       uuid not null references courses(id) on delete cascade,
  certificate_url text,
  issued_at       timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ============================================================
-- RESPONSE FEEDBACK
-- Instructor feedback on text_response quiz answers.
-- Now references assessment_attempts instead of quiz_attempts.
-- ============================================================
create table response_feedback (
  id                   uuid primary key default gen_random_uuid(),
  instructor_id        uuid not null references users(id) on delete cascade,
  student_id           uuid not null references users(id) on delete cascade,
  assessment_attempt_id uuid not null references assessment_attempts(id) on delete cascade,
  question_id          uuid not null references assessment_questions(id) on delete cascade,
  feedback_text        text not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (assessment_attempt_id, question_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on courses (instructor_id);
create index on courses (slug);
create index on modules (course_id, position);
create unique index on modules (course_id, slug);
create index on lessons (course_id, position);
create index on lessons (module_id);
create index on lessons (course_id, slug);
create index on course_pages (course_id, position);
create index on course_pages (module_id);
create index on course_page_views (user_id);
create index on assessments (course_id, position);
create index on assessments (module_id);
create unique index on assessments (course_id, slug) where slug is not null;
create index on assessment_questions (assessment_id, position);
create index on assessment_attempts (user_id, assessment_id);
create index on assessment_completions (user_id, course_id);
create index on assessment_completions (assessment_id);
create index on enrollments (user_id);
create index on enrollments (course_id);
create index on lesson_completions (user_id, course_id);
create index on lesson_completions (lesson_id);
create index on lesson_progress (user_id);
create index on certificates (user_id);
create index on response_feedback (instructor_id);
create index on response_feedback (student_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on users
  for each row execute function set_updated_at();
create trigger set_updated_at before update on courses
  for each row execute function set_updated_at();
create trigger set_updated_at before update on modules
  for each row execute function set_updated_at();
create trigger set_updated_at before update on lessons
  for each row execute function set_updated_at();
create trigger set_updated_at before update on assessments
  for each row execute function set_updated_at();
create trigger set_updated_at before update on course_pages
  for each row execute function set_updated_at();
create trigger set_updated_at before update on response_feedback
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table users                 enable row level security;
alter table courses               enable row level security;
alter table modules               enable row level security;
alter table lessons               enable row level security;
alter table course_pages          enable row level security;
alter table course_page_views     enable row level security;
alter table assessments           enable row level security;
alter table assessment_questions  enable row level security;
alter table assessment_attempts   enable row level security;
alter table assessment_completions enable row level security;
alter table enrollments           enable row level security;
alter table lesson_completions    enable row level security;
alter table lesson_progress       enable row level security;
alter table certificates          enable row level security;
alter table response_feedback     enable row level security;
alter table videos                enable row level security;

create policy "users: read own" on users
  for select using (auth.uid()::text = clerk_id);

create policy "courses: read published" on courses
  for select using (is_published = true);

create policy "modules: read published" on modules
  for select using (
    exists (select 1 from courses c where c.id = modules.course_id and c.is_published = true)
  );

create policy "lessons: read published" on lessons
  for select using (
    is_published = true and
    exists (select 1 from courses c where c.id = lessons.course_id and c.is_published = true)
  );

create policy "course_pages: read published" on course_pages
  for select using (
    is_published = true and
    exists (select 1 from courses c where c.id = course_pages.course_id and c.is_published = true)
  );

create policy "course_page_views: read own" on course_page_views
  for select using (user_id = (select id from users where clerk_id = auth.uid()::text));
create policy "course_page_views: insert own" on course_page_views
  for insert with check (user_id = (select id from users where clerk_id = auth.uid()::text));

create policy "assessments: read published" on assessments
  for select using (
    is_published = true and
    exists (select 1 from courses c where c.id = assessments.course_id and c.is_published = true)
  );

create policy "assessment_questions: read for published assessment" on assessment_questions
  for select using (
    exists (
      select 1 from assessments a
      join courses c on c.id = a.course_id
      where a.id = assessment_questions.assessment_id
        and a.is_published = true
        and c.is_published = true
    )
  );

create policy "assessment_attempts: read own" on assessment_attempts
  for select using (user_id = (select id from users where clerk_id = auth.uid()::text));
create policy "assessment_attempts: insert own" on assessment_attempts
  for insert with check (user_id = (select id from users where clerk_id = auth.uid()::text));

create policy "assessment_completions: read own" on assessment_completions
  for select using (user_id = (select id from users where clerk_id = auth.uid()::text));
create policy "assessment_completions: insert own" on assessment_completions
  for insert with check (user_id = (select id from users where clerk_id = auth.uid()::text));

create policy "enrollments: read own" on enrollments
  for select using (user_id = (select id from users where clerk_id = auth.uid()::text));

create policy "lesson_completions: read own" on lesson_completions
  for select using (user_id = (select id from users where clerk_id = auth.uid()::text));
create policy "lesson_completions: insert own" on lesson_completions
  for insert with check (user_id = (select id from users where clerk_id = auth.uid()::text));
create policy "lesson_completions: delete own" on lesson_completions
  for delete using (user_id = (select id from users where clerk_id = auth.uid()::text));

create policy "lesson_progress: read own" on lesson_progress
  for select using (user_id = (select id from users where clerk_id = auth.uid()::text));
create policy "lesson_progress: insert own" on lesson_progress
  for insert with check (user_id = (select id from users where clerk_id = auth.uid()::text));

create policy "certificates: read own" on certificates
  for select using (user_id = (select id from users where clerk_id = auth.uid()::text));

create policy "response_feedback: read own" on response_feedback
  for select using (student_id = (select id from users where clerk_id = auth.uid()::text));

-- ============================================================
-- GRANTS
-- ============================================================
grant select                         on courses               to anon, authenticated;
grant select, insert, update, delete on courses               to service_role;

grant select                         on modules               to anon, authenticated;
grant select, insert, update, delete on modules               to service_role;

grant select                         on lessons               to anon, authenticated;
grant select, insert, update, delete on lessons               to service_role;

grant select                         on course_pages          to anon, authenticated;
grant select, insert, update, delete on course_pages          to service_role;

grant select, insert                 on course_page_views     to authenticated;
grant select, insert, update, delete on course_page_views     to service_role;

grant select                         on videos                to anon, authenticated;
grant select, insert, update, delete on videos                to service_role;

grant select                         on assessments           to anon, authenticated;
grant select, insert, update, delete on assessments           to service_role;

grant select                         on assessment_questions  to authenticated;
grant select, insert, update, delete on assessment_questions  to service_role;

grant select, insert                 on assessment_attempts   to authenticated;
grant select, insert, update, delete on assessment_attempts   to service_role;

grant select, insert                 on assessment_completions to authenticated;
grant select, insert, update, delete on assessment_completions to service_role;

grant select                         on users                 to authenticated;
grant select, insert, update, delete on users                 to service_role;

grant select                         on enrollments           to authenticated;
grant select, insert, update, delete on enrollments           to service_role;

grant select, insert, delete         on lesson_completions    to authenticated;
grant select, insert, update, delete on lesson_completions    to service_role;

grant select, insert                 on lesson_progress       to authenticated;
grant select, insert, update, delete on lesson_progress       to service_role;

grant select                         on certificates          to authenticated;
grant select, insert, update, delete on certificates          to service_role;

grant select                         on response_feedback     to authenticated;
grant select, insert, update, delete on response_feedback     to service_role;

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

begin;
-- All application writes run through authenticated server routes. Public clients
-- retain only published catalogue metadata, never answer keys or learner writes.
do $$ declare t text; begin
  foreach t in array array['users','modules','lessons','videos','course_pages','course_page_views','assessments','assessment_questions','assessment_attempts','assessment_completions','enrollments','lesson_completions','certificates','response_feedback','lesson_progress'] loop
    if to_regclass('public.'||t) is not null then
      execute format('revoke all on public.%I from anon, authenticated',t);
    end if;
  end loop;
end $$;

alter table public.courses add column archived_at timestamptz;
alter table public.courses add column language_code text not null default 'en';
alter table public.courses add column difficulty text not null default 'introductory' check (difficulty in ('introductory','intermediate','advanced'));
alter table public.courses add column learning_objectives text[] not null default '{}';
alter table public.courses add constraint courses_price_valid check (price_cents >= 0 and (not is_public or price_cents=0));
alter table public.courses add constraint courses_currency_valid check (currency ~ '^[a-z]{3}$');
alter table public.courses add constraint courses_archive_valid check (archived_at is null or not is_published);
alter table public.courses add constraint courses_title_valid check (length(btrim(title))>0);
alter table public.modules add constraint modules_id_course_unique unique(id,course_id);
alter table public.modules add constraint modules_position_valid check(position>=0);
alter table public.lessons add constraint lessons_id_course_unique unique(id,course_id);
alter table public.assessments add constraint assessments_id_course_unique unique(id,course_id);
alter table public.lesson_completions add constraint completion_lesson_course_fk foreign key(lesson_id,course_id) references public.lessons(id,course_id) on delete cascade;
alter table public.assessment_completions add constraint completion_assessment_course_fk foreign key(assessment_id,course_id) references public.assessments(id,course_id) on delete cascade;
alter table public.assessment_completions add constraint completion_score_valid check(score between 0 and 100);
alter table public.assessment_attempts alter column score drop not null;
alter table public.assessment_attempts add column question_snapshot jsonb not null default '[]';
alter table public.assessment_attempts add column grading_snapshot jsonb not null default '{}';
alter table public.assessment_questions add column updated_at timestamptz not null default now();
create trigger set_updated_at before update on public.assessment_questions for each row execute function public.set_updated_at();
alter table public.assessments add constraint practice_not_graded check(assessment_type <> 'practice' or not is_graded);
alter table public.certificates add column completion_snapshot jsonb not null default '{}';
alter table public.certificates add column revoked_at timestamptz;

-- A registry unifies navigation, metadata, revisions and assets while preserving
-- the existing lesson/page/assessment APIs. Subtype triggers maintain its mirrors.
create table public.course_items (
  id uuid primary key,
  course_id uuid not null references public.courses on delete cascade,
  module_id uuid,
  kind text not null check(kind in ('lesson','page','assessment')),
  lesson_id uuid unique references public.lessons on delete cascade,
  page_id uuid unique references public.course_pages on delete cascade,
  assessment_id uuid unique references public.assessments on delete cascade,
  title text not null check(length(btrim(title))>0),
  slug text,
  position integer not null check(position>=0),
  placement text not null check(placement in ('introduction','body','conclusion')),
  is_required boolean not null,
  estimated_minutes integer check(estimated_minutes>0),
  activity_type text not null check(activity_type in ('explanation','tutorial','lab','reference','reflection','assessment')),
  status text not null check(status in ('draft','published','archived')),
  version integer not null default 1,
  published_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(module_id,course_id) references public.modules(id,course_id),
  unique(course_id,kind,slug),
  constraint item_source_valid check (
    (kind='lesson' and lesson_id=id and page_id is null and assessment_id is null) or
    (kind='page' and page_id=id and lesson_id is null and assessment_id is null) or
    (kind='assessment' and assessment_id=id and page_id is null and lesson_id is null)
  )
);
create index course_items_sequence on public.course_items(course_id,module_id,placement,position,id);

do $$ declare t text; begin
  foreach t in array array['lessons','course_pages','assessments'] loop
    execute format('alter table public.%I add column is_required boolean not null default %s',t,case when t='course_pages' then 'false' else 'true' end);
    execute format('alter table public.%I add column estimated_minutes integer check(estimated_minutes>0)',t);
    execute format('alter table public.%I add column activity_type text not null default %L check(activity_type in (''explanation'',''tutorial'',''lab'',''reference'',''reflection'',''assessment''))',t,case when t='assessments' then 'assessment' when t='course_pages' then 'reference' else 'explanation' end);
    execute format('alter table public.%I add column placement text check(placement in (''introduction'',''body'',''conclusion''))',t);
    execute format('alter table public.%I add column archived_at timestamptz',t);
    execute format('alter table public.%I add constraint %I check(archived_at is null or not is_published)',t,t||'_archive_valid');
    execute format('alter table public.%I add constraint %I foreign key(module_id,course_id) references public.modules(id,course_id)',t,t||'_module_course_fk');
    execute format('alter table public.%I add constraint %I check(position>=0 and length(btrim(title))>0)',t,t||'_values_valid');
    execute format('create unique index %I on public.%I(course_id,slug) where slug is not null',t||'_slug_unique',t);
  end loop;
end $$;

create function public.prepare_course_item() returns trigger language plpgsql set search_path=public as $$
begin
  if new.placement is null then
    new.placement := case when tg_table_name='course_pages' and new.module_id is null then
      case when to_jsonb(new)->>'page_type' in ('overview','introduction','syllabus','requirements') then 'introduction' else 'conclusion' end
      else 'body' end;
  end if;
  if new.module_id is not null then new.placement := 'body'; end if;
  if tg_op='INSERT' then
    -- Serialize appends to prevent overlapping positions across content kinds.
    perform pg_advisory_xact_lock(hashtextextended(new.course_id::text,0));
    select coalesce(max(position),-1)+1 into new.position from public.course_items
      where course_id=new.course_id and module_id is not distinct from new.module_id and placement=new.placement;
  end if;
  return new;
end $$;
create function public.sync_course_item() returns trigger language plpgsql set search_path=public as $$
declare k text := case tg_table_name when 'lessons' then 'lesson' when 'course_pages' then 'page' else 'assessment' end;
begin
  insert into public.course_items(id,course_id,module_id,kind,lesson_id,page_id,assessment_id,title,slug,position,placement,is_required,estimated_minutes,activity_type,status)
  values(new.id,new.course_id,new.module_id,k,case when k='lesson' then new.id end,case when k='page' then new.id end,case when k='assessment' then new.id end,new.title,new.slug,new.position,new.placement,new.is_required,new.estimated_minutes,new.activity_type,case when new.archived_at is not null then 'archived' when new.is_published then 'published' else 'draft' end)
  on conflict(id) do update set module_id=excluded.module_id,title=excluded.title,slug=excluded.slug,position=excluded.position,placement=excluded.placement,is_required=excluded.is_required,estimated_minutes=excluded.estimated_minutes,activity_type=excluded.activity_type,status=excluded.status,updated_at=now();
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['lessons','course_pages','assessments'] loop
    execute format('create trigger prepare_item before insert or update on public.%I for each row execute function public.prepare_course_item()',t);
    execute format('create trigger sync_item after insert or update on public.%I for each row execute function public.sync_course_item()',t);
    execute format('update public.%I set placement=null',t);
  end loop;
end $$;

create table public.taxonomy_terms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('category','topic','tool')),
  name text not null check(length(btrim(name))>0),
  slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  unique(kind,slug)
);
create table public.course_terms (
  course_id uuid not null references public.courses on delete cascade,
  term_id uuid not null references public.taxonomy_terms on delete cascade,
  primary key(course_id,term_id)
);
create table public.item_terms (
  item_id uuid not null references public.course_items on delete cascade,
  term_id uuid not null references public.taxonomy_terms on delete cascade,
  primary key(item_id,term_id)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users on delete restrict,
  title text not null,
  original_filename text,
  mime_type text,
  byte_size bigint check(byte_size>=0),
  bucket text,
  object_path text,
  external_url text,
  alt_text text,
  attribution jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bucket,object_path),
  check((bucket is not null and object_path is not null and external_url is null) or (bucket is null and object_path is null and external_url ~ '^https://'))
);
create table public.item_assets (
  item_id uuid not null references public.course_items on delete cascade,
  asset_id uuid not null references public.assets on delete restrict,
  purpose text not null default 'download' check(purpose in ('image','slides','download','starter','example','transcript','video')),
  primary key(item_id,asset_id,purpose)
);
create table public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.course_items on delete cascade,
  version integer not null,
  author_id uuid references public.users on delete set null,
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  created_at timestamptz not null default now(),
  unique(item_id,version)
);
create table public.content_drafts (
  item_id uuid primary key references public.course_items on delete cascade,
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  updated_by uuid references public.users on delete set null,
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.assets for each row execute function public.set_updated_at();

-- Trusted-server RPC: locks a single item and rejects stale editor tabs. Drafts
-- do not alter the legacy published record consumed by learner pages.
create function public.save_content(p_item uuid,p_author uuid,p_expected_version integer,p_patch jsonb,p_action text default 'draft') returns jsonb
language plpgsql security invoker set search_path=public as $$
declare i public.course_items; target_table text; old_data jsonb; next_data jsonb; cols text; projection text; next_version integer;
begin
  select * into strict i from public.course_items where id=p_item for update;
  if not exists(select 1 from public.courses c join public.users u on u.id=p_author where c.id=i.course_id and (u.role='admin' or (u.role='instructor' and c.instructor_id=u.id))) then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_expected_version is distinct from i.version then raise exception 'This item changed in another tab. Reload before saving.' using errcode='40001'; end if;
  if p_action not in ('draft','publish','unpublish','restore') then raise exception 'Invalid action'; end if;
  if p_patch ?| array['id','course_id','created_at','updated_at','archived_at','is_published','position'] then raise exception 'Protected fields cannot be edited here'; end if;
  target_table := case i.kind when 'lesson' then 'lessons' when 'page' then 'course_pages' else 'assessments' end;
  execute format('select to_jsonb(t) from public.%I t where id=$1',target_table) into old_data using p_item;
  select coalesce(snapshot,old_data) into next_data from public.content_drafts where item_id=p_item;
  next_data := coalesce(next_data,old_data)||p_patch;
  insert into public.content_revisions(item_id,version,author_id,snapshot) values(p_item,i.version,p_author,old_data) on conflict(item_id,version) do nothing;
  next_version := i.version+1;
  insert into public.content_revisions(item_id,version,author_id,snapshot) values(p_item,next_version,p_author,next_data);
  if p_action in ('publish','unpublish') then
    next_data := next_data || jsonb_build_object('is_published',p_action='publish');
    select string_agg(quote_ident(column_name),','),string_agg('r.'||quote_ident(column_name),',') into cols,projection
      from information_schema.columns where table_schema='public' and information_schema.columns.table_name=target_table
      and column_name not in ('id','course_id','created_at','updated_at','position','archived_at');
    execute format('update public.%I set (%s)=(select %s from jsonb_populate_record(null::public.%I,$1) r) where id=$2',target_table,cols,projection,target_table) using next_data,p_item;
    delete from public.content_drafts where item_id=p_item;
  else
    insert into public.content_drafts(item_id,snapshot,updated_by) values(p_item,next_data,p_author)
      on conflict(item_id) do update set snapshot=excluded.snapshot,updated_by=p_author,updated_at=now();
    -- New unpublished items remain visible and editable in the existing editor.
  end if;
  update public.course_items set version=next_version,published_version=case when p_action='publish' then next_version else published_version end,updated_at=now() where id=p_item;
  insert into public.item_assets(item_id,asset_id,purpose)
    select p_item,a.id,case when a.mime_type like 'image/%' then 'image' else 'slides' end from public.assets a
    where a.object_path is not null and position(a.object_path in next_data::text)>0
    on conflict do nothing;
  return jsonb_build_object('ok',true,'version',next_version);
end $$;

-- Strict server-only access for new tables and RPCs. Account records/roles unchanged.
do $$ declare t text; begin
  foreach t in array array['course_items','taxonomy_terms','course_terms','item_terms','assets','item_assets','content_revisions','content_drafts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;
revoke all on function public.save_content(uuid,uuid,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_content(uuid,uuid,integer,jsonb,text) to service_role;
commit;


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

-- Course libraries organize existing storage objects; URLs remain public.
begin;
create table public.course_assets (
 course_id uuid not null references public.courses on delete cascade,
 asset_id uuid not null references public.assets on delete restrict,
 default_alt_text text,
 default_caption text,
 created_at timestamptz not null default now(),
 primary key(course_id,asset_id)
);
create index course_assets_asset on public.course_assets(asset_id);
alter table public.course_assets enable row level security;
revoke all on public.course_assets from anon, authenticated;
grant all on public.course_assets to service_role;
insert into public.course_assets(course_id,asset_id,default_alt_text)
 select distinct i.course_id,a.id,a.alt_text from public.item_assets ia
 join public.course_items i on i.id=ia.item_id join public.assets a on a.id=ia.asset_id
 on conflict do nothing;
-- Include draft and historical references that may not have published associations.
insert into public.course_assets(course_id,asset_id,default_alt_text)
 select distinct i.course_id,a.id,a.alt_text from (
 select item_id,snapshot from public.content_drafts union all
 select item_id,snapshot from public.content_revisions
 ) d join public.course_items i on i.id=d.item_id
 join public.assets a on (strpos(d.snapshot::text,a.id::text)>0
 or (a.object_path is not null and strpos(d.snapshot::text,a.object_path)>0)
 or (a.external_url is not null and strpos(d.snapshot::text,a.external_url)>0))
 on conflict do nothing;
create function public.collect_course_asset() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.course_assets(course_id,asset_id,default_alt_text)
 select i.course_id,a.id,a.alt_text from public.course_items i,public.assets a
 where i.id=new.item_id and a.id=new.asset_id on conflict do nothing;
 return new;
end $$;
revoke all on function public.collect_course_asset() from public;
create trigger collect_course_asset after insert on public.item_assets for each row execute function public.collect_course_asset();
commit;

-- Names belong to a course's use of an asset, not its storage object.
begin;
alter table public.course_assets add column display_name text;
alter table public.course_assets add constraint course_asset_display_name_valid
 check (display_name is null or (char_length(display_name) between 1 and 200 and display_name = btrim(display_name) and display_name <> ''));
comment on column public.course_assets.display_name is 'Optional course-specific resource name. Null falls back to assets.title; renames affect published labels immediately.';
commit;
