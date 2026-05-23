import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { AssessmentType } from '@/lib/types'

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ── GET /api/admin/courses/[courseId]/assessments ─────────────
// Returns all assessments for the course, ordered by position.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users').select('id, role').eq('clerk_id', clerkUser.id).single()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('assessments')
    .select('id, title, slug, assessment_type, is_graded, passing_score, position, is_published, module_id')
    .eq('course_id', courseId)
    .order('position', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── POST /api/admin/courses/[courseId]/assessments ────────────
// Creates a new assessment. Body:
//   title (required), assessment_type, module_id,
//   is_graded, passing_score, intro_content

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users').select('id, role').eq('clerk_id', clerkUser.id).single()

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify the instructor owns this course
  const { data: course } = await supabase
    .from('courses').select('id').eq('id', courseId).eq('instructor_id', user.id).single()
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const body = await req.json()
  const { title, assessment_type, module_id, is_graded, passing_score, intro_content } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const validTypes: AssessmentType[] = ['quiz', 'exam', 'practice']
  const type: AssessmentType = validTypes.includes(assessment_type) ? assessment_type : 'quiz'

  // Generate a unique slug within this course
  const baseSlug = toSlug(title)
  let slug = baseSlug
  let attempt = 0
  while (true) {
    const { data: existing } = await supabase
      .from('assessments').select('id').eq('course_id', courseId).eq('slug', slug).maybeSingle()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  // Position at the end of existing assessments for this course
  const { count } = await supabase
    .from('assessments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)

  const { data, error } = await supabase
    .from('assessments')
    .insert({
      course_id: courseId,
      module_id: module_id ?? null,
      title: title.trim(),
      slug,
      assessment_type: type,
      is_graded: is_graded ?? true,
      passing_score: passing_score ?? 70,
      intro_content: intro_content ?? null,
      position: count ?? 0,
    })
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, slug: data.slug }, { status: 201 })
}
