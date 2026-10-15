# Authoring resource revisions

Status: database migration applied; application deployment and signed-in hosted acceptance pending.

## Problem and resulting behavior

Previously, Attach wrote immediately to the learner resource list, and saving an item draft also added any referenced files to that list. A published lesson could therefore expose a resource that appeared only in its unpublished draft.

The editor now treats attached resources as local selections. Save draft stores those selections with the content revision; Publish applies the content and resource associations in the same transaction. Removing a selection also follows draft/publication rules. Uploading to the library remains independent and does not attach a file to any item.

This behavior is wired into lessons, pages and assessment settings. Assessment **questions** remain outside the shared revision boundary; this increment does not claim to complete that later work.

## Implementation

- `resources` in draft/revision snapshots contains the explicit `{asset_id, purpose}` selections. API and database validate their shape; the database also validates ownership/access. Duplicate selections are canonicalized.
- `item_assets` remains the learner-facing current association set. Its new `source` column distinguishes explicit attachments from resources derived from embedded registered URLs. Publishing recomputes embedded associations, so removed images/slides do not leave stale automatic links.
- `save_content` retains its existing signature and expected-version check. Resource associations, source content, revision records and draft deletion commit together or roll back together.
- `get_authoring_content` loads the source record, effective draft, resource selections and expected version under the item lock. The API no longer assembles those pieces from separate HTTP queries.
- A database trigger rejects direct resource association writes outside the publication operation. The old attachment POST endpoint returns 410 and asks the author to reload. This also protects the migration/application rollout interval.
- Existing associations without pending drafts are retained as explicit attachments. Their original source is unknown, so migration does not silently remove them.
- Migration refuses ambiguous legacy items that have both a draft and existing links. It does not invent historical intent. Preflight on the live project found none: all course/resource tables were empty, with three users preserved.
- Historical revisions without resource selections are unchanged. Loading one retains the current selections and displays an explanation. Revisions saved after this migration record their selections.

## Verification

Recorded results: PostgreSQL/resource-upgrade tests, authoring state/resource validation tests, sequence tests, generated-artifact checks and the production build all passed. The Chromium resource-selection scenario also passed using the isolated harness. The user reported successfully running the resource migration and verification script in Supabase. Subsequent read-only live API checks confirmed the resource source column and authoring read operation are available, anonymous access to that operation is denied, and all three accounts remain intact (one instructor and two students). Courses, assets, resource associations and drafts remain empty. These checks do not replace signed-in hosted acceptance of the updated application.

The PostgreSQL regression suite exercises:

- No published attachment or embedded-file changes on draft save or draft removal.
- Publication, removal and restoration of resource selections with content.
- Ownership checks, malformed selections, canonical duplicates and stale-version rejection.
- A simulated failure during resource insertion rolls back content, links, history, draft and version together.
- Direct inserts, updates and deletes fail even under the trusted service role; the publication operation succeeds and restores its transaction-local guard afterward.
- Consistent authoring reads, item-kind checks, browser-role denial and authorized service access.
- Upgrade stops safely on ambiguous legacy records, then preserves accounts, historical revisions and reviewed existing links on a valid upgrade.

Browser scenario: `tests/browser/resource-authoring.js`, run through Playwright CLI against a fresh `npm run test:authoring:harness` session. It checks that Select resource performs no mutation, changes dirty state, survives draft save/reopen, and is included in publish/removal actions. Its API is simulated; the PostgreSQL tests independently verify the real transaction. Signed-in hosted checks remain required after deploying the updated application.

## Deployment handoff

Steps 1 and 2 are complete for the existing project; do not repeat the migration. Continue with deployment and hosted acceptance.

1. In Supabase SQL Editor, run only `supabase/migrations/202610150001_revision_resources.sql`.
2. Run `supabase/verify-resource-revisions.sql`; all first-result checks should be true. Verify the account count remains unchanged.
3. Deploy the matching application through the user-managed Git/Vercel workflow.
4. With dedicated test content, verify A06 and resource-related A09: learners retain the old content and resource list while the instructor edits/saves a draft; Publish switches them together; loading history alone never publishes.

The first four migrations are already applied and must not be repeated. No account changes or content reset are needed. The full implementation is not live until migration and deployment are complete.

## Limits and later work

- Public file URLs remain public; publication isolation controls links in the course, not storage confidentiality. Previously distributed URLs cannot be recalled by removing a link.
- Shared file metadata remains library-level metadata; this change revisions attachment membership and purpose, not every asset property.
- The library's existing 200-result limit remains. A selected older resource absent from that list is shown by ID rather than silently omitted from the saved selection.
- Real multi-connection concurrency, signed-in authorization, storage delivery and cross-browser checks are not simulated by PGlite or the browser harness.
- The read operation uses a shared item lock; multi-connection lock ordering/performance should be exercised before scaling concurrent authors.
- Archive/restore versioning, full assessment question revisions and the unified course outline remain separate increments.

