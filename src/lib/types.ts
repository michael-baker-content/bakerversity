// ============================================================
// Database types — mirrors the Supabase schema exactly.
// Use these throughout the app instead of writing inline types.
// ============================================================

export type Role = 'student' | 'instructor' | 'admin'

export interface User {
  id: string
  clerk_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface ThumbnailAttribution {
  photographer_name: string
  photographer_url: string   // https://unsplash.com/@username?utm_source=...
  unsplash_url: string       // https://unsplash.com/?utm_source=...
  photo_id: string           // Unsplash photo ID
}

export interface Course {
  id: string
  instructor_id: string
  title: string
  slug: string
  description: string | null
  price_cents: number
  currency: string
  is_published: boolean
  is_public: boolean
  thumbnail_url: string | null
  thumbnail_attribution: ThumbnailAttribution | null
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  slug: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  course_id: string
  module_id: string | null
  title: string
  content: Record<string, unknown> | null  // TipTap JSON
  position: number
  youtube_url: string | null
  slides_url: string | null
  slides_meta: { title?: string; filename?: string; description?: string } | null
  introduction: string | null
  slug: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

// ── Assessments ───────────────────────────────────────────────────────────────

export type AssessmentType = 'quiz' | 'exam' | 'practice'

export interface Assessment {
  id: string
  course_id: string
  module_id: string | null
  title: string
  slug: string | null
  assessment_type: AssessmentType
  is_graded: boolean
  passing_score: number
  // TipTap JSON — optional preamble shown before questions
  intro_content: Record<string, unknown> | null
  position: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'   // auto-graded exact-match (case/whitespace normalised)
  | 'text_response'  // instructor-graded free response

export interface AssessmentQuestion {
  id: string
  assessment_id: string
  question_type: QuestionType
  // Rich TipTap JSON body for the question (preferred).
  // question_text is the legacy plain-text field kept for backward compat.
  content: Record<string, unknown> | null
  question_text: string              // legacy — kept until full migration
  options: string[] | null           // choices for multiple_choice
  correct_answer: string             // index string or 'true'/'false' or exact match
  // short_answer only: all accepted answers after normalisation.
  // At least one entry required for short_answer questions.
  // Values are stored normalised (trimmed, lowercased) at write time.
  accepted_answers: string[] | null
  explanation: string | null         // legacy plain-text explanation
  explanation_content: Record<string, unknown> | null  // rich TipTap explanation
  position: number
  created_at: string
}

export interface AssessmentCompletion {
  id: string
  user_id: string
  assessment_id: string
  course_id: string
  passed: boolean
  score: number | null
  completed_at: string
}

// ── Legacy Quiz (kept for backward compat during migration) ───────────────────
// The quizzes table has been dropped. This type is retained only if any
// existing code still references it during the transition. Remove in v2.

/** @deprecated Use Assessment instead */
export interface Quiz {
  id: string
  lesson_id: string
  title: string
  passing_score: number
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  stripe_payment_intent_id: string | null
  enrolled_at: string
  completed_at: string | null
}

export interface CoursePage {
  id: string
  course_id: string
  module_id: string | null
  page_type: string
  title: string
  slug: string | null
  content: Record<string, unknown> | null
  introduction: string | null
  is_published: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  completed_at: string
}

export interface QuizAttempt {
  id: string
  user_id: string
  assessment_id: string            // replaces quiz_id
  answers: Record<string, string>  // { question_id: chosen_answer }
  score: number
  passed: boolean
  attempted_at: string
}

export interface Certificate {
  id: string
  user_id: string
  course_id: string
  certificate_url: string | null
  issued_at: string
}

// ── Joined / view types ───────────────────────────────────────────────────────

export interface CourseWithInstructor extends Course {
  instructor: Pick<User, 'id' | 'full_name' | 'avatar_url'>
}

export interface LessonWithProgress extends Lesson {
  completed: boolean
}

export interface AssessmentWithCompletion extends Assessment {
  completed: boolean
  score: number | null
  passed: boolean | null
}

export interface ModuleWithLessons extends Module {
  lessons: LessonWithProgress[]
  assessments: AssessmentWithCompletion[]
}
