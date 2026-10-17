# Assessment editor: questions first

The standalone quiz/exam editor retains its four question types: multiple choice, true/false, short answer and manually graded text response. Questions now appear immediately below the page heading, before settings, the optional introduction, resources and revision history. Questions save separately from assessment settings.

The earlier layout placed the question builder after the entire settings form, making the introduction editor look like the primary authoring interface. This change addresses that local layout issue; the signed-in production page was not accessible to the agent, so the exact production symptom has not been confirmed.

Published assessments show a visible question-editing lock and a link to settings. Save and unpublish before modifying questions, as already required by the backend. Loading failures now show an error instead of being treated as an empty question list. The archive explanation matches the existing preservation behavior. Restoring an introduction revision remounts its editor so the restored content is visible.

Validation: TypeScript and production build passed. An isolated browser fixture verified adding a multiple-choice question with the selected answer in the request, controls for all four question types, narrow-screen layout, published-state locking, and an explicit question-load failure. Fixtures simulated API data and writes; no production assessment or Supabase data was modified. Git and deployment remain user-managed. No SQL migration is required.
