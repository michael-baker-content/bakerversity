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

export interface Course {
  id: string
  instructor_id: string
  title: string
  slug: string
  description: string | null
  price_cents: number
  currency: string
  is_published: boolean
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
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

export interface Quiz {
  id: string
  lesson_id: string
  title: string
  passing_score: number
  created_at: string
  updated_at: string
}

export type QuestionType = 'multiple_choice' | 'true_false'

export interface QuizQuestion {
  id: string
  quiz_id: string
  question_text: string        // may contain LaTeX ($...$)
  question_type: QuestionType
  options: string[] | null     // answer choices for multiple_choice
  correct_answer: string       // index (as string) or 'true'/'false'
  explanation: string | null
  position: number
  created_at: string
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
  quiz_id: string
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
// Convenience types for common query shapes

export interface CourseWithInstructor extends Course {
  instructor: Pick<User, 'id' | 'full_name' | 'avatar_url'>
}

export interface LessonWithProgress extends Lesson {
  completed: boolean
}

export interface ModuleWithLessons extends Module {
  lessons: LessonWithProgress[]
}
