# Bakerversity

Bakerversity is an online course authoring platform for technical learning. Build lessons that combine code, mathematics, multilingual text, diagrams expressed as directory trees, images, and assessments in one visual editor. It is designed for explanations that need more than a video and a text box. The current public offering is free; public courses can be read without an account. Recording progress and submitting assessments require sign-in.

Built with **Next.js 15**, **React 19**, **Tiptap 3**, **Supabase**, and **Clerk**, with KaTeX for mathematics and Mafs for graphs. Stripe webhook infrastructure is present; a complete commercial offering is not the current focus.

## Why technical authors might use it

- **Explain code and file formats:** syntax-highlighted code, terminal-style blocks, and editable directory trees suit programming, tooling, and localization lessons.
- **Teach mathematical ideas:** KaTeX expressions and Mafs interactive graphs sit alongside the explanation, with tools enabled per course.
- **Mix text and visual instruction:** text-and-image compositions, slideshows, callouts, tables, and shared footnotes support varied lesson structures and responsive reading.
- **Work across languages:** label passages in English, Polish, German, Spanish, French, Czech, and Japanese; use localization formats such as XLIFF, TMX, and TBX in code examples.
- **Keep authoring manageable:** reusable course assets, optional asset tags, separate drafts/publications, revision history, and saved-draft lesson previews support ongoing course development.

Localization engineering is the current teaching use case. Programming foundations and mathematics are also natural fits for these tools.

### Content formats and boundaries

The visual editor stores structured **Tiptap JSON in PostgreSQL**. Markdown, MDX, and plain-text files can be imported; Markdown is converted into editor nodes through a custom remark-based parser. Accepting an MDX file does not execute its JSX or provide an MDX component runtime. Course and module metadata are managed in the application, rather than through frontmatter or Git-backed lesson files.

Authors can download HTML, Markdown, and plain text. Interactive components have sequential/static export representations; exports are not a complete course/database backup. Code and terminal blocks display examples; live code sandboxes, Jupyter notebook rendering, and Asciinema playback are not implemented.

## Architecture and stack

| Layer | Implementation |
|---|---|
| Application | Next.js 15 App Router, React 19, TypeScript |
| Authoring | Tiptap 3 / ProseMirror with custom nodes and components |
| Content rendering | Custom Tiptap JSON renderer; unified/remark for Markdown import |
| Code and mathematics | Lowlight syntax highlighting, KaTeX math, Mafs graphs |
| Database and files | Supabase PostgreSQL and Supabase Storage |
| Authentication | Clerk; server-side instructor/admin authorization |
| Styling | Custom CSS, shared theme variables, and next-themes |
| Validation | Node regression tests, isolated PGlite database tests, Playwright browser smoke tests |

The application is deployed on Vercel. A production Node deployment uses `npm run build` followed by `npm start`, with Supabase and Clerk configured separately. Docker images, AWS deployment templates, and a fully offline/self-contained installation are not supplied.

## Authoring

- Organize lessons, course pages, and assessments into modules and a shared course sequence.
- Save drafts separately from published content. Version checks protect against stale saves; recovery downloads help preserve work after uncertain responses.
- Load earlier revisions into the editor for review before saving or publishing.
- Preview a lesson's **saved draft**, including attached resources, without publishing. The preview is restricted to its instructor and admins. Its draft notice appears when the saved content/resources differ from publication, or the lesson is unpublished. Unsaved editor changes are not included.
- Use course-enabled mathematics, interactive graphs, code blocks, terminal blocks, callouts, and inline practice quizzes. Writing tools include search/replace, highlighting, language annotations, and optional invisible characters. Authored links open in a new tab in reader views and HTML downloads; footnote references and return links navigate within the page.
- Paste editable [directory trees](docs/directory-trees.md), with collapsible folders, file paths, notes, and highlighted entries.
- Highlight localization formats including YAML, XML, TOML, XLIFF, TMX, TBX, Java properties, and INI, alongside Python, JavaScript/TypeScript, shell languages, SQL, Markdown, and other offered formats.

Course-page and assessment preview links still use their existing published views. Published assessment questions must be unpublished before editing; question sets do not yet have independent draft versions.

## Course asset library

The course overview includes a standalone expandable **Course asset library**. It also appears in content editors and through the editor's **Image** button.

- Upload multiple images/files into a course library and reuse them without uploading again.
- Search asset names, original filenames, and optional tags, filter All files / Images / PDFs / Other files, and sort newest/oldest uploaded or Name A–Z. Search runs across the whole course library, updates after a short typing pause, and shows matching counts.
- Switch between tiles and a text list; the browser remembers your preference. Expand a file for actions and metadata; non-image tiles show the file extension.
- Edit course-specific default alt text and captions. Selecting an image prefills those defaults; each placement can override them independently.
- Replace an image while preserving its placement descriptions. Set a maximum width in pixels, with responsive sizing on smaller screens.
- Select downloadable resources for a lesson, then save a draft or publish. Published attachments appear in **Resources** below the student lesson content. Saved-draft previews show draft attachments.

The library organizes assets through database relationships, not separate physical storage buckets for each course. Existing storage URLs remain public, even for draft assets. JPEG, PNG, WebP, and GIF image uploads are supported; SVG upload support is not implemented.

Usage inspection, unassigned-upload management, granular upload retries, and safe archive/deletion are planned. See [course asset library](docs/course-asset-library.md).

