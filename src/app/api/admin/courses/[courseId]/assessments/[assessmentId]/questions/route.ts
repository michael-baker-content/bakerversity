import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { QuestionType } from '@/lib/types'

type Params = { params: Promise<{ courseId: string; assessmentId: string }> }

// Normalise a short-answer value for storage and comparison.
// Trims whitespace and lowercases. Call this on both the stored
// accepted_answers and the student's submitted answer before comparing.
function normaliseAnswer(raw: string): string {
  return raw.trim().toLowerCase()
}

// Strip any HTML tags from a string. Used as a defence-in-depth step
// before storing plain-text fields so no markup survives even if the
// caller skips sanitisation on the client side.
function stripHtml(raw: string): string {
  return raw.replace(/<[^>]*>/g, '').trim()
}

async function authorise(courseId: string, clerkId: string) {
  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users').select('id, role').eq('clerk_id', clerkId).single()
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) return null

  const { data: course } = await supabase
    .from('courses').select('id').eq('id', courseId).eq('instructor_id', user.id).single()
  if (!course) return null

  return { supabase, user }
}

// ── GET /api/admin/courses/[courseId]/assessments/[assessmentId]/questions

export async function GET(_req: Request, { params }: Params) {
  const { courseId, assessmentId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await authorise(courseId, clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await ctx.supabase
    .from('assessment_questions')
    .select('id, question_type, content, question_text, options, correct_answer, accepted_answers, explanation, explanation_content, position')
    .eq('assessment_id', assessmentId)
    .order('position', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── POST /api/admin/courses/[courseId]/assessments/[assessmentId]/questions
// Body fields:
//   question_type (required)
//   content          — TipTap JSON for rich question body
//   question_text    — plain text fallback (legacy / simple questions)
//   options          — string[] for multiple_choice
//   correct_answer   — index string, 'true'/'false', or exact answer
//   accepted_answers — string[] for short_answer (all valid answers)
//   explanation      — plain text explanation shown after answering
//   explanation_content — TipTap JSON explanation (preferred)

export async function POST(req: Request, { params }: Params) {
  const { courseId, assessmentId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await authorise(courseId, clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Confirm assessment belongs to this course
  const { data: assessment } = await ctx.supabase
    .from('assessments').select('id').eq('id', assessmentId).eq('course_id', courseId).single()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  const body = await req.json()
  const {
    question_type,
    content,
    question_text,
    options,
    correct_answer,
    accepted_answers,
    explanation,
    explanation_content,
  } = body

  // ── Validation ──────────────────────────────────────────────

  const validTypes: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer', 'text_response']
  if (!validTypes.includes(question_type)) {
    return NextResponse.json({ error: 'Invalid question_type' }, { status: 400 })
  }

  if (!content && !question_text?.trim()) {
    return NextResponse.json({ error: 'Question body (content or question_text) is required' }, { status: 400 })
  }

  if (question_type === 'multiple_choice') {
    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: 'multiple_choice requires at least 2 options' }, { status: 400 })
    }
    if (correct_answer === undefined || correct_answer === null) {
      return NextResponse.json({ error: 'correct_answer is required' }, { status: 400 })
    }
  }

  if (question_type === 'true_false') {
    if (correct_answer !== 'true' && correct_answer !== 'false') {
      return NextResponse.json({ error: 'true_false correct_answer must be "true" or "false"' }, { status: 400 })
    }
  }

  if (question_type === 'short_answer') {
    if (!Array.isArray(accepted_answers) || accepted_answers.length === 0) {
      return NextResponse.json({ error: 'short_answer requires at least one accepted_answer' }, { status: 400 })
    }
  }

  // ── Sanitisation ────────────────────────────────────────────
  // Plain-text fields: strip any HTML tags as a defence-in-depth
  // measure. TipTap JSON fields (content, explanation_content) are
  // data structures processed by the renderer, not raw HTML, so
  // they don't need stripping here. The renderer never passes them
  // through dangerouslySetInnerHTML (except HtmlSegment, which
  // uses DOMPurify at render time).

  const safeQuestionText = question_text ? stripHtml(question_text) : null

  const safeOptions = Array.isArray(options)
    ? options.map((o: unknown) => (typeof o === 'string' ? stripHtml(o) : ''))
    : null

  // For short_answer: normalise all accepted answers at write time
  // so the comparison at grade time is simple string equality.
  const safeAcceptedAnswers = Array.isArray(accepted_answers)
    ? accepted_answers
        .map((a: unknown) => (typeof a === 'string' ? normaliseAnswer(stripHtml(a)) : ''))
        .filter(Boolean)
    : null

  const safeCorrectAnswer = typeof correct_answer === 'string'
    ? stripHtml(correct_answer)
    : null

  const safeExplanation = explanation ? stripHtml(explanation) : null

  // ── Position ────────────────────────────────────────────────

  const { count } = await ctx.supabase
    .from('assessment_questions')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)

  const { data, error } = await ctx.supabase
    .from('assessment_questions')
    .insert({
      assessment_id: assessmentId,
      question_type,
      content: content ?? null,
      question_text: safeQuestionText,
      options: safeOptions,
      correct_answer: safeCorrectAnswer,
      accepted_answers: safeAcceptedAnswers,
      explanation: safeExplanation,
      explanation_content: explanation_content ?? null,
      position: count ?? 0,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
