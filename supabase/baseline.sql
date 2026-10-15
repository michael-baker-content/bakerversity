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
