# Authoring acceptance scenarios

Status: planned checks, not executed as part of the documentation groundwork.
Companion: [Authoring foundation](authoring-foundation.md).

Use a test course containing a lesson, page and assessment in one module, plus course-level content. Include a published item with a saved draft, two editor sessions, a reusable resource, and a separate learner account. Use dedicated test data; do not modify real learner evidence. Simulate network failures locally or in a test environment.

| ID | Scenario | Required observable result | Verification layer |
| --- | --- | --- | --- |
| A01 | Fail an editor's initial load or deny access | A clear error appears; no blank editable document can be saved over the item; retry is available where appropriate | Browser + API |
| A02 | Edit content, then fail or interrupt saving | Content remains in the editor; saving ends in a clear failure/uncertain state; retry/reconciliation does not duplicate publication; no navigation occurs | Browser + API |
| A03 | Save successfully, including typing while the request is pending | Acknowledged data and version are recorded; later local edits remain unsaved, or editing was explicitly disabled during the request; save-and-continue is possible | Browser |
| A04 | Navigate away or load history with unsaved changes | The author deliberately chooses whether to discard work; browser unload protection and in-app navigation are both checked | Browser |
| A05 | Open the same item in two sessions; save in one, then in the other | The second receives a conflict without losing its local work; recovery does not silently overwrite the first save | API + browser |
| A06 | Add an inline image and resource association only to a draft of a published item | Learners see the previous content and resource list; saving and reopening retains the draft; publishing changes both together | PostgreSQL + browser |
| A07 | Edit assessment settings and questions, then publish; simulate failure during publication | Settings, questions and associations publish as one coherent revision or none do; old attempts retain their question/grading snapshots | PostgreSQL + browser |
| A08 | Unpublish, archive and restore an item while another session has an older edit | Actions have accurate labels; stale actions cannot overwrite current decisions; restoration produces a draft; learning history remains intact | PostgreSQL + API + browser |
| A09 | Load an old revision and save it as a draft | Learners still see the published revision; restoration includes the defined revision contents; publishing requires an explicit action | PostgreSQL + browser |
| A10 | Reorder lesson/page/assessment together; repeat from a stale outline | The complete affected group remains valid, with no omitted-item collisions; stale changes are rejected; author outline, learner outline and next/previous agree | Pure rules + PostgreSQL + browser |
| A11 | Open/save/reopen documents containing every supported block with insertion tools enabled and disabled | Existing content survives; unsupported format versions produce a recoverable error; Markdown export preserves supported content and explicitly handles unsupported blocks | Fixture tests + browser |
| A12 | Use callout, image and terminal dialogs inside a lesson form, including keyboard navigation and math disabled | Insert/cancel actions do not submit the lesson; image editing works independently of math; focus and error feedback remain usable | Browser |
| A13 | Use more than 200 assets and more than 50 revisions | Older entries remain reachable through bounded loading; history lists do not fetch every full snapshot; selecting a revision loads only what is needed | API + browser |

## Document fixture coverage

Include paragraphs, headings, lists, bold/italic/code/link marks, tables, image alt text/captions, callout child content, code language/filename, inline/display math, terminal blocks, graphs and practice quizzes. Preserve localization examples containing XML-like tags, Unicode and literal punctuation. Exercise invalid link schemes and quoted attribute values at the rendering boundary.

Use the same representative documents for editor persistence, learner rendering and exports. Compare the meaningful document structure and rendered behavior; do not rely only on brittle full-HTML snapshots. Markdown/HTML/plain-text exports have distinct supported representations and should not be assumed lossless backups.

## Existing coverage and gaps

The separate foundation work includes PostgreSQL tests for constraints, permissions, grading, retries, rollback, account preservation, draft content isolation and version conflicts. Sequence tests cover explicit placement and mixed navigation. Those checks do not cover the resource visibility gap, the complete revision boundary, browser form submissions or signed-in authoring behavior.

Each implementation PR should reference the scenarios it addresses, add appropriate regression coverage, and record manual checks where automation is not yet available. An automated check passing at one layer does not satisfy the other layers listed above.

## Evidence record template

- Scenario IDs and item types:
- Application revision and migration state:
- Environment and test accounts (roles only; no credentials):
- Automated checks and results:
- Browser actions and observed results:
- Known limitations or failed scenarios:
- Test-data cleanup:

The groundwork change leaves every scenario above unverified. Completing this document is not completing the authoring effort.
