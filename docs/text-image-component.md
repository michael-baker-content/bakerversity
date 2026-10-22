# Text and image component

First component, implemented 2026-10-21. Browser acceptance remains pending; this is a focused composition, not an unrestricted column builder.

## Authoring

Open Components → Text and image. Choose or upload an image using the existing course image picker, provide required alt text, choose Image left or Image right, and insert. The component is added after the current top-level block without replacing its text. Focus enters the new text area.

The text area supports headings, paragraphs, lists and inline formatting. Text alignment offers Top (default), Center and Bottom relative to the image. This choice is saved with the component and retained in HTML downloads; stacked views use natural row heights, while Markdown and plain text have no vertical layout. Image settings opens the existing placement editor for alt text, caption, maximum width and replacement. Image left/right changes the actual child order, so desktop, mobile, screen readers and downloads agree. Stacked preview is local to the editor and does not change saved content.

Convert to regular content unwraps the text and image in their current order. Select component permits whole-component keyboard deletion; the label is a drag handle. Click the whitespace immediately above or below the component to place the cursor outside it. Arrow up at the start of its text or arrow down at its end also exits; selecting the component and using those arrows works too. Existing neighboring paragraphs are reused. At the document edge, a gap cursor appears; typing or Enter creates a paragraph only when needed. Navigation itself does not change the document. Structural actions have separate undo boundaries.

## Contract and validation

`textImage` contains exactly one `image` and one `textImageBody`, in either order. The body contains paragraphs, headings or lists; technical blocks and nested compositions are not allowed, including indirect nesting inside lists. Both nodes remain registered regardless of course tool packs.

This deliberately replaces the originally proposed generic `columns`/`column` first release with the user-approved focused text/image contract. Future component types can reuse the rendering foundation without relaxing this contract.

A shared validator is used for new content, draft updates, assessment questions, component-aware document loading and imported JSON. A ProseMirror transaction filter rejects invalid edits without changing the document. Unsupported HTML pasted into a text area is rejected with a message. Invalid component documents show a recovery download instead of opening a normalized editable copy. Direct database imports still need independent validation.

No SQL migration is required: content, drafts, revisions and recovery copies already store JSON. Older documents need no rewrite.

## Presentation and downloads

Equal-width columns stack at 540px of available component width. Image settings and captions are retained in student rendering. Long text can wrap within the text column. Light/dark presentation uses existing theme variables.

HTML download retains the responsive layout, alt text and visible captions. Markdown and text flatten children in saved reading order. Markdown includes the image URL, alt text and caption; plain text includes the image description, caption and URL because it cannot embed the image. Image assets still require their original URLs to be accessible; downloads do not bundle the image files.

## Verification

Local checks cover schema round trips, both child orders, structural undo, root-only transaction filtering, invalid source/alt text, unsupported nested content, student HTML, export schema structure, Markdown and plain-text output.

GitHub browser smoke coverage adds image selection, placement, text editing, side switching, stacked preview, unwrap/undo, draft save/reload and publication. It has not been run locally. Remaining manual acceptance: desktop/mobile light and dark views, image replacement, dragging, keyboard navigation, saved-draft/student views, and downloaded HTML layout. No local server was started for this work.
