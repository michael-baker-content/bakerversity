import { createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import LessonRenderer from '@/components/LessonRenderer'
import SlidesSection from '@/components/SlidesSection'
import LessonSidebar from '@/components/LessonSidebar'
import SiteNav from '@/components/SiteNav'
import MarkCompleteButton from '@/components/MarkCompleteButton'
import { buildCourseSequence, sequenceItemHref } from '@/lib/courseSequence'
import type { Course, Lesson, User } from '@/lib/types'

interface Module { id: string; title: string; position: number; slug: string | null }
interface CoursePage {
  id: string; slug: string | null; title: string
  page_type: string; module_id: string | null; position: number
}
interface Assessment {
  id: string; slug: string | null; title: string
  assessment_type: 'quiz' | 'exam' | 'practice'
  position: number; module_id: string | null
}

export default async function LessonViewerPage({
  params,
}: {
  params: Promise<{ slug: string; moduleSlug: string; lessonSlug: string }>
}) {
  const { slug, moduleSlug, lessonSlug } = await params
  const clerkUser = await currentUser()
  const serviceSupabase = createServiceClient()

  // Resolve user (may be null for unauthenticated visitors)
  let dbUser: User | null = null
  if (clerkUser) {
    const { data } = await serviceSupabase
      .from('users').select('*').eq('clerk_id', clerkUser.id).single<User>()
    dbUser = data
  }

  const isInstructor = dbUser?.role === 'instructor' || dbUser?.role === 'admin'

  // Load course
  const courseQuery = serviceSupabase.from('courses').select('*').eq('slug', slug)
  const { data: course } = await (isInstructor
    ? courseQuery
    : courseQuery.eq('is_published', true)
  ).single<Course>()
  if (!course) notFound()

  // Auth gate: unauthenticated visitors can only proceed on public free courses
  if (!dbUser) {
    if (!course.is_public || course.price_cents > 0) {
      redirect(`/sign-in?redirect=/courses/${slug}/${moduleSlug}/${lessonSlug}`)
    }
  }

  // Enrolled-only check for paid courses (authenticated non-instructors)
  if (dbUser && !isInstructor && course.price_cents > 0) {
    const { data: enrollment } = await serviceSupabase
      .from('enrollments').select('id').eq('user_id', dbUser.id).eq('course_id', course.id).single()
    if (!enrollment) redirect(`/courses/${slug}`)
  }

  // Resolve module
  const { data: module_ } = await serviceSupabase
    .from('modules')
    .select('id, title, position, slug')
    .eq('course_id', course.id)
    .eq('slug', moduleSlug)
    .single<Module>()

  let lesson: Lesson | null = null

  if (module_) {
    const q = serviceSupabase.from('lessons').select('*')
      .eq('slug', lessonSlug).eq('module_id', module_.id)
    const { data } = await (isInstructor ? q : q.eq('is_published', true)).single<Lesson>()
    lesson = data
  }

  if (!lesson) {
    const q = serviceSupabase.from('lessons').select('*')
      .eq('slug', lessonSlug).eq('course_id', course.id)
    const { data } = await (isInstructor ? q : q.eq('is_published', true)).single<Lesson>()
    lesson = data
  }

  if (!lesson) notFound()

  // Completion status — only for authenticated users
  let isCompleted = false
  if (dbUser) {
    const { data: completionRecord } = await serviceSupabase
      .from('lesson_completions').select('id')
      .eq('user_id', dbUser.id).eq('lesson_id', lesson.id).maybeSingle()
    isCompleted = !!completionRecord
  }

  // Load sidebar/sequence data — always published-only
  const [lessonsRes, modulesRes, pagesRes, assessmentsRes] = await Promise.all([
    serviceSupabase.from('lessons')
      .select('id, slug, title, position, module_id')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true })
      .returns<Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>[]>(),
    serviceSupabase.from('modules')
      .select('id, title, position, slug')
      .eq('course_id', course.id).order('position', { ascending: true })
      .returns<Module[]>(),
    serviceSupabase.from('course_pages')
      .select('id, slug, title, page_type, module_id, position')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true }),
    serviceSupabase.from('assessments')
      .select('id, slug, title, assessment_type, position, module_id')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true }),
  ])

  const allLessons = lessonsRes.data ?? []
  const modules = modulesRes.data ?? []
  const coursePages = (pagesRes.data ?? []) as CoursePage[]
  const assessments = (assessmentsRes.data ?? []) as Assessment[]

  const sequence = buildCourseSequence({ modules, lessons: allLessons, assessments, pages: coursePages })

  const currentIndex = sequence.findIndex(
    (s) => s.type === 'lesson' && (s.id === lesson!.id || s.slug === lesson!.slug)
  )
  const prevItem = currentIndex > 0 ? sequence[currentIndex - 1] : null
  const nextItem = currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null

  const prevHref = prevItem ? sequenceItemHref(slug, prevItem) : null
  const nextHref = nextItem ? sequenceItemHref(slug, nextItem) : null

  const moduleLessonItems = sequence.filter(
    (s) => s.type === 'lesson' && s.module_id === lesson!.module_id
  )
  const lessonIndex = moduleLessonItems.findIndex(
    (s) => s.id === lesson!.id || s.slug === lesson!.slug
  )
  const lessonTotal = moduleLessonItems.length

  // Redirect URL for sign-in prompts — takes visitor back here after signing in
  const currentPath = `/courses/${slug}/${moduleSlug}/${lessonSlug}`

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
            pages={coursePages}
            assessments={assessments}
            currentLessonId={lesson.id}
            currentLessonSlug={lesson.slug ?? null}
          />

          <main className="lesson-main">
            {/* Header */}
            <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                fontSize: 11, color: 'var(--text-3)', marginBottom: '0.5rem',
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
              }}>
                {module_ && <span>{module_.title} · </span>}
                <span>Lesson {lessonIndex + 1} of {lessonTotal}</span>
              </div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>{lesson.title}</h1>
              {lesson.introduction && (
                <p style={{ margin: '0.75rem 0 0', fontSize: 16, color: 'var(--text-2)', lineHeight: 1.7, fontStyle: 'italic' }}>
                  {lesson.introduction}
                </p>
              )}
            </div>

            {/* YouTube */}
            {lesson.youtube_url && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${lesson.youtube_url.includes('youtu.be/') ? lesson.youtube_url.split('youtu.be/')[1] : lesson.youtube_url.split('v=')[1]?.split('&')[0]}`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allowFullScreen title="Lesson video"
                  />
                </div>
              </div>
            )}

            {/* Slides */}
            {lesson.slides_url && (
              <div style={{ marginBottom: '2rem' }}>
                {lesson.slides_meta?.title && (
                  <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>{lesson.slides_meta.title}</h2>
                )}
                {lesson.slides_meta?.description && (
                  <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 0.75rem' }}>{lesson.slides_meta.description}</p>
                )}
                <SlidesSection url={lesson.slides_url} />
              </div>
            )}

            {/* Content */}
            <div className="lesson-content">
              {lesson.content
                ? <LessonRenderer content={lesson.content as Record<string, unknown>} />
                : <p style={{ color: 'var(--text-3)' }}>This lesson has no content yet.</p>
              }
            </div>

            {/* Progress tracking — authenticated users get the button; guests get a sign-in nudge */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              {dbUser ? (
                <MarkCompleteButton
                  lessonId={lesson.id}
                  courseId={lesson.course_id}
                  initialCompleted={isCompleted}
                />
              ) : (
                <Link
                  href={`/sign-in?redirect=${encodeURIComponent(currentPath)}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px',
                    borderRadius: 'var(--radius)',
                    border: '2px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-3)',
                    fontSize: 14, fontWeight: 500,
                    transition: 'border-color 0.15s, color 0.15s',
                  }}>
                    <span>→</span> Sign in to track your progress
                  </div>
                </Link>
              )}
            </div>

            {/* Prev / Next */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: '3rem', paddingTop: '1.5rem',
              borderTop: '1px solid var(--border)',
              gap: 8,
            }}>
              {prevHref ? (
                <Link href={prevHref} style={{ minWidth: 0, maxWidth: '45vw' }}>
                  <button className="btn btn-ghost" style={{ maxWidth: '100%', textAlign: 'left' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flexShrink: 0 }}>←</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prevItem!.title}
                      </span>
                    </span>
                  </button>
                </Link>
              ) : <div />}

              {nextHref ? (
                <Link href={nextHref} style={{ minWidth: 0, maxWidth: '45vw' }}>
                  <button className="btn btn-ghost" style={{ maxWidth: '100%', textAlign: 'right' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nextItem!.title}
                      </span>
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
          </main>
        </div>
      </div>
    </>
  )
}
