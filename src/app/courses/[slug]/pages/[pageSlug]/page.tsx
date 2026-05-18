import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import LessonRenderer from '@/components/LessonRenderer'
import CoursePageReadToggle from '@/components/CoursePageReadToggle'
import LessonSidebar from '@/components/LessonSidebar'
import SiteNav from '@/components/SiteNav'
import { lessonHref, buildModuleSlugMap } from '@/lib/lessonUrl'
import type { Course, Lesson, User } from '@/lib/types'

interface CoursePage {
  id: string
  slug: string | null
  title: string
  page_type: string
  module_id: string | null
  content: Record<string, unknown> | null
  introduction: string | null
  is_published: boolean
  position: number
}

interface Module { id: string; title: string; position: number; slug: string | null }

export default async function CoursePageViewer({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>
}) {
  const { slug, pageSlug } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) redirect(`/sign-in?redirect=/courses/${slug}/pages/${pageSlug}`)

  const supabase = createServerClient()
  const serviceSupabase = createServiceClient()

  const { data: dbUser } = await serviceSupabase
    .from('users').select('*').eq('clerk_id', clerkUser.id).single<User>()
  if (!dbUser) redirect('/sign-in')

  const isInstructor = dbUser.role === 'instructor' || dbUser.role === 'admin'

  const courseBaseQuery = serviceSupabase.from('courses').select('*').eq('slug', slug)
  const { data: course } = await (isInstructor
    ? courseBaseQuery
    : courseBaseQuery.eq('is_published', true)
  ).single<Course>()
  if (!course) notFound()

  if (!isInstructor) {
    const isFree = course.price_cents === 0
    if (!isFree) {
      const { data: enrollment } = await serviceSupabase
        .from('enrollments').select('id').eq('user_id', dbUser.id).eq('course_id', course.id).single()
      if (!enrollment) redirect(`/courses/${slug}`)
    }
  }

  const pageBaseQuery = serviceSupabase.from('course_pages').select('*')
    .eq('slug', pageSlug).eq('course_id', course.id)
  const { data: page } = await (isInstructor
    ? pageBaseQuery
    : pageBaseQuery.eq('is_published', true)
  ).single<CoursePage>()
  if (!page) notFound()

  // Fetch all content for sidebar + navigation
  const [allPagesRes, lessonsRes, modulesRes] = await Promise.all([
    (() => {
      const q = serviceSupabase.from('course_pages').select('id, slug, title, page_type, module_id, position')
        .eq('course_id', course.id).order('position', { ascending: true })
      return isInstructor ? q : q.eq('is_published', true)
    })(),
    (() => {
      const q = serviceSupabase.from('lessons').select('id, slug, title, position, module_id')
        .eq('course_id', course.id).order('position', { ascending: true })
      return (isInstructor ? q : q.eq('is_published', true))
        .returns<Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>[]>()
    })(),
    serviceSupabase.from('modules').select('id, title, position, slug')
      .eq('course_id', course.id).order('position', { ascending: true }).returns<Module[]>(),
  ])

  const allPages = (allPagesRes.data ?? []) as CoursePage[]
  const allLessons = lessonsRes.data ?? []
  const modules = modulesRes.data ?? []
  const moduleSlugMap = buildModuleSlugMap(modules)

  const INTRO_TYPES = ['overview', 'introduction', 'syllabus', 'requirements']
  const introPages = allPages.filter((p) => INTRO_TYPES.includes(p.page_type))
  const conclusionPages = allPages.filter((p) => !INTRO_TYPES.includes(p.page_type))

  // Full sequence: intro pages → lessons (in module/position order) → conclusion pages
  const sequence: { type: 'page' | 'lesson'; id: string; slug: string | null; title: string; module_id?: string | null }[] = [
    ...introPages.map((p) => ({ type: 'page' as const, id: p.id, slug: p.slug, title: p.title })),
    ...allLessons.map((l) => ({ type: 'lesson' as const, id: l.id, slug: l.slug ?? null, title: l.title, module_id: l.module_id })),
    ...conclusionPages.map((p) => ({ type: 'page' as const, id: p.id, slug: p.slug, title: p.title })),
  ]

  const currentSeqIndex = sequence.findIndex((s) => s.id === page.id)
  const prevItem = sequence[currentSeqIndex - 1]
  const nextItem = sequence[currentSeqIndex + 1]

  const itemHref = (item: typeof sequence[0]) =>
    item.type === 'lesson'
      ? lessonHref(slug, { id: item.id, slug: item.slug, module_id: item.module_id ?? null }, moduleSlugMap)
      : (item.slug ? `/courses/${slug}/pages/${item.slug}` : `/courses/${slug}/pages/${item.id}`)

  return (
    <>
      <SiteNav />
      <div className="lesson-viewer-layout">
      <div className="lesson-viewer-outer">
        <LessonSidebar
          courseSlug={slug}
          courseTitle={course.title}
          lessons={allLessons}
          modules={modules}
          pages={allPages}
          currentLessonId=""
          currentLessonSlug={null}
          currentPageId={page.id}
        />

        <main className="lesson-main">
          {/* Page header */}
          <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {page.page_type}
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>{page.title}</h1>
            {page.introduction && (
              <p style={{ margin: '0.75rem 0 0', fontSize: 16, color: 'var(--text-2)', lineHeight: 1.7, fontStyle: 'italic' }}>
                {page.introduction}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="lesson-content">
            {page.content
              ? <LessonRenderer content={page.content} />
              : <p style={{ color: 'var(--text-3)' }}>This page has no content yet.</p>
            }
          </div>

          {/* Read toggle + prev/next */}
          <div style={{
            marginTop: '3rem', paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <CoursePageReadToggle pageId={page.id} courseId={course.id} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              {prevItem ? (
                <Link href={itemHref(prevItem)} style={{ minWidth: 0, maxWidth: '45vw' }}>
                  <button className="btn btn-ghost" style={{ maxWidth: '100%', textAlign: 'left', overflow: 'hidden' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ flexShrink: 0 }}>←</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prevItem.title}</span>
                    </span>
                  </button>
                </Link>
              ) : <div />}

              {nextItem ? (
                <Link href={itemHref(nextItem)} style={{ minWidth: 0, maxWidth: '45vw' }}>
                  <button className="btn btn-ghost" style={{ maxWidth: '100%', textAlign: 'right', overflow: 'hidden' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextItem.title}</span>
                      <span style={{ flexShrink: 0 }}>→</span>
                    </span>
                  </button>
                </Link>
              ) : (
                <Link href={`/courses/${slug}`}>
                  <button className="btn btn-primary">Back to course</button>
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
      </div>
    </>
  )
}
