import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const supabase = createServiceClient()

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Get all enrolled courses (with basic course info)
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      course_id,
      enrolled_at,
      courses (
        id, title, slug, description, is_published
      )
    `)
    .eq('user_id', user.id)

  if (!enrollments || enrollments.length === 0) {
    return NextResponse.json({ courses: [] })
  }

  const courseIds = enrollments.map((e) => e.course_id)

  // Batch-fetch all lessons for enrolled courses
  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id, course_id, module_id')
    .in('course_id', courseIds)
    .eq('is_published', true)

  // Batch-fetch all lesson completions for this student
  const { data: allCompletions } = await supabase
    .from('lesson_completions')
    .select('lesson_id, course_id')
    .eq('user_id', user.id)
    .in('course_id', courseIds)

  // Batch-fetch all modules
  const moduleIds = [...new Set((allLessons ?? []).map((l) => l.module_id).filter(Boolean))]
  const { data: allModules } = await supabase
    .from('modules')
    .select('id, title, course_id, position')
    .in('id', moduleIds)
    .order('position', { ascending: true })

  // Batch-fetch course pages
  const { data: allPages } = await supabase
    .from('course_pages')
    .select('id, course_id')
    .in('course_id', courseIds)
    .eq('is_published', true)

  // Batch-fetch page views
  const { data: allPageViews } = await supabase
    .from('course_page_views')
    .select('course_page_id')
    .eq('user_id', user.id)

  // Fetch certificates
  const { data: certificates } = await supabase
    .from('certificates')
    .select('course_id, issued_at, certificate_url')
    .eq('user_id', user.id)
    .in('course_id', courseIds)

  // Index by course_id for O(1) lookup
  const completionsByCourse = new Map<string, Set<string>>()
  for (const c of allCompletions ?? []) {
    if (!completionsByCourse.has(c.course_id)) completionsByCourse.set(c.course_id, new Set())
    completionsByCourse.get(c.course_id)!.add(c.lesson_id)
  }

  const lessonsByCourse = new Map<string, typeof allLessons>()
  for (const l of allLessons ?? []) {
    if (!lessonsByCourse.has(l.course_id)) lessonsByCourse.set(l.course_id, [])
    lessonsByCourse.get(l.course_id)!.push(l)
  }

  const modulesByCourse = new Map<string, typeof allModules>()
  for (const m of allModules ?? []) {
    if (!modulesByCourse.has(m.course_id)) modulesByCourse.set(m.course_id, [])
    modulesByCourse.get(m.course_id)!.push(m)
  }

  const pagesByCourse = new Map<string, typeof allPages>()
  for (const p of allPages ?? []) {
    if (!pagesByCourse.has(p.course_id)) pagesByCourse.set(p.course_id, [])
    pagesByCourse.get(p.course_id)!.push(p)
  }

  const viewedPageIds = new Set((allPageViews ?? []).map((v) => v.course_page_id))

  const certByCourse = new Map(
    (certificates ?? []).map((c) => [c.course_id, c])
  )

  // Build response
  const courses = enrollments.map((enrollment) => {
    const course = enrollment.courses as unknown as {
      id: string; title: string; slug: string; description: string; is_published: boolean
    }
    const courseId = course.id

    const lessons = lessonsByCourse.get(courseId) ?? []
    const completedIds = completionsByCourse.get(courseId) ?? new Set()
    const modules = modulesByCourse.get(courseId) ?? []
    const pages = pagesByCourse.get(courseId) ?? []
    const allPagesRead = pages.every((p) => viewedPageIds.has(p.id))

    const completedCount = lessons.filter((l) => completedIds.has(l.id)).length
    const totalCount = lessons.length
    const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

    // Per-module breakdown
    const moduleBreakdown = modules.map((mod) => {
      const modLessons = lessons.filter((l) => l.module_id === mod.id)
      const modCompleted = modLessons.filter((l) => completedIds.has(l.id)).length
      return {
        id: mod.id,
        title: mod.title,
        total: modLessons.length,
        completed: modCompleted,
        pct: modLessons.length === 0 ? 0 : Math.round((modCompleted / modLessons.length) * 100),
      }
    })

    const cert = certByCourse.get(courseId)

    return {
      course: {
        id: courseId,
        title: course.title,
        slug: course.slug,
        description: course.description,
      },
      enrolled_at: enrollment.enrolled_at,
      progress: {
        completed: completedCount,
        total: totalCount,
        pct: progressPct,
        pages_complete: allPagesRead,
        pages_total: pages.length,
      },
      modules: moduleBreakdown,
      certificate: cert ?? null,
    }
  })

  return NextResponse.json({ courses })
}
