# Student lesson presentation

The lesson viewer now uses a framed reading surface, a larger title and introduction, a module label and lesson-position badge, a completion panel, and previous/next navigation cards. Shared presentation components live in LessonPresentation.tsx.

The shared student sidebar now shows the course title, readable module headings, numbered items, item types and optional labels. The current item has an accent treatment, text indicator and aria-current. Long titles wrap rather than truncate. Existing course sequence and destination helpers remain authoritative; numbering indicates order, not completion.

On phones, course contents use an inline disclosure rather than a fixed overlay. The control exposes expanded state; Escape closes it and restores focus. Desktop contents remain independently scrollable and sticky. Shared sidebar changes also appear on course pages and assessments that use LessonSidebar.

Validation: type checking, sequence tests and production build passed. An isolated Next.js preview with real presentation/sidebar/renderer components and sample content was visually inspected at desktop and 390px phone widths, including dark mode. Browser checks confirmed no horizontal page overflow, a single desktop current-item marker and mobile disclosure/Escape behavior. The preview used a simplified site header and fallback fonts; hosted checks with real course content remain appropriate after deployment.

No database changes, Git commands or deployments were performed.
