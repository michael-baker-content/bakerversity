# Responsive editor toolbar

Formatting and insertion share compact controls. Categories appear in the order Media, Learning, Technical. Course-enabled tool restrictions still apply; hiding a tool never removes saved content.

Widths refer to the editor container except where explicitly noted:

- Below 530px: additional formatting is behind More.
- From 530px: formatting tools display directly.
- Below 660px: Insert tools contains expandable categories.
- From 660px: the categories are available directly as dropdowns.
- Above 760px: Text and Insert row labels appear; Image, Callout and Quiz display directly alongside the Technical dropdown.
- At 860px **browser width**: Technical displays its tools directly. This matches the main `.page` maximum width; its inner editor cannot reach 850px because of page padding.

Controls can wrap when space is insufficient. Expanded formatting and insertion panels use their own rows. More, Insert tools and the heading selector share a caret and bordered styling. Bold and Italic have padded hit areas. On small screens the toolbar can scroll vertically to avoid covering the entire editor.

Lesson and course-page editors have one Download button opening a native modal with HTML, Markdown and plain-text choices. Escape or Cancel closes it and returns focus. Import from file exposes supported extensions within its disclosure before opening the file picker.

Contextual table/code/callout/search controls remain unchanged. The component catalog and category grouping do not introduce new document nodes or require a database migration. Two-column components are still planned.

Browser smoke coverage exercises mobile category disclosure, keyboard access, ordinary insertion and the download dialog. Run the smoke harness in GitHub or against an explicitly authorized test setup; it starts a server. Local type checking and pure regression tests do not substitute for browser layout review.
