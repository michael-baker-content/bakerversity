# Component compatibility audit

Checkpoint 1, 2026-10-20. Catalog and categorized insertion controls implemented; columns are not available yet.

## Current boundaries

- Insertion: elementCatalog.ts owns stable insertion IDs, labels, course-tool requirements and categories. Toolbar.tsx binds commands locally. Formatting remains in WritingTools. Formula and Activate LaTeX are actions, not schema block types. No supported column parent contexts are advertised yet; add explicit context capabilities with checkpoint 3 validation.
- Schema: TipTapEditor.tsx registers existing saved node definitions independently of enabled insertion tools. Math shortcuts remain conditional. The catalog does not replace schema registration or filter saved documents.
- Rendering: LessonRenderer.tsx segments only root children into HTML, live graphs and practice quizzes. renderNode.ts recurses through static children, while HtmlSegment.tsx adds math/highlighting/image/tree behavior. Unknown wrappers flatten to their children; unknown atoms can disappear. Recursive rendering and explicit unknown-node handling are release prerequisites.
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
