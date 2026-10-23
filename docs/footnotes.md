# Footnotes

Enable **Footnotes** in the course's editor tools. Use **Learning → Footnote** at the text cursor to write a note or reuse a note already on this page. Notes support paragraphs, bold, italic, lists, inline code and links; LaTeX and nested footnotes are excluded from this first version.

References appear as automatically numbered superscripts. Numbering follows the first reference to each note in document order. Repeated references share one note. Click a reference or Edit footnote in the editor's Footnotes section to edit its text. Shared edits update every reference. Remove this reference deletes only the clicked reference; deleting the final reference removes the note from the section. Undo restores changes.

Students find Footnotes after the main content. Each number links to the note, and each note provides return links for all its references. Separate rendered documents receive separate anchor IDs, including assessment questions. Notes remain readable if the course later disables the insertion tool.

HTML downloads retain navigation; Markdown downloads use numbered footnote references and definitions and can be imported again. Text downloads include reference numbers and note text. Print includes the notes. No database migration is required.

## Storage and scope

An inline footnote node carries a stable ID and rich-text body. Shared references carry the same ID and body; edits update them together. Display numbers are derived rather than stored. Keeping definitions with references preserves notes on copying; inconsistent definitions for the same ID are rejected instead of silently overwriting text.

Footnotes are available in the main editor, including text-and-image text areas. The simplified slideshow description modal does not offer footnote insertion. Footnote bodies allow only basic text content; validation runs during authoring and server saves.

## Checks

Pure tests cover numbering, shared references, deletion, undo, validation, Markdown round trips, rendering, anchor scopes and course gating. Browser smoke covers create/reuse/edit/remove and saved-draft reload. The browser check runs in GitHub; local servers remain under the project owner's control.

Links within footnote text open in a new browser tab in student views, editor previews, and HTML downloads. Numbered references and return links remain on the current page.
