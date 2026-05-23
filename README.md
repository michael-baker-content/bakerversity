# Bakerversity

A custom online course platform built with Next.js, Supabase, and Clerk. Designed for a single instructor offering structured courses with modules, lessons, rich content, and assessments.

## Tech stack

- **Framework** — Next.js 15 (App Router)
- **Database** — Supabase (PostgreSQL + RLS)
- **Auth** — Clerk
- **Payments** — Stripe
- **Rich text** — TipTap with custom nodes (inline/block math, Mafs graphs, code blocks, callouts, terminal blocks)
- **Math rendering** — KaTeX
- **Graphing** — Mafs
- **Styling** — Custom CSS (amber/indigo theme, DM Sans + DM Serif Display, dark mode via next-themes)

## Project structure

```
src/
  app/
    admin/                      # Instructor-only area
      courses/                  # Course management
        [slug]/
          page.tsx              # Course detail (modules, lessons, assessments)
          CourseDetailLayout.tsx # Unified sequence editor with reordering
          assessments/
            new/                # Create assessment
            [assessmentId]/     # Edit assessment + questions
          lessons/[lessonId]/   # Edit lesson
          modules/[moduleId]/   # Edit module
          pages/[pageId]/       # Edit course page
      certificates/             # Certificate management
      grading/                  # Review text_response answers (needs update — see Known gaps)
    api/
      admin/                    # Instructor API routes
        courses/[courseId]/
          assessments/          # CRUD + reorder
          lessons/              # CRUD + reorder
          modules/              # CRUD
          pages/                # CRUD + reorder
      students/
        assessments/[assessmentId]/submit/  # Grading + attempt recording
      webhooks/
        clerk/                  # User sync
        stripe/                 # Payment handling
    courses/                    # Student-facing area
      [slug]/
        page.tsx                # Course detail (contents list)
        [moduleSlug]/[lessonSlug]/  # Lesson viewer
        pages/[pageSlug]/       # Course page viewer
        assessments/[assessmentSlug]/  # Assessment taker
  components/
    AssessmentTaker.tsx         # Student assessment UI
    CourseSettings.tsx          # Course settings panel
    LessonRenderer.tsx          # Renders TipTap JSON content
    LessonSidebar.tsx           # Course navigation sidebar
    TipTapEditor.tsx            # Rich text editor
    editor/
      nodes.ts                  # Custom TipTap nodes
      NodeViews.tsx             # React node views
      Toolbar.tsx               # Editor toolbar
    renderer/
      renderNode.ts             # TipTap JSON → HTML
      HtmlSegment.tsx           # Sanitised HTML output
  lib/
    courseSequence.ts           # Canonical course content ordering (single source of truth)
    lessonUrl.ts                # Lesson URL helpers
    supabase.ts                 # Supabase client factory
    types.ts                    # Database types
```

## Database schema

See `schema.sql` for the full schema. Key tables:

| Table | Purpose |
|---|---|
| `users` | Clerk-synced user records with role |
| `courses` | Course metadata, pricing, publish state |
| `modules` | Ordered groups of lessons and assessments within a course |
| `lessons` | Individual lesson content (TipTap JSON, slides, video) |
| `course_pages` | Static content pages (overview, syllabus, etc.) |
| `course_page_views` | Tracks when a student reads a page |
| `assessments` | Quizzes, exams, and practice sets as sequence items |
| `assessment_questions` | Questions with rich TipTap bodies, four types |
| `assessment_attempts` | Every submission; infinite retakes allowed |
| `assessment_completions` | Best score per student per assessment |
| `enrollments` | Student↔course access records |
| `lesson_completions` | Student-initiated mark-complete per lesson |
| `certificates` | Issued on course completion |
| `response_feedback` | Instructor feedback on text_response answers |
| `videos` | Video asset metadata |

## Course content model

Content within a module is ordered by a shared `position` column. Lessons and assessments are interleaved — a quiz can sit between two lessons at any position. The canonical sequence is built by `src/lib/courseSequence.ts` and used by all viewer pages and the sidebar for consistent prev/next navigation.

Full sequence order:
1. Course-level intro pages (overview, introduction, syllabus, requirements)
2. For each module (by module position): lessons and assessments interleaved by position
3. Unassigned lessons
4. Course-level conclusion pages

## Assessment types

| Type | Graded | Retakes | Notes |
|---|---|---|---|
| `quiz` | Yes | Unlimited, best score wins | Short check within a module |
| `exam` | Yes | Unlimited, best score wins | End-of-module or end-of-course |
| `practice` | No | Unlimited | Always passes, no score recorded |

## Question types

| Type | Grading | Notes |
|---|---|---|
| `multiple_choice` | Auto | Correct answer stored as option index string |
| `true_false` | Auto | Correct answer is `'true'` or `'false'` |
| `short_answer` | Auto | Compared against `accepted_answers` after trim + lowercase |
| `text_response` | Never | Optional reflection prompt, excluded from score |

Question bodies and explanations use TipTap JSON, supporting the full editor feature set (math, graphs, code blocks, etc.).

## Security

- All student-facing viewer pages use `serviceSupabase` (bypasses RLS) with explicit `is_published: true` filters on every content fetch. Instructor role is only used to allow access to unpublished courses and the specific lesson/page/assessment being viewed — never to bypass content filters for sidebar or sequence data.
- Student-submitted text answers are sanitised (HTML stripped) before storage and always rendered as plain text, never as HTML.
- Short-answer accepted answers are normalised (trimmed, lowercased) at write time so comparisons are simple string equality.

## Setup

1. Create a Supabase project and run `schema.sql` in the SQL Editor
2. Create a Clerk application and configure JWT template for Supabase
3. Create a Stripe account and configure webhook
4. Copy `.env.example` to `.env.local` and fill in all values
5. `npm install && npm run dev`

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

## Known gaps

The following features are planned but not yet built:

- **Progress tracking** — `lesson_completions` and `assessment_completions` tables are written to, but there is no `/progress` page or progress bar UI on course pages yet.
- **Grading page** — `/admin/grading` currently queries the old `quiz_attempts` table which has been dropped. It needs updating to query `assessment_attempts` and `response_feedback`.
- **Certificate issuance** — the `certificates` table exists but no logic exists to check completion and issue certificates.
- **Inline practice quizzes** — ungraded quiz questions embedded inside lesson content via a TipTap node are not yet implemented.
- **Lesson-level quizzes** — the old model of a quiz attached directly to a lesson has been removed. Quizzes are now standalone sequence items within a module.
