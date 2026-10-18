# Course outline scroll position

The shared student LessonSidebar remembers its scroll offset per course in sessionStorage, with an in-memory fallback when browser storage is unavailable. Desktop and mobile panels keep independent offsets because their viewport sizes differ. No account or database writes are involved.

The position is recorded while scrolling and before clicking a contents link. Layout effects restore it before painting on mount or mobile reopening. A ResizeObserver also restores it when a previously hidden responsive panel becomes visible. Hidden panels do not overwrite saved offsets. Browser clamping handles a course outline that becomes shorter.

This preserves the reader's chosen position rather than automatically centering the current lesson. Main document scrolling and active-item highlighting are unchanged. Storage is scoped to the current browser tab/session, not cross-device learning progress.

Validated with a simulated 60-lesson course using the real sidebar: desktop navigation with forced remount, page reload, isolation between courses, and mobile navigation followed by reopening the panel. TypeScript check passed.
