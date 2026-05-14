import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import LessonRenderer from '@/components/LessonRenderer'
import QuizTaker from '@/components/QuizTaker'
import SlidesSection from '@/components/SlidesSection'
import LessonSidebar from '@/components/LessonSidebar'
import SiteNav from '@/components/SiteNav'
import MarkCompleteButton from '@/components/MarkCompleteButton'
import type { Course, Lesson, User } from '@/lib/types'

interface Module { id: string; title: string; position: number }
interface CoursePage { id: string; slug: string | null; title: string; page_type: string; position: number }

export default async function LessonViewerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>
}) {
  const { slug, lessonSlug } = await params
  const clerkUser = await currentUser()
  if (!clerkUser) redirect(`/sign-in?redirect=/courses/${slug}/lessons/${lessonSlug}`)

  const supabase = createServerClient()
  const serviceSupabase = createServiceClient()

  const { data: course } = await supabase
    .from('courses').select('*').eq('slug', slug).eq('is_published', true).single<Course>()
  if (!course) notFound()

  const { data: dbUser } = await serviceSupabase
    .from('users').select('*').eq('clerk_id', clerkUser.id).single<User>()
  if (!dbUser) redirect('/sign-in')

  const isFree = course.price_cents === 0
  if (!isFree) {
    const { data: enrollment } = await serviceSupabase
      .from('enrollments').select('id').eq('user_id', dbUser.id).eq('course_id', course.id).single()
    if (!enrollment) redirect(`/courses/${slug}`)
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonSlug)
  const { data: lesson } = await supabase
    .from('lessons').select('*')
    .eq(isUuid ? 'id' : 'slug', lessonSlug)
    .eq('course_id', course.id).eq('is_published', true)
    .single<Lesson>()
  if (!lesson) notFound()
  if (isUuid && lesson.slug) redirect(`/courses/${slug}/lessons/${lesson.slug}`)

  // Fetch completion status for this lesson
  const { data: completionRecord } = await serviceSupabase
    .from('lesson_completions')
    .select('id')
    .eq('user_id', dbUser.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()
  const isCompleted = !!completionRecord

  const [lessonsRes, modulesRes, pagesRes] = await Promise.all([
    supabase.from('lessons').select('id, slug, title, position, module_id')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true })
      .returns<Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>[]>(),
    supabase.from('modules').select('id, title, position')
      .eq('course_id', course.id).order('position', { ascending: true }).returns<Module[]>(),
    supabase.from('course_pages').select('id, slug, title, page_type, position')
      .eq('course_id', course.id).eq('is_published', true).order('position', { ascending: true }),
  ])

  const allLessons = lessonsRes.data ?? []
  const modules = modulesRes.data ?? []
  const coursePages = (pagesRes.data ?? []) as CoursePage[]

  const beforeTypes = ['overview', 'introduction', 'syllabus', 'requirements']
  const beforePages = coursePages.filter((p) => beforeTypes.includes(p.page_type))
  const afterPages = coursePages.filter((p) => !beforeTypes.includes(p.page_type))

  const currentIndex = allLessons.findIndex((l) => l.slug === lessonSlug || l.id === lesson.id)

  // Unit info — which module this lesson belongs to
  const currentModule = lesson.module_id ? modules.find((m) => m.id === lesson.module_id) : null

  const prevLesson = allLessons[currentIndex - 1]
  const nextLesson = allLessons[currentIndex + 1]

  const lessonHref = (l: Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'module_id'>) =>
    l.slug ? `/courses/${slug}/lessons/${l.slug}` : `/courses/${slug}/lessons/${l.id}`

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
          beforePages={beforePages}
          afterPages={afterPages}
          currentLessonId={lesson.id}
          currentLessonSlug={lesson.slug ?? null}
        />

        <main className="lesson-main">
          {/* Lesson header */}
          <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {currentModule && (
                <span>{currentModule.title} · </span>
              )}<span>Lesson {currentIndex + 1} of {allLessons.length}</span>
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

          {/* Quiz */}
          <QuizTaker lessonId={lesson.id} />

          {/* Mark complete */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <MarkCompleteButton
              lessonId={lesson.id}
              courseId={lesson.course_id}
              initialCompleted={isCompleted}
            />
          </div>

          {/* Prev / Next */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: '3rem', paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)',
            gap: 8,
          }}>
            {prevLesson ? (
              <Link href={lessonHref(prevLesson)} style={{ minWidth: 0, maxWidth: '45vw' }}>
                <button className="btn btn-ghost" style={{ maxWidth: '100%', textAlign: 'left', overflow: 'hidden' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ flexShrink: 0 }}>←</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prevLesson.title}</span>
                  </span>
                </button>
              </Link>
            ) : <div />}

            {nextLesson ? (
              <Link href={lessonHref(nextLesson)} style={{ minWidth: 0, maxWidth: '45vw' }}>
                <button className="btn btn-ghost" style={{ maxWidth: '100%', textAlign: 'right', overflow: 'hidden' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextLesson.title}</span>
                    <span style={{ flexShrink: 0 }}>→</span>
                  </span>
                </button>
              </Link>
            ) : (
              <Link href={`/courses/${slug}`}>
                <button className="btn btn-primary">Complete course ✓</button>
              </Link>
            )}
          </div>
        </main>
      </div>
      </div>
    </>
  )
}
