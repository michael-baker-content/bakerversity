# Authoring reliability pass

This pass strengthens existing authoring workflows without adding new assessment types or changing enrollment requirements.

## Changes

- Multiple-choice answers retain their correct selection when blank options are removed or earlier options are deleted. Removing the selected answer requires choosing another answer.
- Shared server validation checks question types, meaningful content, answer options, and accepted answers, and clears fields from previous question types.
- Course-level assessments appear in the main Course Content section.
- Assessment settings and course pages use the same version-aware draft session as lessons. Saving stays in the editor, with a confirmed return-to-overview link. Conflicts and uncertain save responses block unsafe repeated saves and offer recovery downloads.
- Creation, question mutations, resource requests, history, student submission, and feedback report failures while retaining local work. Feedback is only marked saved after confirmation.
- Response review uses the question snapshot recorded with the attempt, preserving the original wording.

## Verification

Run `npm run typecheck`, `npm test`, and `npm run db:check`. A production build also checks application integration.

Run `npx playwright install chromium` once, then `npm run test:smoke`. On Windows with installed Chrome, PowerShell can use `$env:SMOKE_BROWSER_CHANNEL='chrome'` before running the smoke test.

The smoke test creates a temporary Next application containing the actual authoring pages and student assessment component. An isolated PGlite database applies the real baseline and migrations. The test covers lesson creation/save/publish/return, assessment question creation/editing and answer mapping, published question locks, learner grading, validation failures, version conflicts, ambiguous saves, recovery downloads, and course-page publishing/history. GitHub checks install Chromium and run it automatically.

This fixture intentionally substitutes authentication, API routing, and the overview shell. It does not exercise Clerk, production route authorization, Supabase networking/storage, or deployment configuration. It never reads local environment files or writes to live courses. Its temporary app directory remains available for diagnostics; it contains a node_modules junction, so do not recursively delete through that junction.

Database tests additionally cover all four question types, feedback persistence, incorrect answers, best-score retention, historical snapshots, draft isolation, and stale writes.

## Existing boundaries

Published question sets remain locked: unpublish before changing questions. Versioned drafts for entire question sets require a separate design/migration. Free-response answers support instructor feedback and are not part of the automatic score. Lesson editor and overview preview links now open an instructor/admin-only saved-draft preview, including draft attachments. Public lesson URLs continue to show published content. Course-page and assessment previews still use their existing published views. Student assessment submission still requires sign-in.

No database migrations are introduced by this pass.
