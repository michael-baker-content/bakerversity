import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ assessmentId: string }> }

// Normalise a student answer the same way accepted_answers were normalised at
// write time: trim whitespace and lowercase. Never used on TipTap JSON — only
// on the plain string answers submitted for short_answer questions.
function normalise(raw: string): string {
  return raw.trim().toLowerCase()
}

// POST /api/students/assessments/[assessmentId]/submit
// Body: { answers: { [questionId]: string } }
//
// Grading rules:
//   multiple_choice — student answer (index string) must equal correct_answer
//   true_false      — student answer ('true'/'false') must equal correct_answer
//   short_answer    — normalised student answer must match any accepted_answer
//   text_response   — never graded; excluded from score calculation entirely
//
// Score = (graded_correct / total_graded) * 100, rounded.
// passed = score >= assessment.passing_score (practice assessments always pass).
//
// Retake behaviour: infinite retakes; assessment_completions stores best score.
// If this attempt beats the stored best, we upsert with the new score.

export async function POST(req: Request, { params }: Params) {
  const { assessmentId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Resolve user
  const { data: dbUser } = await supabase
    .from('users').select('id').eq('clerk_id', clerkUser.id).single()
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Load assessment + questions in parallel
  const [{ data: assessment }, { data: questions }] = await Promise.all([
    supabase
      .from('assessments')
      .select('id, course_id, assessment_type, is_graded, passing_score')
      .eq('id', assessmentId)
      .eq('is_published', true)
      .single(),
    supabase
      .from('assessment_questions')
      .select('id, question_type, correct_answer, accepted_answers')
      .eq('assessment_id', assessmentId)
      .order('position', { ascending: true }),
  ])

  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  // Verify enrollment (or free course)
  const { data: course } = await supabase
    .from('courses').select('price_cents').eq('id', assessment.course_id).single()

  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  if (course.price_cents > 0) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', dbUser.id)
      .eq('course_id', assessment.course_id)
      .single()
    if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })
  }

  // Parse submitted answers
  const body = await req.json()
  const submitted: Record<string, string> = body.answers ?? {}

  // Sanitise student input: plain text only — strip any HTML tags before
  // storing or comparing. This is defence-in-depth; the UI sends plain strings.
  const sanitiseAnswer = (raw: unknown): string => {
    if (typeof raw !== 'string') return ''
    return raw.replace(/<[^>]*>/g, '').trim()
  }

  const safeAnswers: Record<string, string> = {}
  for (const [qId, val] of Object.entries(submitted)) {
    safeAnswers[qId] = sanitiseAnswer(val)
  }

  // ── Grade each question ───────────────────────────────────────────────────

  interface QuestionResult {
    question_id: string
    question_type: string
    given_answer: string
    is_correct: boolean | null   // null = not graded (text_response)
    correct_answer: string | null
  }

  const results: QuestionResult[] = []
  let gradedTotal = 0
  let gradedCorrect = 0

  for (const q of questions ?? []) {
    const given = safeAnswers[q.id] ?? ''

    if (q.question_type === 'text_response') {
      // Never graded — stored for instructor review but not counted in score
      results.push({
        question_id: q.id,
        question_type: q.question_type,
        given_answer: given,
        is_correct: null,
        correct_answer: null,
      })
      continue
    }

    gradedTotal++
    let isCorrect = false

    if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
      isCorrect = given === (q.correct_answer ?? '')
    } else if (q.question_type === 'short_answer') {
      const accepted: string[] = Array.isArray(q.accepted_answers) ? q.accepted_answers : []
      isCorrect = accepted.includes(normalise(given))
    }

    if (isCorrect) gradedCorrect++

    results.push({
      question_id: q.id,
      question_type: q.question_type,
      given_answer: given,
      is_correct: isCorrect,
      // Expose correct answer after submission so student can see what they missed
      correct_answer: q.question_type === 'multiple_choice' || q.question_type === 'true_false'
        ? (q.correct_answer ?? null)
        : null,   // don't reveal short_answer accepted list
    })
  }

  // Score is based only on graded questions (text_response excluded)
  const score = gradedTotal > 0 ? Math.round((gradedCorrect / gradedTotal) * 100) : 100
  const passed = assessment.assessment_type === 'practice'
    ? true  // practice assessments always "pass"
    : score >= assessment.passing_score

  // ── Persist attempt ───────────────────────────────────────────────────────

  await supabase.from('assessment_attempts').insert({
    user_id: dbUser.id,
    assessment_id: assessmentId,
    answers: safeAnswers,
    score,
    passed,
  })

  // ── Update completion (best score wins) ───────────────────────────────────

  // Fetch existing best score for this student+assessment
  const { data: existing } = await supabase
    .from('assessment_completions')
    .select('id, score, passed')
    .eq('user_id', dbUser.id)
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  const existingScore = existing?.score ?? -1

  if (score > existingScore) {
    // Upsert on (user_id, assessment_id) unique constraint
    await supabase.from('assessment_completions').upsert({
      user_id: dbUser.id,
      assessment_id: assessmentId,
      course_id: assessment.course_id,
      passed,
      score,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,assessment_id' })
  }

  return NextResponse.json({
    score,
    passed,
    passing_score: assessment.passing_score,
    assessment_type: assessment.assessment_type,
    is_graded: assessment.is_graded,
    results,
  })
}
