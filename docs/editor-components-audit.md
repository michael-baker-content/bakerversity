# Component compatibility audit

Checkpoints 1–2, updated 2026-10-21. Catalog and categorized insertion controls are implemented. Recursive rendering is implemented with browser verification pending; columns are not available yet.

## Current boundaries

- Insertion: elementCatalog.ts owns stable insertion IDs, labels, course-tool requirements and categories. Toolbar.tsx binds commands locally. Formatting remains in WritingTools. Formula and Activate LaTeX are actions, not schema block types. No supported column parent contexts are advertised yet; add explicit context capabilities with checkpoint 3 validation.
- Schema: TipTapEditor.tsx registers existing saved node definitions independently of enabled insertion tools. Math shortcuts remain conditional. The catalog does not replace schema registration or filter saved documents.
- Rendering: buildRenderPlan in renderNode.ts traverses the document and reserves graph/quiz positions inside the existing HTML tree. HtmlSegment mounts React portals into those positions, preserving list, table and callout wrappers and existing math/highlighting/image/tree behavior. LessonRenderer keys the HTML owner and portals together by document content so replacing content resets interactive state safely. Unknown nodes show an explicit unsupported-content notice and retain any children. Quiz radio groups are scoped per instance.
- Exports: lessonMarkdown.ts flattens unrecognized wrappers and can lose unsupported atom content. lessonExport.mjs wraps editor HTML; editor.getText() uses node text serializers. Graph/quiz fallbacks need an explicit export contract. Do not infer export readiness from successful saving.
- Persistence: this checkpoint changes neither document JSON nor save/revision routes, so requires no database migration. Full component validation across save, load and import remains a checkpoint 3 task; arbitrary JSON storage is not evidence of compatible node support.

## Candidate column support

| Content | Initial direction | Required verification |
| --- | --- | --- |
| Prose, images, code, terminal, directory tree | First vertical slice | Nested rendering, width containment, editing, undo, exports |
| Tables and math | Enable after fixtures pass | Internal scrolling, narrow math, clipboard and serialization |
| Callouts | Enable after nesting validation | Prevent indirect nested components, preserve rich children |
| Graphs and practice quizzes | Hold until recursive renderer | Live nested interaction, sizing and useful export fallbacks |

No block is yet approved for columns. The next checkpoint should inventory all LessonRenderer consumers (including course pages, lesson/assessment surfaces and grading), introduce recursive fixtures, and preserve their existing behavior.

## Verification

Catalog checks cover stable IDs, categories and course-tool visibility. Browser smoke coverage now exercises mobile category disclosure with keyboard activation, closing/reopening groups, Escape, and restoring the desktop toolbar before ordinary insertion. Run that coverage in GitHub or against a user-started server. Visual light/dark, tablet wrapping and selection retention still require browser review.

## Recursive rendering checkpoint

Consumers verified by source inspection: LessonViewerPage (published and saved-draft lessons), public course pages, AssessmentTaker (intro, rich questions and explanations), and admin grading. All already use LessonRenderer and inherit this change. No save format or database changes are needed.

Pure fixtures verify nesting through callouts, lists and table cells, source ordering, static HTML parity, directory-tree preservation and unsupported-node fallback. GitHub browser coverage checks two nested quizzes with identical question IDs, independent answers, a nested graph, and replacing the document without stale interactive content or runtime errors. Browser checks have not been run locally; no server was started.

The HTML tree retains its native wrappers instead of placing separate HTML segments inside lists or tables. React owns only the interactive slot contents. Replacing the document remounts the owner and portals together. This also resets quiz answers when the document itself changes; ordinary quiz interactions retain state.

Remaining before component release: browser verification, narrow graph sizing, component schema/editing and parent validation, and explicit interactive export fallbacks. The insertion UI still has no column component.
## First component follow-up — 2026-10-21

The user narrowed the first composition to Text and image. Its implementation and verification are documented in [Text and image](text-image-component.md). General-purpose columns and the candidate technical-block matrix above remain deferred. The new component is available in the Components category, with browser acceptance still pending.