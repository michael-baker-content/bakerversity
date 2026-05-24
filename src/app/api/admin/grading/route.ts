import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// ── GET — fetch all text_response answers across instructor's courses ─────────
// Groups results by attempt. Only returns attempts that contain at least one
// text_response answer. Fetches existing feedback for each response.

export async function GET() {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users').select('id, role').eq('clerk_id', clerkUser.id).single()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all courses this instructor owns
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, slug')
    .eq('instructor_id', user.id)

  if (!courses?.length) return NextResponse.json({ responses: [] })

  const courseIds = courses.map((c) => c.id)
  const courseMap = new Map(courses.map((c) => [c.id, c]))

  // Get all assessments in those courses
  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, title, course_id')
    .in('course_id', courseIds)

  if (!assessments?.length) return NextResponse.json({ responses: [] })

  const assessmentIds = assessments.map((a) => a.id)
  const assessmentMap = new Map(assessments.map((a) => [a.id, a]))

  // Get all text_response questions for those assessments
  const { data: textQuestions } = await supabase
    .from('assessment_questions')
    .select('id, assessment_id, question_text, content, position')
    .in('assessment_id', assessmentIds)
    .eq('question_type', 'text_response')
    .order('position', { ascending: true })

  if (!textQuestions?.length) return NextResponse.json({ responses: [] })

  // Build a map: assessment_id → text question ids
  const textQsByAssessment = new Map<string, typeof textQuestions>()
  for (const q of textQuestions) {
    if (!textQsByAssessment.has(q.assessment_id)) textQsByAssessment.set(q.assessment_id, [])
    textQsByAssessment.get(q.assessment_id)!.push(q)
  }
  const textQuestionIds = new Set(textQuestions.map((q) => q.id))

  // Get all attempts for these assessments, with student info
  const { data: attempts } = await supabase
    .from('assessment_attempts')
    .select(`
      id,
      assessment_id,
      answers,
      score,
      passed,
      attempted_at,
      users!inner (
        id,
        full_name,
        email
      )
    `)
    .in('assessment_id', assessmentIds)
    .order('attempted_at', { ascending: false })

  if (!attempts?.length) return NextResponse.json({ responses: [] })

  // Filter to only attempts that have at least one non-empty text_response answer
  const relevantAttempts = attempts.filter((attempt) => {
    const answers = attempt.answers as Record<string, string>
    const questions = textQsByAssessment.get(attempt.assessment_id) ?? []
    return questions.some((q) => answers[q.id]?.trim())
  })

  if (!relevantAttempts.length) return NextResponse.json({ responses: [] })

  // Fetch all existing feedback for relevant attempts
  const attemptIds = relevantAttempts.map((a) => a.id)
  const { data: feedbackRows } = await supabase
    .from('response_feedback')
    .select('assessment_attempt_id, question_id, feedback_text, updated_at')
    .in('assessment_attempt_id', attemptIds)

  // Build feedback lookup: attempt_id:question_id → feedback
  const feedbackMap = new Map<string, { feedback_text: string; updated_at: string }>()
  for (const f of feedbackRows ?? []) {
    feedbackMap.set(`${f.assessment_attempt_id}:${f.question_id}`, {
      feedback_text: f.feedback_text,
      updated_at: f.updated_at,
    })
  }

  // Build results
  const results = relevantAttempts.map((attempt) => {
    const assessment = assessmentMap.get(attempt.assessment_id)!
    const course = courseMap.get(assessment.course_id)!
    const student = attempt.users as unknown as { id: string; full_name: string | null; email: string }
    const answers = attempt.answers as Record<string, string>
    const questions = textQsByAssessment.get(attempt.assessment_id) ?? []

    const responses = questions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => {
        // Extract plain text preview from TipTap content for display
        const questionPreview = q.question_text ?? extractPlainText(q.content)
        return {
          question_id: q.id,
          question_text: questionPreview,
          question_content: q.content,
          answer: answers[q.id],
          feedback: feedbackMap.get(`${attempt.id}:${q.id}`) ?? null,
        }
      })

    return {
      attempt_id: attempt.id,
      attempted_at: attempt.attempted_at,
      score: attempt.score,
      passed: attempt.passed,
      student: { id: student.id, full_name: student.full_name, email: student.email },
      course: { id: course.id, title: course.title, slug: course.slug },
      assessment: { id: assessment.id, title: assessment.title },
      responses,
    }
  })

  return NextResponse.json({ responses: results })
}

// ── POST — save or update feedback for a text_response answer ─────────────────

export async function POST(req: Request) {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users').select('id, role').eq('clerk_id', clerkUser.id).single()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { assessment_attempt_id, question_id, student_id, feedback_text } = await req.json()

  if (!assessment_attempt_id || !question_id || !student_id || !feedback_text?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Strip any HTML from feedback before storing — instructors are trusted
  // but defence-in-depth applies here too
  const safeFeedback = String(feedback_text).replace(/<[^>]*>/g, '').trim()

  const { error } = await supabase
    .from('response_feedback')
    .upsert({
      instructor_id: user.id,
      student_id,
      assessment_attempt_id,
      question_id,
      feedback_text: safeFeedback,
    }, { onConflict: 'assessment_attempt_id,question_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Extract a plain-text preview from a TipTap JSON document.
// Used as a fallback when question_text is null.
function extractPlainText(doc: Record<string, unknown> | null): string {
  if (!doc) return ''
  try {
    const nodes = (doc.content as Record<string, unknown>[] | undefined) ?? []
    const texts: string[] = []
    function walk(node: Record<string, unknown>) {
      if (node.type === 'text') { texts.push(String(node.text ?? '')); return }
      for (const child of (node.content as Record<string, unknown>[] | undefined) ?? []) {
        walk(child)
      }
    }
    for (const n of nodes) walk(n)
    return texts.join('').trim().slice(0, 200)
  } catch {
    return ''
  }
}
