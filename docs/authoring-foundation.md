# Authoring foundation: intent and delivery plan

Status: proposed design; documentation groundwork only.
Date: 2026-10-14.

## Purpose

Make the existing course authoring tools dependable and easier to maintain before adding functionality. An author should always know what is saved, what learners can see, and whether an action could overwrite work.

This document is the tracking entry point for the effort. The acceptance scenarios in [authoring-acceptance.md](authoring-acceptance.md) define completion. They are specifications, not evidence of passing tests.

## Baseline and scope

The local database foundation introduces shared course items, drafts, revisions, assets, version checks and atomic learning-record operations. Its migrations have been applied to Supabase. The matching application changes remain local as of this document's creation. See `docs/foundation.md` in that delivery for its verification record and limitations; that file is separate from this documentation-only change.

The review covered local source, not a completed signed-in browser acceptance pass. Existing database and sequence tests do not establish that the authoring workflows work end to end.

This effort improves the current lesson, page, assessment, resource, ordering and import/export workflows. It does not introduce new content types, collaboration, AI authoring, a question bank, private file delivery, new LMS integrations or a replacement editor. Keep the existing Next.js application and Supabase database.

All Git commands, commits, branches, pushes and GitHub publishing are handled by Michael. A draft pull request records intent; it does not mean implementation is complete or ready to deploy.

## Proposed architecture decision

Separate four responsibilities inside the existing application:

| Boundary | Owns | Must not own |
| --- | --- | --- |
| Authoring interface | Fields, editor surfaces, dialogs, outline, accessible feedback | Database writes or independent definitions of publication |
| Editing workflow | Loading, unsaved changes, saving, retries, conflicts and publication actions | Type-specific rendering and database table details |
| Content rules | Runtime validation, document compatibility, item revision boundaries and ordering rules | Browser state or authentication providers |
| Persistence and access | Permission checks, scoped queries, atomic operations and storage access | UI wording or form state |

Start with ordinary modules, shared components and a shared editing controller. Extract them from a working vertical slice. Do not create a generic form framework or speculative plugin platform. Keep type-specific lesson, page and assessment fields explicit.

### Behavioral contracts

1. **Saving preserves work.** A failed request does not clear the editor or navigate away. Loading errors do not become blank editable documents. A successful save records the returned version and leaves the editor in a clearly saved state. Leaving with unsaved changes requires an intentional choice.
2. **Publication is explicit.** Saving a draft does not alter learner-visible content or resource associations. Uploading a file is independent of publishing its use. A publish action applies the intended revision atomically. Unpublish hides the item; archive preserves its records and history. Resource URLs remaining public is a separate storage limitation, not a publication guarantee.
3. **Conflicts are recoverable.** Expected versions accompany mutating operations where concurrent edits can overwrite decisions. On a conflict, preserve the local work and offer deliberate reload/recovery; do not silently overwrite or blindly retry. Network failures with uncertain outcomes require reconciliation before repeating a publication action.
4. **An item revision is coherent.** The target boundary includes learner-visible content and settings, resource associations, and assessment questions where applicable. Current question editing and attachments do not yet meet this target. Moving questions into that boundary requires a separate migration and review. Existing attempt snapshots and certificate evidence remain immutable.
5. **Ordering has one authority.** One authoring outline owns the complete mixed sequence. Learner navigation uses the same ordering rules. Moves validate the affected group, membership and expected sequence version. An atomic transaction alone is not a stale-tab check.
6. **Documents survive editor changes.** Store a document-format version separately from the item's revision number. Keep definitions needed to read existing blocks available even when insertion controls are hidden. Validate before saving; unsupported blocks must not be silently discarded. Existing formats need an explicit compatibility/migration path.
7. **Content has consistent interpretations.** Each supported block has a defined stored shape, validation, editing, learner rendering and export behavior. Export formats need not preserve every interactive feature, but omissions must be disclosed or represented by a documented fallback. Validate and escape links and attributes at rendering boundaries.

### Workflow vocabulary

Keep publication status separate from editor state. A published item can also have a saved draft and unsaved local changes.

Editor states: loading, load failed, unchanged, unsaved, saving, save failed, conflict. Successful saving transitions to unchanged only for the data actually acknowledged by the server. Either freeze editing during a request or preserve changes made while that request is in flight as unsaved.

