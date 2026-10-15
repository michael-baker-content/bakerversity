# Suggested PR title

Make lesson saves recoverable and prevent accidental form submission

# Suggested PR body

Lesson authoring could expose an editable blank form after a failed load, leave saving controls stuck after a network failure, and navigate away after every successful save. Some editor controls also submitted the surrounding lesson form unintentionally.

This change establishes shared request and editing-state handling through the lesson editor. Successful saves retain the editor and update its version; edits typed during a save remain unsaved. Conflicts and uncertain results preserve local work, provide a recovery copy and block blind retries. Failed loads show a retry screen. Non-submit controls are explicit, and image editing no longer depends on enabling math tools.

The change also corrects assessment archive wording and displays question-add failures. Pages and assessments have not yet adopted the full shared editing controller.

## Validation

- Type checking and production build passed.
- PostgreSQL, sequence, generated-artifact and new authoring state/request checks passed.
- Chromium checks exercised the real lesson/editor components with a simulated API: repeated saves, edits during saves, failed loads, validation failures, conflicts, uncertain saves, recovery downloads and unintended form submission.
- See `docs/authoring-increment-1.md` for the reproducible harness, evidence and limitations.

## Remaining work

Hosted Clerk/Supabase integration and real multi-session browser checks remain outstanding. Same-document Back/Forward protection depends on the browser's Navigation API; full cross-browser navigation and accessibility acceptance is not complete. The draft-resource visibility blocker is unchanged and must be fixed before relying on draft publication isolation. No database migration is included.

This is one implementation increment of `docs/authoring-foundation.md`, not completion of the broader plan. If earlier foundation edits are also included in the branch, expand this description to cover the actual full diff before publishing.
