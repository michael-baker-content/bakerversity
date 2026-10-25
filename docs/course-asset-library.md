# Course asset library: first pass

## Delivered

The existing Resource library now receives its course context. It lists that course's assets with image previews, file links, pagination, and multiple-file selection. Uploads run sequentially, report progress by file, continue after failures, and register successful files with the selected course. Instructors can save default alt text and captions for images. Empty alt text is allowed. Defaults are course-specific and do not change existing lesson placements.

Course access is checked on the server for listing, uploading, and editing defaults. The new table is inaccessible to anonymous and authenticated database roles; trusted server access performs the course authorization. Files retain their existing public URLs and storage buckets. This is organization, not private storage.

## Deployment order

1. Run `supabase/migrations/202610190001_course_assets.sql` in the Supabase SQL editor once, after the existing migrations. It adds a table and trigger and backfills associations; it does not delete assets or modify accounts. Do not run the generated schema against the existing database.
2. Push the application changes and allow GitHub checks and Vercel deployment to complete. Git commands remain the project owner's responsibility.
3. Open a course's Course Management area and expand Course asset library. Select several images and supported documents, confirm their previews/links, save image defaults, and reload to confirm persistence. Verify another course does not list those uploads.

The application reports a library-loading error if the migration has not been applied. The additive migration can be deployed before the application.

## Existing uploads

The migration discovers assets through published item associations and asset IDs/storage paths/external URLs in saved drafts and revision snapshots. A file used by multiple courses appears in each. A trigger discovers later published associations without resetting edited defaults. This does not import arbitrary remote images lacking asset records. Unassigned files are retained; no course is guessed from ownership alone.

Course-aware Tiptap editors now associate direct image uploads immediately. The Image button opens the course library, with an Upload new image shortcut. Choosing an existing image copies default alt text and caption into Image settings for review and local override. Replacing an image preserves the current placement descriptions. The overview library is a standalone expandable section outside Course tools.

## Next increments

- An unassigned-files review/import screen and refinements to search/filter options.
- Per-file retry controls, drag-and-drop, and a persistent upload queue. Current failures are reported by filename; retry by selecting those files again after checking for completed uploads.
- Queue/search scalability refinements and deliberate revision-retention tooling.
- Private-asset access, if required. No SVG support or format conversion is introduced here.

## Validation

`npm test` includes an isolated database migration test covering pre-existing published and draft assets, default preservation on rediscovery, restricted database privileges, and protection against deletion of referenced files. `npm run typecheck`, `npm run db:check`, production build, and the existing authoring browser smoke test check integration. Live upload/authorization checks require the migration and a signed-in instructor; the smoke fixture does not test production Supabase storage or Clerk authorization.

The editor integration requires no migration beyond 202610190001_course_assets.sql. Browser smoke coverage verifies library selection, default descriptions, and a placement-specific alt-text override.

## Search and filtering: first pass

Search matches display names and original filenames literally and case-insensitively. Results update after a 300 ms typing pause; Search or Enter applies them immediately. Clearing the search field clears the applied search. Type filters are All files, Images, PDFs, and Other files. PDF detection checks MIME type and filename because existing resource uploads may use application/octet-stream. Sorting uses asset upload dates or natural name order, with asset IDs breaking ties. Reset restores the defaults. Both tile and text-list views use the same results.

The server authorizes course access and reads course membership in batches before filtering and returning 50 matches per page. This deliberately simple first pass searches the entire library without a schema migration; very large libraries will benefit from database-side filtering/indexes later. The API never searches other courses. UI requests cancel/ignore stale search results, and selections stay attached when filters change.

Run npm test for the search helper checks, including matches beyond 50 assets, Unicode names, literal wildcard characters, mixed upload types, and sorting. No new migration is required. GitHub runs the existing browser smoke test; local verification does not start a server automatically.

## Search refinements

The library now shows exact matching/loaded counts, removes Load more when all matches are shown, and remembers tile/list preference in browser storage. Storage restrictions fall back to tiles without breaking the library. Unsaved image description edits survive filtering and pagination; they are marked Unsaved with a Discard edits action. Save/discard before using that image, and confirm before closing a picker with pending description changes. Existing resource selections remain unchanged by searches.

Expanded browser smoke assertions cover live search, PDF filtering, result counts, view preference, and description edit preservation. Those assertions run in GitHub Actions; no local server was launched for this pass.

## Optional tags

Asset details include comma-separated tags for images and other files. Tags belong to the course, not the underlying storage object. Search files matches tags as well as the asset name and original filename, including in the image and slideshow pickers. Matching is case-insensitive. Blank tags and duplicate tags are removed; each asset supports up to 20 tags, each at most 50 characters.

The slideshow image modal also edits tags. Tags save independently of the checkbox for default alt text and captions. Uploads start untagged unless tags are supplied through the modal. Existing libraries start with no tags.

Apply migrations/202610230001_course_asset_tags.sql in Supabase before deploying the matching application.

## Usage and reversible removal

Apply `202610240001_asset_library_removal.sql` before deploying this update. Expanded assets offer **Usage & removal**, with links to saved content using the file. Drafts, published content, saved assessment questions, resource links, and revision history are checked. Active saved references prevent removal. References in archived content and revision history are retained without blocking library removal.

**Removed files** lists files removed from this course and offers restoration. Removal preserves the storage object, URLs, course metadata, other course libraries, and history. It does not reclaim storage or revoke public access. Publishing a resource association restores its library entry automatically.

Usage matching conservatively checks asset IDs, storage paths, and external URLs in saved JSON, so a literal mention can count as usage. Unsaved changes in other editors cannot be inspected. Current resource selections and pending asset metadata edits block removal in the open library.

The isolated asset-removal tests cover permissions, draft and published references, assessment explanations, history retention, restoration, and API authorization.

## Administrator permanent-deletion queue

Apply `202610240002_permanent_asset_deletion.sql` before deployment. Administrators open **My courses → Removed assets** for a global queue with a course filter. The queue includes files removed from at least one course; eligibility requires removal from every linked course for at least 30 days (the most recent removal starts the clock). Restoring a membership cancels eligibility; removing it again starts a fresh waiting period. The queue never automatically deletes files.

Current drafts, published content, course metadata, assessment questions, resource associations, and stored learner assessment records block deletion. Scans include courses without a library membership. Older revisions and archived content can be overridden by an administrator after acknowledging broken images/downloads and typing the file name. Historical snapshots are preserved; they do not preserve separate copies of files.

Deletion removes the stored upload, all course-library memberships, resource associations in archived content, and the asset record. External images are not deleted from the external host. A minimal service-only tombstone retains identifiers, the requesting administrator, override acknowledgment, and timestamps for audit and retry safety. Public caches or previously downloaded copies cannot be recalled.

A database reservation prevents restoration/reuse while storage deletion runs. Failed or interrupted deletion remains reserved in the queue; retry completes storage removal and database cleanup. A lost response should be followed by refreshing the queue. Reserved deletion is not reversible because storage may already be gone. Save guards reject stale file references, including a previously deleted external URL; replace such references before saving. Matching is conservative and can include literal URL/path mentions.

Tests cover administrator enforcement, all-course waiting periods, current-reference protection, archived/history overrides, stale saves, cleanup, and retry ordering. No live storage is touched by tests. Browser smoke verification remains in GitHub Actions.
