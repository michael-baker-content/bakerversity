# Returning to the course overview

The persistent admin layout observes navigation into `/admin/courses/[slug]` and refreshes the server-rendered overview in place. API route writes do not invalidate the browser's previously visited route snapshot, so refreshing only the database or disabling HTTP caching does not address this navigation behavior.

`RefreshCourseOverview` covers return buttons, breadcrumbs and browser history without changing individual editors or their unsaved-work protections. It refreshes once per overview navigation, not on editor renders or every server response. The refresh does not reset scroll position or force a full browser reload.

`CourseDetailLayout` reconciles the lesson/assessment sequence and course-page list when fresh server props arrive. Section expansion remains local state, while server data becomes authoritative after a refresh. Optimistic reordering remains supported.

Validation: TypeScript check; isolated Next browser fixture using the real refresh component and overview layout, simulated writes, and no live accounts. Verified an edited lesson title and newly created assessment appear after client navigation back to a previously visited overview, and remain current through browser Back/Forward. Production build checked separately.

No database migration is needed. Deploy the changes to enable the behavior on Vercel.
