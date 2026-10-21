# Course asset names and downloads

Status: implemented locally; database migration requires project-owner application before deployment. Live Supabase downloads and browser smoke checks have not been exercised locally.

## Author workflow

Expand an uploaded file in Course asset library or Choose a course image. Edit **Asset name** and choose **Save details**. Images also expose independent default alt text and caption fields. Unsaved edits survive library filtering and are protected when leaving the editor. The original filename initializes the visible name; storage filenames and URLs never change.

Names are shared within a course, not per lesson placement, and apply to all file types. The same asset can have different names in different courses. Renaming changes existing resource labels immediately without republishing lessons. Search covers the course name, original title, and original filename. Existing assets use their current title until renamed. Alt text and captions remain independent.

## Downloads

Uploaded assets have a Download action in the library. Published resource links marked download use the named download; other resource purposes keep Open behavior with a separate Download link. The filename is based on the current course asset name and the stored file extension. Invalid filesystem characters are replaced, Windows reserved names are prefixed, and names are bounded in length; Unicode names are retained.

The endpoint /api/assets/download validates course membership, published item/resource association, and the same free/public/authenticated/paid-enrollment rules used by learner pages. Course owners and admins may download their library assets without a published item, including from saved-draft previews. Other instructors do not receive owner privileges. It issues a non-cacheable redirect to a 60-second Supabase signed download URL with a download filename. Bytes travel directly from storage, avoiding app-server response-size limits.

External URLs remain Open links; the endpoint does not proxy arbitrary URLs. Browser-native Save image as does not use this naming route. Existing storage buckets remain public; this endpoint does not make known storage URLs private. A signed URL can remain valid until its short expiry after publication/access changes.

## Migration and verification

Run supabase/migrations/202610200001_course_asset_names.sql once before deployment. It adds only a nullable name and validation constraint. No data reset, physical file rename, or migration of existing references is required. Generated schema/types are included.

Tests cover course-specific naming, original metadata preservation, invalid names, Unicode filenames, search fallbacks, public vs draft resources, unauthenticated/private/paid access, enrollment, owner vs other instructor, course membership, external URL rejection, and storage-signing failure. The GitHub browser fixture additionally covers editing a name before inserting an image.

Manual verification after migration: rename a resource, load its student resource link, download it in Chrome, and confirm the saved filename and original contents. Check a PDF and image. Supabase storage header behavior is verified by this live check, not by local mocked signing tests.
