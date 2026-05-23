import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import LessonRenderer from '@/components/LessonRenderer'
import CoursePageReadToggle from '@/components/CoursePageReadToggle'
import LessonSidebar from '@/components/LessonSidebar'
import SiteNav from '@/components/SiteNav'
import { buildCourseSequence, sequenceItemHref } from '@/lib/courseSequence'
import type { Course, Lesson, User } from '@/lib/types'

interface CoursePage {
  id: string; slug: string | null; title: string
  page_type: string; module_id: string | null
  content: Record<string, unknown> | null
  introduction: string | null; is_published: boolean; position: number
}
interface Module { id: string; title: string; position: number; slug: string | null }
interface Assessment {
  id: string; slug: string | null; title: string
  assessment_type: 'quiz' | 'exam' | 'practice'
  position: number; module_id: string | null
}

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

  const [allPagesRes, lessonsRes, modulesRes, assessmentsRes] = await Promise.all([
    serviceSupabase.from('course_pages')
      .select('id, slug, title, page_type, module_id, position')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true }),
    serviceSupabase.from('lessons')
      .select('id, slug, title, position, module_id')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true })
      .returns<Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>[]>(),
    serviceSupabase.from('modules')
      .select('id, title, position, slug')
      .eq('course_id', course.id).order('position', { ascending: true })
      .returns<Module[]>(),
    serviceSupabase.from('assessments')
      .select('id, slug, title, assessment_type, position, module_id')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true }),
  ])

  const allPages = (allPagesRes.data ?? []) as CoursePage[]
  const allLessons = lessonsRes.data ?? []
  const modules = modulesRes.data ?? []
  const assessments = (assessmentsRes.data ?? []) as Assessment[]

  // Canonical sequence
  const sequence = buildCourseSequence({ modules, lessons: allLessons, assessments, pages: allPages })

  const currentIndex = sequence.findIndex((s) => s.type === 'page' && s.id === page.id)
  const prevItem = currentIndex > 0 ? sequence[currentIndex - 1] : null
  const nextItem = currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null

  return (
    <>
      <SiteNav />
      <div className="lesson-viewer-layout">
        <div className="lesson-viewer-outer">
          <LessonSidebar
            courseSlug={slug}
            courseTitle={course.title}
            courseHomeUrl={isInstructor && !course.is_published ? `/admin/courses/${slug}` : undefined}
            lessons={allLessons}
            modules={modules}
            pages={allPages}
            assessments={assessments}
            currentLessonId=""
            currentLessonSlug={null}
            currentPageId={page.id}
          />

          <main className="lesson-main">
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

            <div className="lesson-content">
              {page.content
                ? <LessonRenderer content={page.content} />
                : <p style={{ color: 'var(--text-3)' }}>This page has no content yet.</p>
              }
            </div>

            <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <CoursePageReadToggle pageId={page.id} courseId={course.id} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                {prevItem ? (
                  <Link href={sequenceItemHref(slug, prevItem)} style={{ minWidth: 0, maxWidth: '45vw' }}>
                    <button className="btn btn-ghost" style={{ maxWidth: '100%', textAlign: 'left', overflow: 'hidden' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ flexShrink: 0 }}>←</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prevItem.title}</span>
                      </span>
                    </button>
                  </Link>
                ) : <div />}

                {nextItem ? (
                  <Link href={sequenceItemHref(slug, nextItem)} style={{ minWidth: 0, maxWidth: '45vw' }}>
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
