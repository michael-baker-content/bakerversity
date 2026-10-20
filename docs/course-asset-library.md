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

- An unassigned-files review/import screen, search and file-type filters.
- Per-file retry controls, drag-and-drop, and a persistent upload queue. Current failures are reported by filename; retry by selecting those files again after checking for completed uploads.
- Usage inspection covering published content, drafts, and revisions; deliberate archive/deletion rules.
- Private-asset access, if required. No SVG support or format conversion is introduced here.

## Validation

`npm test` includes an isolated database migration test covering pre-existing published and draft assets, default preservation on rediscovery, restricted database privileges, and protection against deletion of referenced files. `npm run typecheck`, `npm run db:check`, production build, and the existing authoring browser smoke test check integration. Live upload/authorization checks require the migration and a signed-in instructor; the smoke fixture does not test production Supabase storage or Clerk authorization.

The editor integration requires no migration beyond 202610190001_course_assets.sql. Browser smoke coverage verifies library selection, default descriptions, and a placement-specific alt-text override.
