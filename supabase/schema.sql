-- ============================================================
-- Bakerversity — Supabase Schema (current as of May 2026)
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
                  check (lesson_type in ('standard', 'video', 'quiz')),
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
-- QUIZZES
-- ============================================================
create table quizzes (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid unique not null references lessons(id) on delete cascade,
  module_id     uuid references modules(id) on delete cascade,
  title         text not null default 'Lesson Quiz',
  passing_score integer not null default 70
                  check (passing_score between 0 and 100),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
create table quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references quizzes(id) on delete cascade,
  question_text  text not null,
  question_type  text not null default 'multiple_choice'
                   check (question_type in ('multiple_choice', 'true_false')),
  options        jsonb,
  correct_answer text not null,
  explanation    text,
  position       integer not null default 0,
  created_at     timestamptz not null default now()
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
-- QUIZ ATTEMPTS
-- ============================================================
create table quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  quiz_id      uuid not null references quizzes(id) on delete cascade,
  answers      jsonb not null,
  score        integer not null check (score between 0 and 100),
  passed       boolean not null,
  attempted_at timestamptz not null default now()
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
-- ============================================================
create table response_feedback (
  id              uuid primary key default gen_random_uuid(),
  instructor_id   uuid not null references users(id) on delete cascade,
  student_id      uuid not null references users(id) on delete cascade,
  quiz_attempt_id uuid not null references quiz_attempts(id) on delete cascade,
  question_id     uuid not null references quiz_questions(id) on delete cascade,
  feedback_text   text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (quiz_attempt_id, question_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on courses (instructor_id);
create index on courses (slug);
create index on modules (course_id, position);
create index on lessons (course_id, position);
create index on lessons (module_id);
create index on lessons (course_id, slug);
create index on course_pages (course_id, position);
create index on course_page_views (user_id);
create index on enrollments (user_id);
create index on enrollments (course_id);
create index on lesson_completions (user_id, course_id);
create index on lesson_completions (lesson_id);
create index on lesson_progress (user_id);
create index on quiz_attempts (user_id, quiz_id);
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
create trigger set_updated_at before update on quizzes
  for each row execute function set_updated_at();
create trigger set_updated_at before update on course_pages
  for each row execute function set_updated_at();
create trigger set_updated_at before update on response_feedback
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table users              enable row level security;
alter table courses            enable row level security;
alter table modules            enable row level security;
alter table lessons            enable row level security;
alter table course_pages       enable row level security;
alter table course_page_views  enable row level security;
alter table quizzes            enable row level security;
alter table quiz_questions     enable row level security;
alter table enrollments        enable row level security;
alter table lesson_completions enable row level security;
alter table lesson_progress    enable row level security;
alter table quiz_attempts      enable row level security;
alter table certificates       enable row level security;
alter table response_feedback  enable row level security;
alter table videos             enable row level security;

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

create policy "quiz_attempts: read own" on quiz_attempts
  for select using (user_id = (select id from users where clerk_id = auth.uid()::text));
create policy "quiz_attempts: insert own" on quiz_attempts
  for insert with check (user_id = (select id from users where clerk_id = auth.uid()::text));

create policy "certificates: read own" on certificates
  for select using (user_id = (select id from users where clerk_id = auth.uid()::text));

create policy "response_feedback: read own" on response_feedback
  for select using (student_id = (select id from users where clerk_id = auth.uid()::text));

-- ============================================================
-- GRANTS
-- ============================================================
grant select                         on courses            to anon, authenticated;
grant select, insert, update, delete on courses            to service_role;

grant select                         on modules            to anon, authenticated;
grant select, insert, update, delete on modules            to service_role;

grant select                         on lessons            to anon, authenticated;
grant select, insert, update, delete on lessons            to service_role;

grant select                         on course_pages       to anon, authenticated;
grant select, insert, update, delete on course_pages       to service_role;

grant select, insert                 on course_page_views  to authenticated;
grant select, insert, update, delete on course_page_views  to service_role;

grant select                         on videos             to anon, authenticated;
grant select, insert, update, delete on videos             to service_role;

grant select                         on quizzes            to authenticated;
grant select, insert, update, delete on quizzes            to service_role;

grant select                         on quiz_questions     to authenticated;
grant select, insert, update, delete on quiz_questions     to service_role;

grant select                         on users              to authenticated;
grant select, insert, update, delete on users              to service_role;

grant select                         on enrollments        to authenticated;
grant select, insert, update, delete on enrollments        to service_role;

grant select, insert, delete         on lesson_completions to authenticated;
grant select, insert, update, delete on lesson_completions to service_role;

grant select, insert                 on lesson_progress    to authenticated;
grant select, insert, update, delete on lesson_progress    to service_role;

grant select, insert                 on quiz_attempts      to authenticated;
grant select, insert, update, delete on quiz_attempts      to service_role;

grant select                         on certificates       to authenticated;
grant select, insert, update, delete on certificates       to service_role;

grant select                         on response_feedback  to authenticated;
grant select, insert, update, delete on response_feedback  to service_role;
