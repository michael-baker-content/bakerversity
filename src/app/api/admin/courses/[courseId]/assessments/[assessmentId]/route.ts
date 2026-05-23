import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { AssessmentType } from '@/lib/types'

type Params = { params: Promise<{ courseId: string; assessmentId: string }> }

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

// ── GET /api/admin/courses/[courseId]/assessments/[assessmentId]

export async function GET(_req: Request, { params }: Params) {
  const { courseId, assessmentId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await authorise(courseId, clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await ctx.supabase
    .from('assessments')
    .select('*')
    .eq('id', assessmentId)
    .eq('course_id', courseId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

// ── PATCH /api/admin/courses/[courseId]/assessments/[assessmentId]
// Updatable fields: title, assessment_type, module_id, is_graded,
//   passing_score, intro_content, is_published, slug, position

export async function PATCH(req: Request, { params }: Params) {
  const { courseId, assessmentId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await authorise(courseId, clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  const allowed = [
    'title', 'assessment_type', 'module_id', 'is_graded',
    'passing_score', 'intro_content', 'is_published', 'slug', 'position',
  ]
  const updates: Record<string, unknown> = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  )

  // Validate assessment_type if provided
  if (updates.assessment_type !== undefined) {
    const validTypes: AssessmentType[] = ['quiz', 'exam', 'practice']
    if (!validTypes.includes(updates.assessment_type as AssessmentType)) {
      return NextResponse.json({ error: 'Invalid assessment_type' }, { status: 400 })
    }
  }

  // Validate passing_score range
  if (updates.passing_score !== undefined) {
    const score = Number(updates.passing_score)
    if (isNaN(score) || score < 0 || score > 100) {
      return NextResponse.json({ error: 'passing_score must be 0–100' }, { status: 400 })
    }
    updates.passing_score = score
  }

  const { error } = await ctx.supabase
    .from('assessments')
    .update(updates)
    .eq('id', assessmentId)
    .eq('course_id', courseId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ── DELETE /api/admin/courses/[courseId]/assessments/[assessmentId]

export async function DELETE(_req: Request, { params }: Params) {
  const { courseId, assessmentId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await authorise(courseId, clerkUser.id)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await ctx.supabase
    .from('assessments')
    .delete()
    .eq('id', assessmentId)
    .eq('course_id', courseId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
