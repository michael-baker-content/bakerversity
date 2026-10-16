# Writing tools

The shared rich-text editor now offers:

- Find and replace within the current editor, with match counts, previous/next navigation, case matching, Unicode whole-word matching, replacement and replace-all. Enter in either search field navigates matches; Shift+Enter goes backward; Escape closes search. Replacements participate in editor undo and normal draft/publication saves. Search is literal, not regex.
- A yellow highlight toggle. Highlights persist in document JSON, published lessons and HTML exports, with explicit foreground/background colors for both themes.
- An editing-only invisible-character toggle, initially off: spaces, nonbreaking spaces, hard breaks and paragraph boundaries. Decorations are not stored or published.
- A selected-text language selector: English, Polish, or remove the override (Default / mixed). Stored inline language marks render as HTML lang attributes, including in HTML exports. This labels language; it does not translate or supply a spellchecking dictionary.

These tools are available wherever the shared editable TipTapEditor is used. There is no database migration and no live content was changed. Find searches text blocks, including table and callout text; it does not search separate titles or embedded node attributes such as quiz questions, formula source or terminal settings. Language selection requires selected text. Markdown and plain-text exports retain text but omit these new presentation/language marks; HTML preserves them.

Dependencies are pinned to 3.32.0 to match the editor. There are no paid extensions or external text-processing services.

Validation: type checking, schema/renderer tests and an isolated Chromium scenario passed. Tests cover Polish whole-word/case matching, search across formatting, safe published markup, saving/reopening marks, search/inspection without dirtying content, replace-all and undo. The browser harness uses a simulated API. Verify the shared editor in signed-in Vercel preview before merging; live acceptance is not implied by local checks.
