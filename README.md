# Bakerversity

A custom online course platform built with Next.js, Clerk, Supabase, and Stripe. Designed for rich instructional content — lessons with LaTeX math rendering, syntax-highlighted code, images, and PDF/Google Slides embeds. Includes a full quiz engine with multiple choice, true/false, and text response questions, instructor grading, a module system for organizing lesson sequences, student progress tracking, and certificate issuance on course completion.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 16 (App Router, TypeScript) |
| Auth | Clerk |
| Database | Supabase (Postgres) |
| Storage | Supabase Storage |
| Payments | Stripe (not yet wired up) |
| Email | Resend (planned) |
| Rich text editor | TipTap |
| Math rendering | KaTeX |
| Graph rendering | Mafs |
| Code highlighting | Lowlight |
| Theming | next-themes (light/dark mode) |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Add the following to `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_USER_PROFILE_URL=/profile

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

RESEND_API_KEY=
```

### 3. Clerk

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Copy **Publishable key** and **Secret key** into `.env.local`
3. Under **User & Authentication → Email, Phone, Username**, enable **Email address** and **Password** to allow email/password sign-up alongside Google
4. Under **User & Authentication → SSO connections**, add Google with your own OAuth credentials
5. Add a webhook under **Developers → Webhooks**:
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret** → `CLERK_WEBHOOK_SECRET`

