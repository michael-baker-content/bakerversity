# Bakerversity foundation update

## Delivery state

The code and migrations must be released together. The migration instructions are in `supabase/MIGRATIONS.md`. Automated checks run entirely against an isolated PostgreSQL engine; they never load project secrets or reset Supabase. Hosted authoring and learner checks remain required after applying the migrations and deploying the app.

## Database contract

`supabase/baseline.sql` is the historical starting schema. The ordered files in `supabase/migrations/` are the authoritative changes. `npm run db:generate` applies both to an isolated PostgreSQL database and generates `supabase/schema.sql` (fresh installs only) and `src/lib/database.types.ts`. `npm run db:check` fails if these artifacts drift. The Supabase client now uses generated types; `src/lib/types.ts` contains narrower UI/domain shapes, not a second database definition.

Existing accounts, Clerk identifiers and roles remain intact. The application uses a trusted server model: Clerk authenticates the caller, server handlers resolve the internal user and validate access, and only those handlers invoke privileged database operations. Browser roles can read published catalogue metadata, but cannot read answer keys or write learner scores. Clerk JWT-template/RLS instructions in the old README no longer describe this access model.

## Course items and categorization

`course_items` is the common registry for order, item kind, required status, duration, activity, placement and revision counters. Existing `lessons`, `course_pages` and `assessments` remain the published subtype records used by the editor/viewer routes. Database triggers synchronize their registry entries. This compatibility layer is deliberate; a future migration can move shared columns fully into the registry once all legacy APIs are retired. Application code must not write registry mirrors directly.

Explicit placement (introduction/body/conclusion) replaces inferring order from page purpose. Module items are always placed in the module body. Navigation and next/previous include module pages and assessments without a module. The complete-sequence manager orders mixed content through one transaction.

Course classification separates reusable subject categories, topics and tools from activity type, difficulty and language. Learning objectives are ordered course text entries. `item_terms` reserves a normalized relationship for later item tagging; the current UI edits course-level terms.

## Drafts, revisions and history

Editor saves default to a separate draft. Publishing applies the draft to the learner-visible subtype row. Every save checks a version under a database lock and rejects a stale editor tab. Revisions retain full subtype snapshots and can be loaded into the editor, reviewed and saved again. Loading history never publishes automatically.

Assessment question editing requires unpublishing first. Question sets do not yet have a parallel draft workflow: assessment revision history covers settings/introduction, while each learner attempt stores its own complete question and grading snapshots. This prevents edits from changing the meaning of old attempts. A future question-bank/versioning feature can extend this.

Archiving a lesson, page or assessment preserves its learning records and revisions. The complete-sequence manager can restore it as a draft. Published records should be archived rather than deleted once students exist. Course-level archive management and account-deletion/ownership-transfer workflows remain future work.

## Learning records

`submit_assessment` calculates grades and saves attempts, best results and completion evidence atomically. Request IDs make network retries idempotent; genuine retakes use new IDs. Practice scores are null. Only published courses/items are eligible, and paid courses require enrollment. Responses are stored as plain text without stripping valid localization markup.

`set_item_completion` derives course membership from the item, rather than trusting a client-supplied course ID. Completion checks run after lessons, pages and assessments. Required published items count; optional items do not. Progress reporting uses the same required-item registry. A course with zero required items does not automatically issue certificates.

Certificates record the course title and required published item versions at issuance. A later content change or learner unchecking a lesson does not silently erase an earned certificate; revocation is explicit. Certificate PDFs, public verification links and a revocation UI are not implemented here.

## Assets

Uploads require instructor/admin access and produce an `assets` inventory record. Files can be reused via item associations, and resource links appear on authorized learner pages. Inline image/slide paths in saved content are associated with inventory entries conservatively. Existing public storage buckets remain public; this update does not make paid-course files private. The resource revision update makes attachment selections part of the item draft and publishes them with content. This requires the additional migration in `docs/authoring-resource-revisions.md`; the migration is applied, while the matching application release and signed-in hosted acceptance remain pending. Asset deletion and private-file delivery are intentionally not exposed yet.

## Validation

- `npm run typecheck`
- `npm test` — migration upgrade, preserved accounts, constraints, grading, retries, rollback, completion, drafts, permissions and sequence tests.
- `npm run db:check` — generated schema/type drift.
- `npm run build` — production compilation.

PGlite runs real PostgreSQL statements but does not emulate Supabase Storage, PostgREST, Clerk, Vercel or multiple independent database connections. Test those hosted integrations after migration. The SQL verification script is read-only.

Recommended hosted acceptance pass: create a course/module/lesson/page/assessment; save and publish a lesson; save a new draft and verify that learners still see the previous version; trigger a stale-tab conflict; upload and reuse a resource; reorder mixed items; test a learner's required versus optional progress and failed/passed assessments; confirm certificate evidence; archive and restore an item. Use dedicated test content and accounts for these checks.

## Verification recorded 2026-10-14

The four migrations were applied manually in Supabase. Read-only API checks confirmed three preserved users, an empty course catalogue, the new tables, and denied anonymous access to assessment questions, attempts and drafts. Type checking, PostgreSQL regression tests, sequence tests, generated-artifact checks and the production build passed. Local production HTTP checks returned 200 for home, courses and About; protected pages/API calls rejected signed-out requests.

These application changes are local and have not been deployed to Vercel. Signed-in browser acceptance remains outstanding. Deploy this application version before authoring course content. Dependency installation still reports a pre-existing React peer-range warning in the math visualization package's resize observer; compilation succeeds, but math widgets should be included in browser acceptance if used.

