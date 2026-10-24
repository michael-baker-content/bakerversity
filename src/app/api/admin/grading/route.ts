import { currentUser } from '@clerk/nextjs/server'
import { authorAccessFor } from '@/lib/adminAccess'
import {canManageSite} from '@/lib/accessPolicy.mjs'
import { NextResponse } from 'next/server'

// ── GET — fetch all text_response answers across instructor's courses ─────────
// Groups results by attempt. Only returns attempts that contain at least one
// text_response answer. Fetches existing feedback for each response.

export async function GET() {
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await authorAccessFor(clerkUser.id)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const {db:supabase,user}=access

  // Get all courses this instructor owns
  let query=supabase.from('courses').select('id, title, slug')
  if(!canManageSite(user))query=query.eq('instructor_id',user.id)
  const { data: courses, error: coursesError } = await query

  if (coursesError) return NextResponse.json({error:'Unable to load assessment responses. Please retry.'},{status:502})
  if (!courses?.length) return NextResponse.json({ responses: [] })

  const courseIds = courses.map((c) => c.id)
  const courseMap = new Map(courses.map((c) => [c.id, c]))

  // Get all assessments in those courses
  const { data: assessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select('id, title, course_id')
    .in('course_id', courseIds)

  if (assessmentsError) return NextResponse.json({error:'Unable to load assessment responses. Please retry.'},{status:502})
  if (!assessments?.length) return NextResponse.json({ responses: [] })

  const assessmentIds = assessments.map((a) => a.id)
  const assessmentMap = new Map(assessments.map((a) => [a.id, a]))

  // Get all text_response questions for those assessments
  const { data: textQuestions, error: textQuestionsError } = await supabase
    .from('assessment_questions')
    .select('id, assessment_id, question_text, content, position')
    .in('assessment_id', assessmentIds)
    .eq('question_type', 'text_response')
    .order('position', { ascending: true })



  if (textQuestionsError) return NextResponse.json({error:'Unable to load assessment responses. Please retry.'},{status:502})
  // Build a map: assessment_id → text question ids
  const textQsByAssessment = new Map<string, typeof textQuestions>()
  for (const q of textQuestions ?? []) {
    if (!textQsByAssessment.has(q.assessment_id)) textQsByAssessment.set(q.assessment_id, [])
    textQsByAssessment.get(q.assessment_id)!.push(q)
  }
  const textQuestionIds = new Set((textQuestions ?? []).map((q) => q.id))

  // Get all attempts for these assessments, with student info
  const { data: attempts, error: attemptsError } = await supabase
    .from('assessment_attempts')
    .select(`
      id,
      assessment_id,
      answers,
      question_snapshot,
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

  if (attemptsError) return NextResponse.json({error:'Unable to load assessment responses. Please retry.'},{status:502})
  if (!attempts?.length) return NextResponse.json({ responses: [] })

  // Filter to only attempts that have at least one non-empty text_response answer
  // Review the question as it appeared when the learner submitted, not its current edit.
  const questionsFor = (attempt: typeof attempts[number]) => {
    const snapshot=attempt.question_snapshot
    if(Array.isArray(snapshot) && snapshot.length) return snapshot.filter(q=>q && typeof q==='object' && !Array.isArray(q) && q.question_type==='text_response') as unknown as NonNullable<typeof textQuestions>
    return textQsByAssessment.get(attempt.assessment_id) ?? []
  }
  const relevantAttempts = attempts.filter((attempt) => {
    const answers = attempt.answers as Record<string, string>
    const questions = questionsFor(attempt)
    return questions.some((q) => answers[q.id]?.trim())
  })

  if (!relevantAttempts.length) return NextResponse.json({ responses: [] })

  // Fetch all existing feedback for relevant attempts
  const attemptIds = relevantAttempts.map((a) => a.id)
  const { data: feedbackRows, error: feedbackRowsError } = await supabase
    .from('response_feedback')
    .select('assessment_attempt_id, question_id, feedback_text, updated_at')
    .in('assessment_attempt_id', attemptIds)

  if (feedbackRowsError) return NextResponse.json({error:'Unable to load assessment responses. Please retry.'},{status:502})
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
    const questions = questionsFor(attempt)

    const responses = questions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => {
        // Extract plain text preview from TipTap content for display
        const questionPreview = q.question_text ?? extractPlainText(q.content as Record<string, unknown> | null)
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

  const access = await authorAccessFor(clerkUser.id)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const {db:supabase,user}=access

  const { assessment_attempt_id, question_id, student_id, feedback_text } = await req.json()

  if (!assessment_attempt_id || !question_id || !student_id || !feedback_text?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const {data:attempt}=await supabase.from('assessment_attempts').select('assessment_id, user_id').eq('id',assessment_attempt_id).single()
  if(!attempt || attempt.user_id!==student_id)return NextResponse.json({error:'Forbidden'},{status:403})
  const {data:assessment}=await supabase.from('assessments').select('course_id').eq('id',attempt.assessment_id).single()
  if(!assessment || !await authorAccessFor(clerkUser.id,assessment.course_id))return NextResponse.json({error:'Forbidden'},{status:403})
  const {data:question}=await supabase.from('assessment_questions').select('id').eq('id',question_id).eq('assessment_id',attempt.assessment_id).single()
  if(!question)return NextResponse.json({error:'Question not found'},{status:404})
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
