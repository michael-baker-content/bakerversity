# Refinement checkpoint

The first Fallow-guided cleanup removes unreachable legacy ContentRow, LessonList, QuizEditor, QuizTaker, and lessonUrl implementations. Active course outlines, assessment authoring, and inline practice quizzes remain separate and unchanged.

Module create/edit screens share ModuleForm fields, validation presentation, and actions. Loading, POST/PATCH requests, and deletion remain in their route components. Unused allModules and QuestionForm assessmentId props were removed.

Fallow configuration uses manual entries for standalone tests/browser/*.js Playwright scenarios. These remain manually executed scenarios, not additional CI coverage. Invalid duplication and complexity rule names were removed; the analyzer's default duplication/health settings remain in effect. Entry configuration follows the official schema: https://raw.githubusercontent.com/fallow-rs/fallow/main/schema.json

Dependency pruning, lint setup, authorization consistency, and broader editor extraction remain separate follow-up work. In particular, authorization helpers differ in administrator ownership rules; consolidate only after specifying and testing that contract. Coverage estimates in static analysis are not measured test coverage.

## Draft comparison cleanup

Overview status and saved-lesson preview now use draftComparison.mjs for JSON equality and resource comparison. Their policies remain distinct: overview checks only provided draft fields and deduplicates resource associations; preview compares its full visible-field list, counts duplicate associations, and always identifies unpublished lessons as previews. Tests cover these differences. LATEX_CATEGORIES remains local to LatexModal; its unused export was removed.

## Authorization checkpoint

Before consolidating route guards, test signed-out users, students, course-owning instructors, other instructors, and administrators across list/read/create/update/delete operations. The current shared adminAccess(courseId) permits administrators across courses, while the module route's verifyInstructor requires ownership even for administrators. This difference is now resolved: administrators can manage all courses; instructors require ownership. See access-control.md for the implemented contract. Also preserve deliberate HTTP 401 versus 403 responses. Do not replace learnerAccess with an instructor guard.

## Document validation and asset operations

All editor, question, and authoring-route document checks now call documentError in documentValidation.mjs. It coordinates independent slideshow, footnote, and text/image validators in their original error order. textImageError now validates only its own component.

Regular image insertion, slideshow uploads, and the course library share uploadCourseAsset in authoring/assets.ts. Library and slide metadata patches share saveAssetMetadata. Upload response validation and request error handling are centralized; mutations are never automatically retried. Slideshow retry behavior retains a completed upload when metadata saving fails. Replacing a normal image records the new asset identity instead of retaining the old asset ID/tags. UI workflows, PDF slide-upload transport, and server-side validation remain separate.

Tests cover encoded course IDs, multipart file data, tag-only patches, incomplete responses, denied access, and ambiguous failures without automatic retry. Browser interaction testing remains a separate CI/hosted check.
