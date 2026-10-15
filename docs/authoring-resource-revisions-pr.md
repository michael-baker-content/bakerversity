# Suggested PR title

Publish resource associations with their content revision

# Suggested PR body

Adding resources or saving embedded files in a draft could change the resource list on an already-published lesson. This change makes resource selections part of the item's draft and revision, and publishes content and associations atomically.

Lessons, pages and assessment settings submit resource selections with their existing save operation. Uploads remain independent. Published associations distinguish explicit attachments from embedded-file references, allowing publication to remove stale automatic links. The old direct-attachment endpoint is retired and a database guard rejects direct association writes. A shared authoring read operation loads content, selections and version consistently.

## Migration

Apply `supabase/migrations/202610150001_revision_resources.sql` after the four existing foundation migrations, then run `supabase/verify-resource-revisions.sql`. Do not repeat the earlier migrations. The new application requires the new migration before deployment. The user has applied this migration and run its verification script on the existing Supabase project. Read-only API checks confirmed the new column and reader, denied anonymous reader access, and three preserved accounts. Deployment of the updated application and signed-in hosted acceptance remain pending.

Existing associations without drafts are preserved. If legacy drafts and associations coexist, the migration stops without changes so their intended publication can be reviewed. Older revisions are preserved without invented resource history. Accounts and learner evidence are unchanged.

## Validation

The production build, generated-artifact checks, state/sequence tests and isolated Chromium resource scenario passed. PostgreSQL regression tests passed and cover draft isolation, publication/removal/restoration, access checks, stale saves, rollback, direct-write protection, coherent reads and upgrade preservation. A browser harness scenario checks local selection and the draft/publish payload lifecycle. See `docs/authoring-resource-revisions.md` for reproduction and hosted acceptance steps.

Public storage URLs remain public. Assessment question revisions, archive/restore versioning and unified course ordering are not included. If earlier uncommitted foundation changes are included in the same branch, adjust this description to cover the full diff before publishing.