For local development, use [ngrok](https://ngrok.com) to expose localhost and use the HTTPS URL as your webhook endpoint.

### 4. Supabase

1. Create a project at [supabase.com](https://supabase.com)
   - Uncheck **Automatically expose new tables** at project creation
   - Enable **Automatic RLS**
2. Run `supabase/schema.sql` in the SQL Editor (Dashboard → SQL Editor)
   Key columns added over time: `modules.slug`, `courses.thumbnail_url`, `courses.intro_description`, `courses.conclusion_description`, `courses.editor_tools`
3. Copy keys from **Settings → API** into `.env.local`
4. Create two storage buckets:

   **lesson-images** (public) — images embedded in lesson content, and course thumbnails (stored under a `thumbnails/` prefix)
   - File size limit: 5MB · MIME types: `image/jpeg, image/png, image/gif, image/webp`
   - Policies: SELECT for public · INSERT + DELETE for authenticated

   **lesson-slides** (public) — PDF slide decks
   - File size limit: 50MB · MIME types: `application/pdf`
   - Policies: SELECT for public · INSERT + DELETE for authenticated

5. Enable SSL: **Database → Settings → SSL Configuration**

### 5. Configure next.config.js

Ensure `mafs` is included in `transpilePackages` (required because mafs ships as ESM):

```js
const nextConfig = {
  transpilePackages: ["mafs"],
  // ...rest of config
}
```

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). After signing up, go to Supabase → Table Editor → `users` and set your `role` to `instructor`.

---

## Project structure

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                      # Adds SiteNav to all admin pages
│   │   ├── certificates/                   # Certificate management — list and revoke
│   │   ├── courses/[slug]/
│   │   │   ├── page.tsx                    # Course editor — server component, fetches data
│   │   │   ├── CourseDetailLayout.tsx      # Client component — collapsible module sections
│   │   │   ├── PublishToggle.tsx           # Publish/unpublish toggle
│   │   │   ├── modules/new/                # New module form
│   │   │   └── modules/[moduleId]/         # Module editor
│   │   │   ├── lessons/[lessonId]/         # Lesson editor
│   │   │   ├── modules/[moduleId]/         # Module editor
│   │   │   └── pages/[pageId]/             # Course page editor
│   │   └── grading/                        # Review and respond to student text responses
│   ├── api/
│   │   ├── admin/                          # Instructor CRUD — courses, lessons, modules, pages, certificates
│   │   ├── course-pages/                   # Student read/unread toggle
│   │   ├── lessons/[lessonId]/quiz/        # Quiz submission and scoring
│   │   ├── student/completions/            # Mark lesson complete / unmark
│   │   ├── student/progress/              # Fetch progress across all enrolled courses
│   │   ├── students/quiz-feedback/         # Fetch instructor feedback
│   │   └── webhooks/clerk + stripe/        # User sync and enrollment
│   ├── courses/
│   │   └── [slug]/
│   │       ├── page.tsx                    # Course detail + full contents list
│   │       ├── contents/                   # Standalone table of contents
│   │       ├── [moduleSlug]/[lessonSlug]/  # Canonical lesson viewer
│   │       ├── [moduleSlug]/               # Module landing — redirects to first lesson
│   │       ├── lessons/[lessonSlug]/       # Legacy URL — redirects to canonical URL
│   │       └── pages/[pageSlug]/           # Course page viewer
│   ├── progress/                           # Student progress dashboard
│   └── profile/                            # Clerk user profile
├── components/
│   ├── SiteNav.tsx                         # Server shell for site navigation
│   ├── SiteNavClient.tsx                   # Interactive nav — hamburger, theme toggle
│   ├── ThemeProvider.tsx                   # next-themes wrapper
│   ├── ThemeToggle.tsx                     # Light/dark mode toggle
│   ├── TipTapEditor.tsx                    # Rich text editor — configurable packs (math, code)
│   ├── LessonRenderer.tsx                  # Read-only lesson content renderer
│   ├── LessonSidebar.tsx                   # Responsive sidebar — modules, pages, lessons
│   ├── LessonList.tsx                      # Reorderable lesson list with module assignment
│   ├── ContentRow.tsx                      # Course contents row (client, handles hover)
│   ├── QuizEditor.tsx                      # Instructor quiz builder
│   ├── QuizTaker.tsx                       # Student quiz UI
│   ├── LatexModal.tsx                      # LaTeX formula reference
│   ├── MarkdownImport.tsx                  # Import .md/.mdx into the editor
│   ├── SlidesViewer.tsx                    # PDF and Google Slides embed
│   ├── SlidesSection.tsx                   # Client boundary for slides viewer
│   ├── CoursePageReadToggle.tsx            # Student read progress tracking
│   ├── MafsGraph.tsx                      # Mafs graph renderer — used in editor and student view
│   ├── MafsGraphEditor.tsx                # Instructor graph authoring modal with live preview
│   ├── MarkCompleteButton.tsx              # Lesson completion toggle
│   ├── ModuleProgressBars.tsx              # Per-module progress bar UI
│   ├── CourseProgressLoader.tsx            # Fetches and renders progress on course detail
│   ├── CourseSettings.tsx                  # Modal for editing course title, slug, price, thumbnail
│   ├── EnrollSelfButton.tsx                # Instructor self-enrollment for testing
│   └── DeleteButton.tsx                    # Reusable inline delete with confirm
└── lib/
    ├── supabase.ts                          # Browser, server, and service role clients
    ├── lessonUrl.ts                         # Shared lesson URL helpers (module-aware hrefs)
    ├── types.ts                             # TypeScript types
    └── markdownToTipTap.ts                 # Markdown → TipTap JSON converter
```

---

## URL structure

| Route | Description |
|---|---|
| `/courses` | Course catalogue |
| `/courses/[slug]` | Course detail and contents |
| `/courses/[slug]/contents` | Table of contents |
| `/courses/[slug]/[moduleSlug]/[lessonSlug]` | Lesson viewer (canonical) |
| `/courses/[slug]/[moduleSlug]` | Module landing — redirects to first lesson |
| `/courses/[slug]/lessons/[lessonSlug]` | Legacy lesson URL — redirects to canonical |
| `/courses/[slug]/pages/[pageSlug]` | Course page viewer |
| `/progress` | Student progress across all enrolled courses |
| `/admin/courses` | Instructor course list |
| `/admin/courses/[slug]` | Course editor |
| `/admin/certificates` | Certificate management |
| `/admin/grading` | Student response grading |
| `/dashboard` | Student and instructor dashboard |
| `/profile` | User profile (Clerk) |

---

## Design system

The UI is built on CSS custom properties defined in `globals.css`. Key tokens:

- **Fonts:** DM Serif Display (headings) · DM Sans (body/UI)
- **Primary:** `#FFB415` amber — buttons, CTAs, active states
- **Secondary:** `#3D3BF3` indigo — links, lesson active indicator, code
- **Themes:** light and dark, toggled via `next-themes` with `data-theme` attribute

---

## Roadmap

- Stripe payments for paid courses
- Email notifications on enrollment and certificate issuance (Resend)
- Certificate PDF generation (DB record issued, certificate_url always null)
- Course search and filtering on the catalogue