## Assessments and learning records

Assessments support multiple choice, true/false, short answer, and free response. Automatically graded answers contribute to scores; free response supports instructor feedback and is excluded from automatic scoring. Retakes retain the best result, and submission request IDs prevent retry duplication. Attempts retain historical question snapshots.

Inline practice quizzes are separate, ungraded lesson content and do not create assessment records. Completion logic uses required published course items and records certificate evidence. Certificate PDF generation, public verification links, and a revocation interface are not implemented. Further progress-tracking development remains planned.

## Local setup

Use **Node.js 24** (matching GitHub Actions) and npm. Start from a local checkout of this repository. A functioning authoring installation also needs a Supabase project and a Clerk application; there is no zero-configuration demo mode.

Install dependencies and create the local configuration file:

```sh
npm ci
```

Copy `.env.example` to `.env.local` using your file manager, `Copy-Item .env.example .env.local` in PowerShell, or `cp .env.example .env.local` on macOS/Linux. Never commit populated environment files.

| Required setting | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project endpoint and public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-side database/storage operations |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk sign-in and server authentication |
| `CLERK_WEBHOOK_SECRET` | Verifies Clerk user-sync events |

Before authoring:

1. **Install the database schema.** For a fresh database, use the generated `supabase/schema.sql`; do not then replay its included migrations. For an existing database, apply only unapplied migrations in chronological order using [the migration guide](supabase/MIGRATIONS.md).
2. **Connect user synchronization.** Configure Clerk's webhook at `/api/webhooks/clerk` for `user.created`, `user.updated`, and `user.deleted`. Local webhook delivery needs a reachable development URL; Clerk cannot deliver directly to localhost. Set the endpoint's signing secret in `CLERK_WEBHOOK_SECRET`.
3. **Grant authoring access.** Sign up and confirm your account appears in Supabase's `public.users` table. New accounts start as students. In the Supabase dashboard, identify your own row by Clerk ID and set its `role` to `instructor` (or `admin` for site administration). Sign-in alone does not grant authoring access.
4. **Provision storage.** Create/configure the public `lesson-images` and `lesson-slides` buckets with appropriate MIME/size restrictions. Schema installation does not provision Storage or external services. Uploads are authorized by server handlers; never grant anonymous write access. See [PDF uploads](docs/pdf-uploads.md) and [foundation architecture](docs/foundation.md).

Start the app when ready:

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000), sign in, and visit `/admin/courses`. Create a test course and lesson, save a draft, and open its preview to check the authoring path. Verify uploads separately after configuring Storage. Stop the development process with Ctrl+C.

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

Before deploying, apply any new migration required by that release. Do not repeat successful migrations. The latest included migration is `202610230001_course_asset_tags.sql`, which adds optional course-specific asset tags. Consult the migration guide and your database migration history before applying anything.

The legacy `npm run lint` script invokes interactive ESLint setup when no configuration is present. It is not part of the current CI checks; use the commands above. A standalone lint configuration remains separate work.

## Code and database map

| Location | Responsibility |
|---|---|
| `src/app/admin/` | Course management, editors, response review, protected lesson preview |
| `src/app/courses/` | Student course, lesson, page, and assessment routes |
| `src/app/api/admin/` | Authorized authoring and asset operations |
| `src/components/TipTapEditor.tsx` | Rich editor, image placement, course-library integration |
| `src/components/AssetLibrary.tsx` | Course asset browser, uploads, image defaults, optional tags and shared search |
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

## Editor components

Grouped editor tools are implemented as the first component-system checkpoint. The responsive toolbar groups insertion tools into Media, Learning, Technical, and Components; downloads use a shared format picker. The [Text and image component](docs/text-image-component.md) supports left/right image placement, full-column images, vertical text alignment, stacked presentation and sequential exports. The [Slideshow component](docs/image-slideshow-component.md) supports manual student navigation and a unified slide-editing modal with course-library selection, image upload, required alt text, optional captions and basic description formatting. Advanced description tools remain deferred. Unrestricted column layouts remain deferred. See [toolbar behavior](docs/editor-toolbar.md) and the [compatibility audit](docs/editor-components-audit.md). See the [implementation plan](docs/editor-components-plan.md) and [acceptance checklist](docs/editor-components-acceptance.md) for scope, delivery checkpoints and release criteria.

Footnotes can be enabled per course, with automatic numbering, shared references and basic rich-text notes. See the [footnote guide](docs/footnotes.md).

## Further documentation

- [Migration procedures](supabase/MIGRATIONS.md)
- [Foundation and data model](docs/foundation.md)
- [Authoring reliability](docs/authoring-reliability.md)
- [Course asset library](docs/course-asset-library.md)
- [Asset names and downloads](docs/asset-names.md)
- [Image delivery](docs/image-delivery.md)
- [Assessment authoring](docs/assessment-authoring.md)
- [Resource revisions](docs/authoring-resource-revisions.md)
- [Tiptap 3 upgrade](docs/tiptap-3-upgrade.md)

Older dated verification notes describe the state at that time, not the current database contents or deployment status.


Shared editor policies live in `src/lib/editorLinks.mjs` (authored-link validation and new-tab behavior), `src/lib/callouts.mjs` (callout labels, icons, and colors), and `src/lib/textLanguages.mjs` (text-language options). Update these definitions rather than duplicating rules in individual editors or the student renderer.
