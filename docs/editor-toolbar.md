# Responsive editor toolbar

The idle desktop toolbar has two rows: text formatting and content insertion. It uses consistent compact controls, short labels, and heading/list selectors instead of separate buttons for every variant. Find, language, highlight, and editing guides share the formatting row. The LaTeX typing hint is available on Formula rather than occupying a row.

Container queries respond to the actual editor width:
- Above 760 px: all enabled tools are visible across two rows.
- At 760 px and below: less frequent formatting controls are available through More.
- At 560 px and below: Insert tools opens the insertion choices; list and inline-code controls move into More. Touch targets are 44 px tall.

Table actions, code language/filename/line numbering, callout choices, search and LaTeX activation appear in contextual panels. Python diagnostics only appear while a code block is selected. The terminal dialog is rendered outside the toolbar to avoid clipping in the phone scroll container. Editor settings and course tool-pack restrictions are unchanged.

Controls keep native keyboard behavior and accessible names. Expanders expose their state and Escape closes the compact menus. Heading and list changes use the existing editor commands. Enter in the filename field commits the name without submitting the containing lesson form.

Validation: inspected desktop and mobile screenshots; checked layouts at 1280, 900, 768, 640, 390 and 320 px with all packs enabled. Desktop was two rows; none of these widths produced horizontal page overflow. Browser exercises covered More/Insert, find, heading/list selection, table actions, code language and filename completion, and terminal insertion. Type checking and production build also verified. No database changes or new dependencies.
