# Directory trees

Use **Directory tree** in the editor's Insert tools. Paste the original tree into **Directory tree source**; the preview updates as you type. Hide the source when finished, or choose **Edit directory tree** to change it later. Save the lesson draft or publish normally.

Supported input is the standard four-space tree format using Unicode branches (├──, └──, │) or ASCII branches (|--, +--, backtick--, |). Include a root name above the branches. Blank lines are ignored. Keep Markdown code fences out of the pasted source.

- Append a space, #, and a description to add a note: dialogue.json # Edit this file.
- Prefix a name with ! and a space to highlight it: ! dialogue.json.
- These two markers are reserved authoring syntax; avoid them in literal filenames.
- Trees are static and fully expanded by default, including existing trees without a saved preference. Enable **Allow folders to expand and collapse** per tree to make folders interactive. Students can copy the original tree, or copy an individual file path. Folder copy buttons are off by default; enable **Show folder copy buttons** in the tree editor to include them. This setting is saved per tree. Notes/highlight markers are excluded from copied paths.
- The tree scrolls horizontally on narrow screens. Folder controls work with the keyboard, and clipboard failures show a message.

Choose **Sage — Subtle**, **Indigo — Medium**, or **Amber — Strong** in the tree editor. Each palette adapts to light and dark mode. Sage is the default for new and existing trees without a color selection.

The source, color, collapse preference, folder-copy preference, and optional title are saved in a directoryTree Tiptap node. No database migration is needed. Invalid hierarchy produces an editor warning and retains the original text as a plain-text fallback. Limits are 30,000 characters, 500 lines and 32 nested levels.

Plain-text and Markdown exports preserve the title, source, indentation, blank lines, Unicode names, and annotation markers. Markdown uses a protected code fence and keeps trees nested in callouts. HTML downloads are standalone UTF-8 documents with centered, colored preformatted trees, light/dark colors, and print styles. All branches remain visible in exports; exported trees have no copy buttons or JavaScript dependency. The student renderer provides the styled, interactive version, including inside callouts. Images already created from trees are not converted automatically.

First-pass scope: text import/editing, preview, folders/files, collapse, copying, notes and highlights. Rich per-entry editing, drag-and-drop reordering, and automatic paste detection can be evaluated separately.
