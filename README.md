# Bakerversity

Bakerversity is an online course authoring platform for technical learning. It supports structured courses, rich lessons, reusable assets, and assessments. The current public offering is free; public courses can be read without an account. Recording progress and submitting assessments require sign-in.

Built with **Next.js 15**, **React 19**, **Tiptap 3**, **Supabase**, and **Clerk**, with KaTeX for mathematics and Mafs for graphs. Stripe webhook infrastructure is present; a complete commercial offering is not the current focus.

## Authoring

- Organize lessons, course pages, and assessments into modules and a shared course sequence.
- Save drafts separately from published content. Version checks protect against stale saves; recovery downloads help preserve work after uncertain responses.
- Load earlier revisions into the editor for review before saving or publishing.
- Preview a lesson's **saved draft**, including attached resources, without publishing. The preview is restricted to its instructor and admins. Its draft notice appears when the saved content/resources differ from publication, or the lesson is unpublished. Unsaved editor changes are not included.
- Use course-enabled mathematics, interactive graphs, code blocks, terminal blocks, callouts, and inline practice quizzes. Writing tools include search/replace, highlighting, language annotations, and optional invisible characters.
- Highlight localization formats including YAML, XML, TOML, XLIFF, TMX, TBX, Java properties, and INI, alongside Python, JavaScript/TypeScript, shell languages, SQL, Markdown, and other offered formats.

Course-page and assessment preview links still use their existing published views. Published assessment questions must be unpublished before editing; question sets do not yet have independent draft versions.

## Course asset library

The course overview includes a standalone expandable **Course asset library**. It also appears in content editors and through the editor's **Image** button.

- Upload multiple images/files into a course library and reuse them without uploading again.
- Switch between tiles and a text list. Expand a file for actions and metadata; non-image tiles show the file extension.
- Edit course-specific default alt text and captions. Selecting an image prefills those defaults; each placement can override them independently.
- Replace an image while preserving its placement descriptions. Set a maximum width in pixels, with responsive sizing on smaller screens.
- Select downloadable resources for a lesson, then save a draft or publish. Published attachments appear in **Resources** below the student lesson content. Saved-draft previews show draft attachments.

The library organizes assets through database relationships, not separate physical storage buckets for each course. Existing storage URLs remain public, even for draft assets. JPEG, PNG, WebP, and GIF image uploads are supported; SVG upload support is not implemented.

Search/filtering, usage inspection, unassigned-upload management, granular upload retries, and safe archive/deletion are planned. See [course asset library](docs/course-asset-library.md).

## Assessments and learning records

Assessments support multiple choice, true/false, short answer, and free response. Automatically graded answers contribute to scores; free response supports instructor feedback and is excluded from automatic scoring. Retakes retain the best result, and submission request IDs prevent retry duplication. Attempts retain historical question snapshots.

Inline practice quizzes are separate, ungraded lesson content and do not create assessment records. Completion logic uses required published course items and records certificate evidence. Certificate PDF generation, public verification links, and a revocation interface are not implemented. Further progress-tracking development remains planned.

## Local setup

Use **Node.js 24** (matching GitHub Actions) and npm.

1. Run `npm ci` to install the lockfile's dependencies.
2. Copy `.env.example` to `.env.local` and configure Supabase and Clerk credentials. Never commit populated environment files.
3. For an existing database, apply only unapplied migrations in chronological order using [the migration guide](supabase/MIGRATIONS.md). For a fresh database, use the generated `supabase/schema.sql`; do not then replay its included migrations.
4. Configure Clerk's user-sync webhook at `/api/webhooks/clerk` and the required Supabase Storage buckets/policies for uploads. Database schema installation alone does not provision storage or external services. See [PDF uploads](docs/pdf-uploads.md) and [foundation architecture](docs/foundation.md).
5. Start development with `npm run dev` when ready. The project owner controls local server startup and shutdown.

Development output uses `.next-dev`; production builds use `.next`. Both are ignored by Git. This separation prevents production builds from overwriting an active development server's generated chunks. `npm start` serves a completed production build.

Clerk authenticates requests; trusted server handlers resolve the internal user and check course access before using the Supabase service role. This is not a browser JWT-template authorization model. Keep the service-role key server-only.

Optional integrations include Unsplash image search, Formspree contact delivery, and Stripe webhooks. Their environment variables are listed in `.env.example`.

## Validation and GitHub

Checks that do not start a web server:

```sh
npm run typecheck
npm test
npm run db:check
npm run build
```

`npm test` uses an isolated PGlite database and local fixtures; it does not modify Supabase. It covers migrations, authoring state, draft/resource isolation, grading, course assets, navigation, image rendering, and other editor helpers. `db:check` checks generated schema/type consistency. The build checks production compilation.

GitHub Actions runs dependency installation, type checks, regression tests, schema consistency, and the authoring browser smoke test. The smoke test is also available explicitly:

```sh
npx playwright install chromium
npm run test:smoke
```

**The smoke test starts a temporary local server.** Run it locally only when desired; otherwise rely on GitHub Actions. It uses isolated data and selected real UI components, with substitute authentication/API routing. It does not verify live Clerk, Supabase Storage, or Vercel configuration. See [authoring reliability](docs/authoring-reliability.md) for coverage and limitations.

Before deploying, apply any new migration required by that release. Do not repeat successful migrations. The latest included migration is `202610190001_course_assets.sql`; the project owner has confirmed it was applied. The subsequent editor/library and lesson-preview changes require no additional migration.

The legacy `npm run lint` script invokes interactive ESLint setup when no configuration is present. It is not part of the current CI checks; use the commands above. A standalone lint configuration remains separate work.

## Code and database map

| Location | Responsibility |
|---|---|
| `src/app/admin/` | Course management, editors, response review, protected lesson preview |
| `src/app/courses/` | Student course, lesson, page, and assessment routes |
| `src/app/api/admin/` | Authorized authoring and asset operations |
| `src/components/TipTapEditor.tsx` | Rich editor, image placement, course-library integration |
| `src/components/AssetLibrary.tsx` | Course asset browser, uploads, image defaults |
| `src/components/LessonViewerPage.tsx` | Shared published/saved-draft lesson presentation |
| `src/components/LessonAssets.tsx` | Published and authorized preview resource links |
| `src/components/editor/`, `renderer/` | Editor extensions and student rendering |
| `src/lib/authoring/` | Draft sessions, requests, validation, recovery |
| `src/lib/courseSequence.ts` | Shared ordering and navigation |
| `supabase/migrations/` | Authoritative ordered schema changes |
| `supabase/schema.sql` | Generated fresh-install schema |
| `src/lib/database.types.ts` | Generated database types |
| `src/lib/types.ts` | UI/domain shapes |

`course_items` is the shared registry; subtype tables hold lesson/page/assessment content. `content_drafts` and `content_revisions` preserve authoring state. `assets` inventories files, `course_assets` organizes course libraries and defaults, and `item_assets` records published resource associations.

After adding a migration, run `npm run db:generate` and include both generated artifacts. Do not edit them manually.

## Further documentation

- [Migration procedures](supabase/MIGRATIONS.md)
- [Foundation and data model](docs/foundation.md)
- [Authoring reliability](docs/authoring-reliability.md)
- [Course asset library](docs/course-asset-library.md)
- [Image delivery](docs/image-delivery.md)
- [Assessment authoring](docs/assessment-authoring.md)
- [Resource revisions](docs/authoring-resource-revisions.md)
- [Tiptap 3 upgrade](docs/tiptap-3-upgrade.md)

Older dated verification notes describe the state at that time, not the current database contents or deployment status.
