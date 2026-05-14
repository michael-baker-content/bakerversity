import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const supabase = createServiceClient()

// Mark a lesson complete
export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lesson_id, course_id } = await req.json()
  if (!lesson_id || !course_id) {
    return NextResponse.json({ error: 'lesson_id and course_id required' }, { status: 400 })
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Upsert so repeated calls are idempotent
  const { error } = await supabase
    .from('lesson_completions')
    .upsert(
      { user_id: user.id, lesson_id, course_id },
      { onConflict: 'user_id,lesson_id', ignoreDuplicates: true }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // After marking complete, check if the whole course is done → issue certificate
  await maybeIssueCertificate(user.id, course_id)

  return NextResponse.json({ ok: true })
}

// Unmark a lesson complete
export async function DELETE(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lesson_id } = await req.json()
  if (!lesson_id) return NextResponse.json({ error: 'lesson_id required' }, { status: 400 })

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await supabase
    .from('lesson_completions')
    .delete()
    .eq('user_id', user.id)
    .eq('lesson_id', lesson_id)

  return NextResponse.json({ ok: true })
}

// ── Certificate issuance ────────────────────────────────────────────────────

async function maybeIssueCertificate(userId: string, courseId: string) {
  try {
    // Check if certificate already exists
    const { data: existing } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single()

    if (existing) return // already issued

    // Get all published lessons for this course
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, module_id')
      .eq('course_id', courseId)
      .eq('is_published', true)

    if (!lessons || lessons.length === 0) return

    // Get student's lesson completions for this course
    const { data: completions } = await supabase
      .from('lesson_completions')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)

    const completedLessonIds = new Set((completions ?? []).map((c) => c.lesson_id))
    const allLessonsDone = lessons.every((l) => completedLessonIds.has(l.id))

    if (!allLessonsDone) return

    // Get all published course pages
    const { data: pages } = await supabase
      .from('course_pages')
      .select('id')
      .eq('course_id', courseId)
      .eq('is_published', true)

    // Get student's page views
    const { data: pageViews } = await supabase
      .from('course_page_views')
      .select('course_page_id')
      .eq('user_id', userId)

    const viewedPageIds = new Set((pageViews ?? []).map((v) => v.course_page_id))
    const allPagesDone = (pages ?? []).every((p) => viewedPageIds.has(p.id))

    if (!allPagesDone) return

    // All done — issue certificate
    await supabase.from('certificates').insert({
      user_id: userId,
      course_id: courseId,
    })
  } catch {
    // Non-fatal: certificate issuance failure shouldn't break lesson completion
  }
}
