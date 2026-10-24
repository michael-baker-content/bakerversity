# Access control (1.0)

Account permissions, course ownership, and enrollment are independent.

- Instructors and administrators can create courses.
- Instructors can author only courses they own.
- Administrators can author any existing course and see all courses in the administration list.
- Students cannot author, even if enrolled. Enrollment does not grant editing permission to instructors either.
- Learner access continues to apply publication, public-access, enrollment, and payment rules regardless of account role. Owning instructors and administrators retain author preview access.
- Global certificate administration and the legacy site-wide lesson-slug maintenance endpoint require administrator status.

accessPolicy.mjs defines the shared decisions. authorAccessFor accepts only a server-authenticated Clerk ID; adminAccess resolves that identity itself. Both use trusted database identity/ownership records. Request-body roles or enrollment claims are never accepted as authoring authority. Missing identities, missing courses, and lookup errors deny authoring access. learnerAccess remains independent of authoring roles.

Authoring list/create routes, existing shared read/update/archive handlers, slug lookup, course administration views, image search, Markdown import, and grading use these boundaries. Grading also checks the attempted assessment's course, student, and question association before writing feedback. The administrative self-enrollment toggle remains an owner/admin preview tool, not a general enrollment bypass.

Existing handlers retain their signed-out response conventions (401 in explicit authentication routes; 403 in older shared-guard routes). Unauthorized course operations return 403 without revealing course data. Course overview pages return not found for inaccessible courses.

No schema migration is required. Coauthor memberships, invitations, ownership transfers, and publication approval workflows remain deferred. Future coauthor membership can extend canEditCourse/resolveAuthorAccess without changing enrollment.

Verification: tests/access-policy.mjs checks the role/ownership matrix and executes real module, page, lesson, and assessment route handlers with isolated database/auth fixtures. It verifies denied actions perform no writes. Existing database tests cover publication and learner access. Hosted Clerk/Supabase verification and browser smoke execution remain separate checks.
