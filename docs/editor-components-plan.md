# Editor components: implementation plan

Status: catalog, recursive rendering and the first Text and image component are implemented; browser acceptance pending. See [Text and image](text-image-component.md) for the narrowed first-release contract.
Prepared: 2026-10-20.

This is the kickoff checkpoint for a component system in Bakerversity. It records scope and acceptance criteria before implementation. It does not indicate that components are available or tested. Michael handles all Git commands and local server startup/shutdown.

## First release

The first implementation is the focused Text and image composition approved on 2026-10-21, with image-left and image-right options. General-purpose columns remain deferred. Introduce a shared editor taxonomy and one two-column component. Instructors can place supported content in either column, edit it within the existing document, and preview how it stacks on narrow screens. Preserve existing authoring, publication, recovery, and export behavior.

Defer nested components, additional layout templates, arbitrary column counts, drag-to-resize, custom CSS, mobile-order overrides, reusable cross-lesson instances, and a general plugin framework.

## Taxonomy

| Group | Category | Existing elements/actions |
| --- | --- | --- |
| Formatting | Text and structure | Emphasis, headings, lists, links, language, highlighting |
| Content blocks | Media | Images |
| Content blocks | Technical | Code, terminal, directory tree, block formula, graph, table |
| Content blocks | Learning | Callouts, inline practice quiz |
| Components | Composition | Two columns (new) |

These are author-facing categories, not replacements for Tiptap's block/inline schema groups. Inline formulas remain inline content. Assessments remain course items; the practice quiz is the embeddable block. Callouts remain content blocks even though they contain other content.

Keep frequently used formatting visible. Group insertion controls by category; allow categories to collapse on mobile. Preserve accessible names, keyboard focus, current selection and course-enabled tool visibility. Show a meaningful category label rather than an unexplained icon.

Create a small typed element catalog with stable IDs, labels, categories, required course tools and supported parent contexts. Keep editor commands, rendering and export implementations in their existing layers; the catalog identifies capabilities rather than importing heavy UI/renderers into every consumer. Do not make the catalog a second competing Tiptap schema. Validate catalog/schema consistency in tests.

## Original general-column proposal (deferred)

Proposed nodes:

- `columns`: a block container with exactly two `column` children.
- `column`: an editable region containing one or more supported blocks; an empty column contains a paragraph.
- First release: equal-width columns and fixed first-column-then-second-column reading order. Do not store arbitrary CSS or viewport-specific content copies.

Use one Tiptap document and editor instance. Column contents are real child nodes, not HTML strings or separate editor instances. This keeps saving, undo/redo, clipboard operations and selection within the existing document workflow.

Initially allow components at the document root only. Prevent another component anywhere inside a column, including indirectly through a callout or list. Tiptap content expressions alone may not enforce that indirect restriction: cover insertion, paste/import, document loading and server save validation. Reject unsupported changes while preserving the original document and offering recovery; never silently drop children.

Keep definitions needed to read existing content registered even when their insertion tools are disabled. Audit current conditional extension registration before enabling the component. Existing documents must not be rewritten merely because they are opened.

The document JSON should fit existing draft/revision storage. No SQL migration is planned; confirm this against actual validation and save paths during implementation. Use a documented document-compatibility check before enabling insertion. If explicit document versioning is needed, deliver it separately from item revision numbers.

## Rendering foundation

The original `LessonRenderer.tsx` handled graphs and practice quizzes only at the top level. Checkpoint 2 replaces that segmentation with recursive HTML rendering and React portal positions for interactive blocks; see the compatibility audit for verification and remaining work.

First establish a recursive rendering boundary that preserves normal rich-text wrappers and delegates interactive blocks wherever they occur. Reuse it for published lessons, saved-draft previews, course pages and assessment content wherever those surfaces render the same document format. Inventory actual consumers before changing them.

Do not nest isolated HTML renderers in a way that loses document ordering or creates invalid markup. Preserve code highlighting, math, image loading, directory-tree controls, and existing quiz behavior. Handle unknown nodes explicitly rather than returning empty output.

Use layout containers with `min-width: 0`. Switch to a single stack based on the component's available width, not only viewport width. First column comes first in the DOM and in the mobile stack. Preserve internal scrolling for wide code, tables, terminals and trees. Images respect both placement width and column width. Check graph sizing and quiz controls before enabling them in columns.

## Editing behavior

- Insert two columns with two visible empty editing regions and move focus to the first.
- Distinguish the component boundary and each column while editing; keep student presentation uncluttered.
- Provide explicit whole-component selection and a keyboard-accessible path to content before, between and after the regions.
- Support normal edits, undo/redo, moving the whole component, and deliberate removal.
- Provide “Convert to regular content”: unwrap first-column blocks followed by second-column blocks without losing content or attributes.
- Offer a stacked-layout preview without duplicating editable content or changing saved reading order.
- Keep unsaved-change and failed-save behavior consistent with the rest of the editor.

## Exports

HTML retains two columns with responsive stacking and print rules. Markdown and plain text flatten the columns in document order with clear block separation. Preserve every supported child's existing export representation. Do not claim interactive graphs/quizzes are preserved by a format that cannot represent them; provide an explicit useful fallback and document it. Audit these existing limitations before release.

See [the compatibility audit](editor-components-audit.md) for current boundaries and remaining checks.

## Delivery checkpoints

1. **Taxonomy and compatibility audit:** inventory insertion, schema registration, renderers, import/export and save validators; introduce the catalog and grouped toolbar without new layout nodes. Record which blocks can safely be enabled in columns.
2. **Recursive rendering:** establish nesting support and regression fixtures for ordinary content and interactive blocks. Keep current documents visually and behaviorally consistent.
3. **Two-column vertical slice:** schema, editable regions, responsive student rendering, stacking preview, unwrap action and document validation. Start with prose, images, code, terminal and directory tree; enable tables, math, graphs, callouts and quizzes only after their acceptance cases pass.
4. **Persistence and exports:** verify draft/publish/revision/recovery paths and all download formats with the same fixtures.
5. **Release review:** complete keyboard, mobile and light/dark checks; update documentation and verify GitHub browser checks before relying on components in live course content.

Each checkpoint should be reviewable and safe to back up independently. Do not expose a half-supported component to instructors. Use the [acceptance checklist](editor-components-acceptance.md) as the completion record, not as a claim that testing has already happened.

## Verification policy

Run appropriate schema, rendering, serialization and authoring regression tests plus type checking. Browser smoke coverage should include insert, edit both columns, save, reload, publish, view, unwrap and undo. GitHub can run the smoke harness; do not start a local server without Michael's instruction. Browser acceptance must use a server Michael starts or CI. Preserve existing content and never reset Supabase for tests.
