# Bakerversity

A custom online course platform built with Next.js, Clerk, Supabase, and Stripe. Supports rich lesson content with LaTeX math rendering, quizzes, instructor grading, and certificates.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 16 (App Router, TypeScript) |
| Auth | Clerk |
| Database | Supabase (Postgres) |
| Storage | Supabase Storage |
| Payments | Stripe (not yet wired up) |
| Email | Resend (not yet wired up) |
| Rich text editor | TipTap |
| Math rendering | KaTeX |
| Code highlighting | Lowlight |

---

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your keys. See each section below.

---

### 3. Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → create an application
2. Copy **Publishable key** and **Secret key** into `.env.local`
3. Under **User & Authentication → SSO connections**, add Google with your own OAuth credentials
4. Set up a webhook:
   - **Developers → Webhooks → Add endpoint**
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret** → `CLERK_WEBHOOK_SECRET`

For local development, use ngrok to expose localhost:
```bash
ngrok http 3000
```
Use the ngrok HTTPS URL as your webhook endpoint. Add it to **Authorized JavaScript origins** in your Google Cloud OAuth client.

---

### 4. Supabase

1. Create a project at [supabase.com](https://supabase.com)
   - Uncheck **Automatically expose new tables** at creation
   - Enable **Automatic RLS**
2. Run `supabase/schema.sql` in the SQL editor (Dashboard → SQL Editor → paste the file contents → Run)
3. Copy keys from **Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Create a storage bucket named `lesson-images` (public) with these policies:
   - `SELECT` for `public`
   - `INSERT`, `DELETE` for `authenticated`
5. Enable SSL: **Database → Settings → SSL Configuration**

---

### 5. Stripe (not yet active)

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API Keys
2. Copy keys into `.env.local`
3. For local webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

### 6. Resend (not yet active)

1. [resend.com](https://resend.com) → API Keys → Create
2. Copy key → `RESEND_API_KEY`

---

### 7. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

### 8. Promote yourself to instructor

After signing up, go to Supabase → Table Editor → `users`, find your row, and set `role` to `instructor`.

---

## Project structure

```
src/
├── app/
│   ├── admin/
│   │   ├── courses/
│   │   │   ├── page.tsx                 # Instructor course list
│   │   │   ├── new/page.tsx             # Create course
│   │   │   └── [slug]/
│   │   │       ├── page.tsx             # Course detail + lesson list
│   │   │       └── lessons/
│   │   │           ├── new/page.tsx     # Create lesson
│   │   │           └── [lessonId]/      # Edit lesson + quiz editor
│   │   └── grading/page.tsx             # Review student text responses
│   ├── api/
│   │   ├── admin/
│   │   │   ├── courses/                 # Course + lesson CRUD
│   │   │   ├── course-id-by-slug/       # Slug → UUID resolver
│   │   │   ├── grading/                 # Fetch responses + save feedback
│   │   │   ├── parse-markdown/          # Markdown → TipTap JSON
│   │   │   └── upload/                  # Image upload to Supabase Storage
│   │   ├── lessons/[lessonId]/quiz/     # Student quiz submission
│   │   ├── students/quiz-feedback/      # Fetch instructor feedback
│   │   └── webhooks/
│   │       ├── clerk/                   # Sync Clerk users → users table
│   │       └── stripe/                  # Create enrollments on payment
│   ├── courses/
│   │   ├── page.tsx                     # Public course catalogue
│   │   └── [slug]/
│   │       ├── page.tsx                 # Course detail + enroll
│   │       └── lessons/[lessonId]/      # Lesson viewer + quiz
│   ├── dashboard/page.tsx               # Student + instructor dashboard
│   └── sign-in / sign-up               # Clerk auth pages
├── components/
│   ├── TipTapEditor.tsx                 # Rich text editor (KaTeX + code + images)
│   ├── LessonRenderer.tsx               # Read-only lesson renderer
│   ├── QuizEditor.tsx                   # Admin quiz builder
│   ├── QuizTaker.tsx                    # Student quiz UI
│   ├── LatexModal.tsx                   # Algebra 1 LaTeX formula picker
│   └── MarkdownImport.tsx               # Import .md/.mdx files into editor
└── lib/
    ├── supabase.ts                       # Browser, server, service role clients
    ├── types.ts                          # TypeScript types matching DB schema
    └── markdownToTipTap.ts              # Markdown AST → TipTap JSON converter
```

---

## Feature status

| Feature | Status |
|---|---|
| Auth (Clerk + Google OAuth) | ✅ Complete |
| User sync (Clerk → Supabase) | ✅ Complete |
| Course + lesson CRUD | ✅ Complete |
| Rich text editor with KaTeX | ✅ Complete |
| Image upload (Supabase Storage) | ✅ Complete |
| Markdown import (.md, .mdx) | ✅ Complete |
| LaTeX formula modal | ✅ Complete |
| Course catalogue + lesson viewer | ✅ Complete |
| Quiz engine (MC, T/F, text) | ✅ Complete |
| Per-option explanations | ✅ Complete |
| Instructor grading view | ✅ Complete |
| Student feedback display | ✅ Complete |
| Responsive design | 🔲 Planned |
| Visual design polish | 🔲 Planned |
| Certificates | 🔲 Planned |
| PDF slideshow viewer | 🔲 Planned |
| Onboarding + email | 🔲 Planned |
| Stripe payments | 🔲 Planned |

---

## PowerShell note

When deleting folders with brackets in the name (e.g. `[courseId]`), use `-LiteralPath`:

```powershell
Remove-Item -Recurse -Force -LiteralPath "src\app\admin\courses\[courseId]"
```

The standard `-Path` flag treats brackets as wildcards and silently fails.
