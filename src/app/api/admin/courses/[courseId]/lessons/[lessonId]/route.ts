import { currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

async function getInstructor(clerkId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single()
  return data
}

async function verifyLessonOwnership(courseId: string, lessonId: string, userId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('lessons')
    .select('id, courses!inner(instructor_id)')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .single()
  if (!data) return false
  const course = data.courses as unknown as { instructor_id: string }
  return course.instructor_id === userId
}

// GET /api/admin/courses/[courseId]/lessons/[lessonId]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getInstructor(clerkUser.id)
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const owned = await verifyLessonOwnership(courseId, lessonId, user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// PATCH /api/admin/courses/[courseId]/lessons/[lessonId]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getInstructor(clerkUser.id)
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const owned = await verifyLessonOwnership(courseId, lessonId, user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const allowed = ['title', 'slug', 'introduction', 'content', 'is_published', 'position', 'youtube_url', 'module_id', 'slides_url', 'slides_meta']
  const updates = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key))
  )

  const supabase = createServiceClient()

  // Auto-generate slug from title if not provided
  if (!updates.slug && updates.title) {
    const baseSlug = (updates.title as string)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Get course_id for uniqueness check
    const { data: currentLesson } = await supabase
      .from('lessons')
      .select('course_id, slug')
      .eq('id', lessonId)
      .single()

    // Only auto-generate if lesson has no slug yet
    if (currentLesson && !currentLesson.slug) {
      let slug = baseSlug
      let attempt = 0
      while (true) {
        const { data: existing } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', currentLesson.course_id)
          .eq('slug', slug)
          .neq('id', lessonId)
          .single()
        if (!existing) break
        attempt++
        slug = `${baseSlug}-${attempt}`
      }
      updates.slug = slug
    }
  }

  const { error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', lessonId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, slug: updates.slug })
}

// DELETE /api/admin/courses/[courseId]/lessons/[lessonId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getInstructor(clerkUser.id)
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const owned = await verifyLessonOwnership(courseId, lessonId, user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