Actions: save draft, publish changes, unpublish, archive, restore as draft, load revision into editor. Loading a revision never publishes it and must not silently replace unsaved work. Labels and confirmation text must describe these actions accurately.

## Delivery plan

Use separate reviewable increments. Checkboxes below mean implemented and verified, not merely documented.

| Increment | Scope and deliverable | Exit gate |
| --- | --- | --- |
| 0 — Intent | This design, acceptance scenarios and draft PR text | Documentation reviewed; no runtime changes |
| 1 — Authoring reliability | Fix unintended form submissions, image editing dependency, missing errors and archive wording; extract shared request/error handling and editing state through the lesson editor | A01–A05 and A12 pass for lessons; browser evidence recorded |
| 2 — Publication consistency | Close draft resource visibility gap; define and implement revision-aware attachments and assessment questions; cover archive/restore conflicts | A06–A09 pass; migration upgrade and existing records verified |
| 3 — Shared editing and outline | Apply the proven editing controller to pages/assessments; consolidate duplicate outline controls and enforce complete-group ordering/conflicts | A01–A05 pass across editors; A10 passes |
| 4 — Document durability | Shared block definitions/adapters, format versioning, compatibility checks, import/export fixtures; bounded resource/history loading | A11 and A13 pass; existing documents still render and reopen |

The known draft-resource visibility gap is a release blocker for relying on draft isolation. It can be delivered as a focused fix ahead of the broader increment 2 work. Do not wait for the full architecture to address it.

- [x] Record proposed boundaries, scope and acceptance scenarios.
- [ ] Confirm design decisions during GitHub review.
- [ ] Deliver increment 1 with recorded browser verification.
- [ ] Close the draft-resource visibility gap before publishing course material under the new workflow.
- [ ] Complete increments 2–4 and record evidence against their acceptance gates.

## Change and rollout rules

- Do not rewrite the four already-applied database migrations. Any additional database changes use new migrations and preserve account infrastructure, content history and learner evidence.
- Keep generated database definitions aligned with migrations. Shared runtime validation complements generated types; it does not replace database constraints.
- Land changes through existing routes initially, with thin adapters where necessary. Retire duplicate paths only after their replacement has coverage and callers have moved.
- Prefer additive database changes. Before each schema release, document application compatibility, backfill validation and a recovery procedure; do not assume reverting application code reverses a migration.
- Use dedicated test content/accounts for hosted acceptance. Never reset production to run tests.
- Record verification per increment: exact behavior checked, environment, result and unresolved limitations. Test pure rules locally, transactional behavior in PostgreSQL, and browser/Clerk/Storage integration in a suitable hosted or local environment.

## Decisions still requiring implementation review

- Exact revision representation for assessment questions and attachments, including conversion of existing associations.
- Whether item module/placement changes publish with the item or use a separately versioned structural operation. The UI must expose the chosen behavior clearly.
- Course-outline version storage and migration strategy for existing positions.
- Recovery UX for uncertain saves and stale edits; manual saving remains the baseline. Autosave is not part of this proposal.
- Export fallbacks for graphs and interactive quizzes, and the compatibility rules for document-format upgrades.

## Source anchors

These anchors describe the local baseline and may not exist on the remote default branch until the separate foundation delivery is committed.

- `src/lib/contentRoutes.ts`: shared content operations and version handling.
- `src/app/admin/courses/[slug]/lessons/[lessonId]/page.tsx`: representative edit/save lifecycle.
- `src/app/admin/courses/[slug]/assessments/[assessmentId]/page.tsx`: independent question/settings operations.
- `src/components/TipTapEditor.tsx`, `src/components/editor/Toolbar.tsx`: editor compatibility and form-button defects.
- `src/components/CourseItemManager.tsx`, `src/app/admin/courses/[slug]/CourseDetailLayout.tsx`: overlapping outline controls.
- `src/components/LessonAssets.tsx`, `supabase/migrations/202610140002_content_foundation.sql`: resource visibility and draft persistence.
- `tests/database.mjs`, `tests/sequence.mjs`: existing regression coverage, not browser acceptance.
