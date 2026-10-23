# October 2026 foundation update

Existing project: `nfaltqnlgyhbamuunxxg` (Bakerversity).

Run the following files separately, in this exact order, in the Supabase SQL Editor as the database owner. Each file has its own transaction. Stop if a script reports an error; do not run subsequent scripts or repeat a successful script.

1. `migrations/202610140001_reconcile.sql` — reconcile feedback, add missing documented columns, migrate any legacy lesson completions, retire the old progress table.
2. `migrations/202610140002_content_foundation.sql` — strengthen relationships and privileges; add shared course items, classifications, assets, drafts and revisions.
3. `migrations/202610140003_learning_records.sql` — atomic assessment submissions, completion checks, certificate evidence and ordering.
4. `migrations/202610140004_validation.sql` — question validation and course classification operations.

Do **not** run `schema.sql` or `baseline.sql` against the existing project. `schema.sql` is the generated fresh-install definition. `baseline.sql` is the historical starting point used by offline tests and the generator.

These migrations do not change Clerk, user records or user roles. The obsolete `lesson_progress` table, if present, is first copied into `lesson_completions`, then removed. Database grants for browsers are deliberately narrowed: public course metadata remains readable; content and learner data are served through authorized application routes.

Apply the matching application changes before authoring new material. The old application does not support the new draft/publish workflow and still has retired quiz endpoints.

After all four scripts succeed, run `verify-foundation.sql` and check the expected values. Report any SQL error verbatim, omitting credentials. The app can then be verified against the upgraded database and deployed together with this change.

Validation performed offline: fresh schema installation, upgrade from the observed live column layout, preservation of user rows, cross-course constraints, draft isolation, stale-edit rejection, assessment idempotency, best-score retention, rollback on a simulated storage failure, grading snapshots, completion/certificate requirements, trusted-service permissions, and navigation order. This does not replace checking the actual hosted database after migration.

## Additional migration: resource revisions

All five migrations, including resource revisions, have now been applied to this project. The user also ran the resource verification script. Do not repeat successful migrations. Read-only API checks confirmed the resource source column, service access to the authoring reader, denied anonymous reader access, and three preserved accounts (one instructor and two students). Courses, assets, associations and drafts remain empty. Application deployment and signed-in hosted acceptance remain pending.

The following instructions are retained as the migration procedure for an environment where the resource migration has not yet been applied.

Run only `migrations/202610150001_revision_resources.sql`, then run the read-only `verify-resource-revisions.sql`. All checks in the verification result should be true. The live preflight recorded three users and zero courses, items, assets, associations and drafts; the migration preserves account infrastructure.

The new migration prevents explicit attachments and embedded files from leaking out of a draft. Resource associations change with publication, and authoring content/resources/version load together under one database lock. The updated application requires this migration before deployment or authoring.

If the migration reports that existing resource links and pending drafts need review, its transaction makes no changes. Stop and retain the exact error. Those old records do not identify which links were meant to be public; do not guess by publishing or deleting them. Review them individually before retrying. The empty preflight means no such review was needed at the time of preparation.

Apply during a quiet authoring period, then deploy the matching application. Older direct-attachment requests will fail safely after migration and ask the author to reload. Do not remove the database guard to restore that old behavior. If application deployment fails, keep authoring paused and correct/redeploy the application; rolling back application code does not reverse the migration.

Do not run `schema.sql` or `baseline.sql` on the existing project. No further content reset is required.

## Course asset library migration

After the five preceding migrations, apply `migrations/202610190001_course_assets.sql` once. It creates course-library membership and default image descriptions, backfills known asset relationships from published associations and saved drafts/history, and tracks later published associations. It does not make storage private or delete existing assets/accounts.

The project owner has confirmed this migration was applied. Do not rerun it. Later image picker, presentation, and saved-draft lesson preview changes need no additional SQL. See `docs/course-asset-library.md` for scope and verification.

The empty-database observations above are historical preflight records from October 14–15, 2026. The database now contains authored course content; do not use those observations as a basis for a reset.

## Course-specific asset names (pending owner application)

Apply only migrations/202610200001_course_asset_names.sql after the six existing migrations and before deploying this release. It adds nullable course_assets.display_name with a length/nonblank constraint; existing rows fall back to assets.title. It does not rename storage objects, change URLs, remove content, or alter accounts. No manual backfill is required. See [asset names and downloads](../docs/asset-names.md).

## Optional course asset tags

Apply only `migrations/202610230001_course_asset_tags.sql` for this update, after the earlier course-asset migrations. It adds an empty-default tags array and validation, preserving files, names, captions and accounts. Apply before deploying the matching application. The generated schema.sql remains for fresh installations only.
