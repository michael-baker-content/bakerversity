import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { QuestionType } from '@/lib/types'

type Params = { params: Promise<{ courseId: string; assessmentId: string; questionId: string }> }

function normaliseAnswer(raw: string): string {
  return raw.trim().toLowerCase()
}

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

// ── PATCH — update a question ─────────────────────────────────

export async function PATCH(req: Request, { params }: Params) {
  const { courseId, assessmentId, questionId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await authorise(courseId, clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Confirm question belongs to this assessment
  const { data: existing } = await ctx.supabase
    .from('assessment_questions')
    .select('id, question_type')
    .eq('id', questionId)
    .eq('assessment_id', assessmentId)
    .single()
  if (!existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

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
    position,
  } = body

  const updates: Record<string, unknown> = {}

  // Only include fields that were explicitly sent
  if (question_type !== undefined) {
    const validTypes: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer', 'text_response']
    if (!validTypes.includes(question_type)) {
      return NextResponse.json({ error: 'Invalid question_type' }, { status: 400 })
    }
    updates.question_type = question_type
  }

  if (content !== undefined) updates.content = content
  if (question_text !== undefined) updates.question_text = question_text ? stripHtml(question_text) : null
  if (options !== undefined) {
    updates.options = Array.isArray(options)
      ? options.map((o: unknown) => (typeof o === 'string' ? stripHtml(o) : ''))
      : null
  }
  if (correct_answer !== undefined) {
    updates.correct_answer = typeof correct_answer === 'string' ? stripHtml(correct_answer) : null
  }
  if (accepted_answers !== undefined) {
    updates.accepted_answers = Array.isArray(accepted_answers)
      ? accepted_answers
          .map((a: unknown) => (typeof a === 'string' ? normaliseAnswer(stripHtml(a)) : ''))
          .filter(Boolean)
      : null
  }
  if (explanation !== undefined) updates.explanation = explanation ? stripHtml(explanation) : null
  if (explanation_content !== undefined) updates.explanation_content = explanation_content
  if (position !== undefined) updates.position = Number(position)

  const { error } = await ctx.supabase
    .from('assessment_questions')
    .update(updates)
    .eq('id', questionId)
    .eq('assessment_id', assessmentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ── DELETE — remove a question ────────────────────────────────

export async function DELETE(_req: Request, { params }: Params) {
  const { courseId, assessmentId, questionId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await authorise(courseId, clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await ctx.supabase
    .from('assessment_questions')
    .delete()
    .eq('id', questionId)
    .eq('assessment_id', assessmentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
