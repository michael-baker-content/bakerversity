-- ============================================================
-- Online Course Platform — Supabase Schema v1
-- ============================================================
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- Enable the pgcrypto extension first (used for UUID generation)
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS
-- Mirrors Clerk users. clerk_id is the source of truth for auth.
-- role: 'student' | 'instructor' | 'admin'
-- ============================================================
create table users (
  id            uuid primary key default gen_random_uuid(),
  clerk_id      text unique not null,         -- Clerk user ID (e.g. user_2abc...)
  email         text unique not null,
  full_name     text,
  avatar_url    text,
  role          text not null default 'student'
                  check (role in ('student', 'instructor', 'admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- COURSES
-- instructor_id is here from day one for future multi-instructor support.
-- slug is used in URLs: /courses/intro-to-algebra
-- is_published controls visibility to students.
-- ============================================================
create table courses (
  id              uuid primary key default gen_random_uuid(),
  instructor_id   uuid not null references users(id) on delete restrict,
  title           text not null,
  slug            text unique not null,          -- URL-friendly identifier
  description     text,
  price_cents     integer not null default 0,    -- price in cents (e.g. 4999 = $49.99)
  currency        text not null default 'usd',
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- MODULES
-- Optional grouping layer above lessons (e.g. "Unit 1: Linear Equations").
-- position controls ordering within a course.
-- ============================================================
create table modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  title       text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- LESSONS
-- content is stored as TipTap JSON (supports rich text, LaTeX, code blocks).
-- module_id is nullable — lessons can belong directly to a course with no module.
-- youtube_url is nullable — for decorative/intro videos (v1 optional, v2 full use).
-- position controls ordering within a module (or course if no module).
-- ============================================================
create table lessons (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references courses(id) on delete cascade,
  module_id     uuid references modules(id) on delete set null,
  title         text not null,
  content       jsonb,                           -- TipTap JSON document
  position      integer not null default 0,
  youtube_url   text,                            -- optional decorative video
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- QUIZZES
-- One quiz per lesson (nullable — not every lesson needs one).
-- passing_score is a percentage (0–100).
-- ============================================================
create table quizzes (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid unique not null references lessons(id) on delete cascade,
  title           text not null default 'Lesson Quiz',
  passing_score   integer not null default 70    -- percentage required to pass
                    check (passing_score between 0 and 100),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- QUIZ QUESTIONS
-- question_type: 'multiple_choice' | 'true_false'
-- options is a JSONB array of answer choices.
-- correct_answer is the index into options (0-based) or 'true'/'false'.
-- question text supports LaTeX — store as plain text with $ delimiters,
-- render with KaTeX on the frontend.
-- ============================================================
create table quiz_questions (
  id              uuid primary key default gen_random_uuid(),
  quiz_id         uuid not null references quizzes(id) on delete cascade,
  question_text   text not null,                 -- supports LaTeX ($...$)
  question_type   text not null default 'multiple_choice'
                    check (question_type in ('multiple_choice', 'true_false')),
  options         jsonb,                         -- e.g. ["2x", "x²", "2", "x+2"]
  correct_answer  text not null,                 -- e.g. "0" (index) or "true"
  explanation     text,                          -- shown after answering
  position        integer not null default 0,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- ENROLLMENTS
-- Created when a student successfully pays (via Stripe webhook).
-- stripe_payment_intent_id links back to the Stripe transaction.
-- completed_at is set when the student earns their certificate.
-- ============================================================
create table enrollments (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references users(id) on delete cascade,
  course_id                 uuid not null references courses(id) on delete cascade,
  stripe_payment_intent_id  text unique,         -- null for free courses
  enrolled_at               timestamptz not null default now(),
  completed_at              timestamptz,          -- null until course is completed
  unique (user_id, course_id)                    -- one enrollment per student per course
);

-- ============================================================
-- LESSON PROGRESS
-- Tracks whether a student has completed each lesson.
-- Used to determine when to unlock the certificate.
-- ============================================================
create table lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  lesson_id     uuid not null references lessons(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- ============================================================
-- QUIZ ATTEMPTS
-- Records each time a student submits a quiz.
-- answers is a JSONB map of question_id → chosen answer.
-- score is the percentage achieved (0–100).
-- passed is true if score >= quiz.passing_score.
-- ============================================================
create table quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  quiz_id       uuid not null references quizzes(id) on delete cascade,
  answers       jsonb not null,                  -- { "question_id": "chosen_answer", ... }
  score         integer not null                 -- percentage, 0–100
                  check (score between 0 and 100),
  passed        boolean not null,
  attempted_at  timestamptz not null default now()
);

-- ============================================================
-- CERTIFICATES
-- Issued when a student completes all lessons and passes all quizzes.
-- certificate_url points to the generated PDF in Supabase Storage.
-- issued_at is the canonical date printed on the certificate.
-- ============================================================
create table certificates (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  course_id         uuid not null references courses(id) on delete cascade,
  certificate_url   text,                        -- Supabase Storage URL for the PDF
  issued_at         timestamptz not null default now(),
  unique (user_id, course_id)                    -- one certificate per student per course
);

-- ============================================================
-- INDEXES
-- Speeds up the most common query patterns.
-- ============================================================
create index on courses (instructor_id);
create index on courses (slug);
create index on modules (course_id, position);
create index on lessons (course_id, position);
create index on lessons (module_id);
create index on enrollments (user_id);
create index on enrollments (course_id);
create index on lesson_progress (user_id);
create index on quiz_attempts (user_id, quiz_id);
create index on certificates (user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- Automatically updates the updated_at column on row changes.
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

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables. Policies below control access.
-- Your Next.js API routes run as the service role (bypasses RLS).
-- The policies here are for direct Supabase client access if needed.
-- ============================================================
alter table users           enable row level security;
alter table courses         enable row level security;
alter table modules         enable row level security;
alter table lessons         enable row level security;
alter table quizzes         enable row level security;
alter table quiz_questions  enable row level security;
alter table enrollments     enable row level security;
alter table lesson_progress enable row level security;
alter table quiz_attempts   enable row level security;
alter table certificates    enable row level security;

-- Users can read their own row; service role manages writes
create policy "users: read own" on users
  for select using (auth.uid()::text = clerk_id);

-- Anyone can read published courses
create policy "courses: read published" on courses
  for select using (is_published = true);

-- Anyone can read modules of published courses
create policy "modules: read published" on modules
  for select using (
    exists (
      select 1 from courses c
      where c.id = modules.course_id and c.is_published = true
    )
  );

-- Anyone can read published lessons of published courses
create policy "lessons: read published" on lessons
  for select using (
    is_published = true and
    exists (
      select 1 from courses c
      where c.id = lessons.course_id and c.is_published = true
    )
  );

-- Students can read their own enrollments
create policy "enrollments: read own" on enrollments
  for select using (
    user_id = (select id from users where clerk_id = auth.uid()::text)
  );

-- Students can read and write their own progress
create policy "lesson_progress: read own" on lesson_progress
  for select using (
    user_id = (select id from users where clerk_id = auth.uid()::text)
  );
create policy "lesson_progress: insert own" on lesson_progress
  for insert with check (
    user_id = (select id from users where clerk_id = auth.uid()::text)
  );

-- Students can read and write their own quiz attempts
create policy "quiz_attempts: read own" on quiz_attempts
  for select using (
    user_id = (select id from users where clerk_id = auth.uid()::text)
  );
create policy "quiz_attempts: insert own" on quiz_attempts
  for insert with check (
    user_id = (select id from users where clerk_id = auth.uid()::text)
  );

-- Students can read their own certificates
create policy "certificates: read own" on certificates
  for select using (
    user_id = (select id from users where clerk_id = auth.uid()::text)
  );

-- ============================================================
-- GRANTS
-- Required because "Automatically expose new tables" is unchecked
-- at project creation. Without explicit grants, PostgREST returns
-- a permission error even if RLS policies allow the row.
--
-- Grants and RLS work as two independent layers:
--   GRANT  → controls whether the role can touch the table at all
--   RLS    → controls which rows the role can see within that table
-- Both must pass for a query to succeed.
--
-- anon        = unauthenticated visitors (browsing course catalogue)
-- authenticated = logged-in users (students, instructors)
-- service_role  = your Next.js server (bypasses RLS entirely)
-- ============================================================

-- courses: public read (course catalogue); writes via service_role only
grant select                       on courses         to anon, authenticated;
grant select, insert, update, delete on courses       to service_role;

-- modules: public read; writes via service_role only
grant select                       on modules         to anon, authenticated;
grant select, insert, update, delete on modules       to service_role;

-- lessons: public read (RLS filters to published only); writes via service_role only
grant select                       on lessons         to anon, authenticated;
grant select, insert, update, delete on lessons       to service_role;

-- quizzes: authenticated read (enrolled students); writes via service_role only
grant select                       on quizzes         to authenticated;
grant select, insert, update, delete on quizzes       to service_role;

-- quiz_questions: authenticated read; writes via service_role only
grant select                       on quiz_questions  to authenticated;
grant select, insert, update, delete on quiz_questions to service_role;

-- users: authenticated read own row (RLS enforces this); writes via service_role only
grant select                       on users           to authenticated;
grant select, insert, update, delete on users         to service_role;

-- enrollments: authenticated read own rows; insert via service_role (Stripe webhook)
grant select                       on enrollments     to authenticated;
grant select, insert, update, delete on enrollments   to service_role;

-- lesson_progress: authenticated read+insert own rows
grant select, insert               on lesson_progress to authenticated;
grant select, insert, update, delete on lesson_progress to service_role;

-- quiz_attempts: authenticated read+insert own rows
grant select, insert               on quiz_attempts   to authenticated;
grant select, insert, update, delete on quiz_attempts to service_role;

-- certificates: authenticated read own rows; writes via service_role only
grant select                       on certificates    to authenticated;
grant select, insert, update, delete on certificates  to service_role;

-- ============================================================
-- SEED DATA (optional — remove before production)
-- Creates one instructor and one course to verify the schema.
-- Replace clerk_id with a real Clerk user ID after setting up auth.
-- ============================================================

-- insert into users (clerk_id, email, full_name, role)
-- values ('user_placeholder', 'instructor@example.com', 'Your Name', 'instructor');

-- insert into courses (instructor_id, title, slug, description, price_cents, is_published)
-- values (
--   (select id from users where email = 'instructor@example.com'),
--   'Introduction to Algebra',
--   'intro-to-algebra',
--   'A complete introduction to algebra with interactive exercises.',
--   4999,
--   false
-- );

-- ============================================================
-- RESPONSE FEEDBACK
-- Added after initial schema — instructor feedback on student
-- text responses. Run this separately if schema was already applied.
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

create index on response_feedback (instructor_id);
create index on response_feedback (student_id);

create trigger set_updated_at before update on response_feedback
  for each row execute function set_updated_at();

alter table response_feedback enable row level security;

create policy "response_feedback: read own" on response_feedback
  for select using (
    student_id = (select id from users where clerk_id = auth.uid()::text)
  );

grant select on response_feedback to authenticated;
grant select, insert, update, delete on response_feedback to service_role;
