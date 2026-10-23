# Bakerversity course positioning

## The promise

Build technical lessons around the explanation: combine prose, code, mathematics, visual examples, and practice where the reader needs them.

Practical Localization Engineering is the first and currently only course. All current course content is free to read without logging in. Bakerversity is Michael Baker’s independent project, not yet a publicly available self-service course-authoring service. Stronger enrolled-student progress tracking remains a prerequisite for a commercial launch.

Use the existing course to demonstrate the editorial experience. Avoid unverified comparisons that say other platforms cannot support these formats. The useful distinction is how comfortably an author can combine them within a coherent lesson.

## Subjects to explore

These are editorial fit hypotheses, not validated demand or promised courses. Favor subjects where readers must connect an implementation to a numerical result or human consequence.

| Subject and audience | Example lesson | Fit with existing tools |
| --- | --- | --- |
| Accessibility engineering for frontend developers and designers | Calculate contrast, inspect HTML, and explain why a passing number does not resolve every usability issue | LaTeX, highlighted HTML/CSS, annotated images, callouts, practice questions |
| Search and retrieval evaluation for developers | Work through precision and recall on a small result set, then show the scoring code | Formulas, tables, highlighted Python, worked examples, quizzes |
| Observability and reliability for application developers | Explain latency percentiles using a small dataset and instrumentation examples | Code, tables, formulas, graphs, illustrative terminal output |
| Geospatial and civic data for developers and public-interest analysts | Explain coordinate systems and inspect a parks dataset for missing or inconsistent values | Code, diagrams/images, tables, downloadable resources; a natural editorial connection to Baker Parks |
| Data quality engineering for analysts moving into engineering | Write SQL checks, measure completeness, and distinguish a valid value from a useful one | SQL highlighting, formulas, tables, objectives, practice questions |

Start by testing one short lesson in accessibility engineering or search evaluation. Both can demonstrate the value of mixed-format authoring without requiring a new runtime or service. Reliability is another strong fit. Civic data offers a distinctive connection to Michael’s own projects, but keep the first lesson scoped to static examples and downloadable data.

## Boundaries to preserve in messaging

- Code blocks present examples; they are not executable coding labs.
- Mathematical graphs do not imply a general mapping or dashboard system.
- Practice quizzes do not imply automated assessment of arbitrary code.
- Current language labels support English, Polish, German, Spanish, French, and Czech; do not imply automatic translation or comprehensive multilingual course management.
- Draft publishing supports course revision; do not imply collaborative editing or public author onboarding.
- Do not advertise certificates, advanced progress tracking, or future courses as available.

## Evidence and next validation

The subject recommendations above are inferences about fit with the existing editor, not claims about market size. Useful primary references:

- [W3C: Localization vs. internationalization](https://www.w3.org/International/questions/qa-i18n/qa-i18n.php): the technical and cultural scope that makes localization a useful first example.
- [scikit-learn: Metrics](https://scikit-learn.org/stable/api/sklearn.metrics.html): concrete evaluation concepts that connect formulas with implementation.
- [OpenTelemetry: Signals](https://opentelemetry.io/docs/concepts/signals/): traces, metrics, and logs as material for observability lessons.

Before committing to another course, show a sample lesson to a few intended readers. Ask which explanation helped, what they would apply at work, and where they needed a runnable exercise. Use those answers to choose the subject and to distinguish content needs from actual software gaps.
