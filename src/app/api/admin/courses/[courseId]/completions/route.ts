import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const supabase = createServiceClient()

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [
    { data: lessons },
    { data: completions },
    { data: modules },
    { data: pages },
    { data: pageViews },
    { data: certificate },
  ] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, module_id')
      .eq('course_id', courseId)
      .eq('is_published', true),
    supabase
      .from('lesson_completions')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('course_id', courseId),
    supabase
      .from('modules')
      .select('id, title, position')
      .eq('course_id', courseId)
      .order('position', { ascending: true }),
    supabase
      .from('course_pages')
      .select('id')
      .eq('course_id', courseId)
      .eq('is_published', true),
    supabase
      .from('course_page_views')
      .select('course_page_id')
      .eq('user_id', user.id),
    supabase
      .from('certificates')
      .select('id, issued_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle(),
  ])

  const completedIds = new Set((completions ?? []).map((c) => c.lesson_id))
  const viewedPageIds = new Set((pageViews ?? []).map((v) => v.course_page_id))

  const lessonList = lessons ?? []
  const moduleList = modules ?? []

  const moduleBreakdown = moduleList.map((mod) => {
    const modLessons = lessonList.filter((l) => l.module_id === mod.id)
    const completed = modLessons.filter((l) => completedIds.has(l.id)).length
    return {
      id: mod.id,
      title: mod.title,
      total: modLessons.length,
      completed,
      pct: modLessons.length === 0 ? 0 : Math.round((completed / modLessons.length) * 100),
    }
  })

  const totalLessons = lessonList.length
  const completedLessons = lessonList.filter((l) => completedIds.has(l.id)).length

  const pageList = pages ?? []
  const pagesRead = pageList.filter((p) => viewedPageIds.has(p.id)).length

  return NextResponse.json({
    overall: {
      total: totalLessons,
      completed: completedLessons,
      pct: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
    },
    pages: {
      total: pageList.length,
      read: pagesRead,
    },
    modules: moduleBreakdown,
    completed_lesson_ids: [...completedIds],
    certificate: certificate ?? null,
  })
}
