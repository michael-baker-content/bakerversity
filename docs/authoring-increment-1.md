# Authoring increment 1: lesson-editor reliability

Date: 2026-10-14 (America/Los_Angeles).
Delivery: local changes only; no Git commands, publishing, deployment or Supabase mutations performed for this increment.

## Implemented

- Shared request handling distinguishes validation failures, version conflicts and uncertain mutation outcomes. Requests time out after 30 seconds; mutations are never automatically retried.
- A shared editing-session reducer/controller tracks the acknowledged snapshot and returned version. Successful saves keep the editor open. Edits made while saving remain unsaved. A late save cannot update a different lesson's editor.
- Failed lesson loads show a retry screen rather than an editable blank form. Aborted/stale load responses are ignored.
- Conflicts and uncertain saves preserve local work and pause further saves until an intentional reload. A JSON recovery copy contains the current fields and base version. It is a reference copy, not an automatically importable backup.
- Unsaved changes prompt before ordinary in-app link navigation, document unloading, and revision replacement. Chromium Navigation API traversal protection also covers Back/Forward where cancellation is supported. Same-document traversal in browsers without that API is not yet covered; this prevents claiming universal A04 completion.
- Lesson upload failures restore the controls and display errors. Saving is disabled while the slide upload is pending.
- Image editing works with math insertion disabled and updates the selected image. Image, callout, terminal, math and graph controls have explicit non-submit buttons. Toolbar actions can be activated with the keyboard.
- Assessment question-add failures now show an error and preserve the form. Assessment archive confirmation accurately describes preservation of records. The full shared editing workflow has not been rolled out to assessments or pages.

## Verification

Passed: TypeScript checks, the production build, the existing PostgreSQL regression suite, course-sequence tests, generated schema/type drift checks, and the new authoring request/state tests.

Browser verification used Chromium and the actual lesson/editor components inside a separate Next.js harness with a simulated API. No Clerk session or live Supabase records were used. Simulated HTTP failures intentionally produce network-console errors. The existing Tiptap development SSR warning appeared; the production build passed. This is not evidence of hosted authentication, authorization or storage integration.

| Acceptance area | Observed evidence | Remaining gate |
| --- | --- | --- |
| A01 | Denied load hides form; retry loads the saved server fixture | Hosted access/session checks |
| A02 | Validation failure preserves fields; a simulated committed-but-lost response blocks retry and reconciles after reload | Hosted/network integration |
| A03 | Two consecutive saves use updated versions; editing during a slow save retains unsaved edits | Hosted integration |
| A04 | Canceling link navigation preserves editor; dismissing Chromium Back warning preserves unsaved work; revision loading asks before replacement | Other browsers, full navigation/accessibility pass |
| A05 | Simulated conflict preserves local work, disables blind retry and offers a recovery download | Real two-session hosted check; database version checks already have separate regression coverage |
| A12 | Image update with math disabled, keyboard callout activation, callout insertion and terminal insertion do not submit the lesson | Complete focus, screen-reader and dialog audit |

These results are evidence for the lesson vertical slice. They do not mark the entire authoring plan or every acceptance scenario complete.

## Reproduce the isolated browser checks

1. From the project, run `npm run test:authoring:harness` with Node 24 and installed project dependencies. It creates a temporary copy of the relevant components and starts a simulated application on port 3101. It does not copy `.env.local`, use real application middleware or expose a bypass in the production app.
2. Open `http://localhost:3101/admin/courses/test` in a fresh Playwright CLI session. Verify the isolated-test banner and inspect the page snapshot.
3. Run the Playwright CLI `run-code --filename=tests/browser/lesson-authoring.js` against that session. The script checks saving, pending edits, error recovery, conflicts and content controls. It assumes a fresh fixture and starts from the course page.
4. Confirm the final state: title `Unconfirmed local work`, status `No unsaved changes.`, mode `normal`, no disabled save button. Native confirmation dialogs can cause the CLI to yield before the script finishes; inspect the final snapshot after it continues.
5. Separately check Back/Forward and revision-discard prompts. Stop the harness with Ctrl+C and close its browser session. Temporary harness files may be retained for diagnosis; they are outside the repository.

The browser scenario is not part of `npm test` or CI yet; those run the deterministic request/state and existing database/sequence suites. Browser tooling is not added to runtime dependencies.

## Files in this increment

- `src/lib/authoring/request.ts`
- `src/lib/authoring/session.ts`
- `src/lib/authoring/useAuthoringSession.ts`
- `src/lib/authoring/useUnsavedChanges.ts`
- `src/app/admin/courses/[slug]/lessons/[lessonId]/page.tsx`
- `src/app/admin/courses/[slug]/assessments/[assessmentId]/page.tsx`
- `src/components/TipTapEditor.tsx`
- `src/components/editor/Toolbar.tsx`
- `src/components/LatexModal.tsx`
- `src/components/MafsGraphEditor.tsx`
- `tests/authoring.mjs`
- `tests/browser/lesson-authoring.js`
- `scripts/authoring-harness.cjs`
- `package.json` (test scripts only in this increment)
- This verification record and `docs/authoring-increment-1-pr.md`.

Some files already contain changes from the earlier database/application foundation. Review their complete pending differences before assembling a PR; this file list does not isolate earlier uncommitted changes automatically.

## Still open

Draft-resource visibility remains a release blocker before relying on publication isolation. This increment makes no schema changes and does not fix that gap. Complete revision boundaries, one course outline, page/assessment editing-state adoption and document-format compatibility remain later work. Do not enable automatic save retries or autosave until uncertain-outcome reconciliation has a stronger server-side contract.
