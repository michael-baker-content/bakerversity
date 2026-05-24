import { createServerClient, createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Course, Lesson, User } from '@/lib/types'
import SiteNav from '@/components/SiteNav'
import ContentRow from '@/components/ContentRow'

interface CoursePage {
  id: string
  slug: string | null
  title: string
  page_type: string
  position: number
  module_id: string | null
}

interface Module {
  id: string
  title: string
  position: number
}

interface Assessment {
  id: string
  slug: string | null
  title: string
  assessment_type: 'quiz' | 'exam' | 'practice'
  is_graded: boolean
  position: number
  module_id: string | null
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  overview: 'Overview', introduction: 'Introduction', syllabus: 'Syllabus',
  requirements: 'Requirements', resources: 'Resources', conclusion: 'Conclusion', custom: 'Page',
}

const PAGE_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  overview: { bg: 'var(--indigo-muted)', color: 'var(--indigo)' },
  introduction: { bg: 'var(--amber-muted)', color: 'var(--amber-hover)' },
  syllabus: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
  requirements: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
  resources: { bg: 'var(--indigo-muted)', color: 'var(--indigo)' },
  conclusion: { bg: 'var(--amber-muted)', color: 'var(--amber-hover)' },
  custom: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
}

const ASSESSMENT_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  quiz: { bg: 'var(--amber-muted)', color: 'var(--amber-hover)' },
  exam: { bg: 'var(--indigo-muted)', color: 'var(--indigo)' },
  practice: { bg: 'var(--surface-2)', color: 'var(--text-3)' },
}

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz', exam: 'Exam', practice: 'Practice',
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServerClient()
  const { data: course } = await supabase.from('courses').select('title, description').eq('slug', slug).single()
  return { title: course?.title ?? 'Course', description: course?.description }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createServerClient()
  const clerkUser = await currentUser()

  const { data: course } = await supabase
    .from('courses').select('*').eq('slug', slug).eq('is_published', true).single<Course>()
  if (!course) notFound()

  const [lessonsRes, pagesRes, modulesRes, assessmentsRes] = await Promise.all([
    supabase.from('lessons')
      .select('id, slug, title, position, is_published, module_id')
      .eq('course_id', course.id).eq('is_published', true)
      .order('position', { ascending: true })
      .returns<Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'is_published' | 'module_id'>[]>(),
    supabase.from('course_pages')
      .select('id, slug, title, page_type, position, module_id')
      .eq('course_id', course.id).eq('is_published', true)
      .order('position', { ascending: true }),
    supabase.from('modules')
      .select('id, title, position')
      .eq('course_id', course.id).order('position', { ascending: true })
      .returns<Module[]>(),
    supabase.from('assessments')
      .select('id, slug, title, assessment_type, is_graded, position, module_id')
      .eq('course_id', course.id).eq('is_published', true)
      .order('position', { ascending: true }),
  ])

  const lessons = lessonsRes.data ?? []
  const coursePages = (pagesRes.data ?? []) as CoursePage[]
  const modules = modulesRes.data ?? []
  const assessments = (assessmentsRes.data ?? []) as Assessment[]

  let isEnrolled = false
  let dbUser: User | null = null
  if (clerkUser) {
    const serviceSupabase = createServiceClient()
    const { data: u } = await serviceSupabase
      .from('users').select('*').eq('clerk_id', clerkUser.id).single<User>()
    dbUser = u
    if (dbUser) {
      const { data: enrollment } = await serviceSupabase
        .from('enrollments').select('id').eq('user_id', dbUser.id).eq('course_id', course.id).single()
      isEnrolled = !!enrollment
    }
  }

  const isFree = course.price_cents === 0
  const canAccess = isEnrolled || isFree

  const beforeTypes = ['overview', 'introduction', 'syllabus', 'requirements']
  const courseLevelPages = coursePages.filter((p) => !p.module_id)
  const beforePages = courseLevelPages.filter((p) => beforeTypes.includes(p.page_type))
  const afterPages = courseLevelPages.filter((p) => !beforeTypes.includes(p.page_type))

  // Build module groups with interleaved lessons + assessments sorted by position
  type SequenceItem =
    | { kind: 'lesson'; item: typeof lessons[0] }
    | { kind: 'assessment'; item: Assessment }

  const moduleGroups = modules.map((m) => {
    const modLessons = lessons.filter((l) => l.module_id === m.id)
    const modAssessments = assessments.filter((a) => a.module_id === m.id)
    const sequence: SequenceItem[] = [
      ...modLessons.map((l): SequenceItem => ({ kind: 'lesson', item: l })),
      ...modAssessments.map((a): SequenceItem => ({ kind: 'assessment', item: a })),
    ].sort((a, b) => a.item.position - b.item.position)
    return { module: m, sequence }
  }).filter((g) => g.sequence.length > 0)

  const unassignedLessons = lessons.filter((l) => !l.module_id)

  // Total item count for the header
  const totalItems = lessons.length + assessments.length

  // First content for "Start learning" button
  const firstHref = (() => {
    if (beforePages[0]) {
      const p = beforePages[0]
      return p.slug ? `/courses/${slug}/pages/${p.slug}` : `/courses/${slug}/pages/${p.id}`
    }
    // First item in module sequence
    for (const { sequence } of moduleGroups) {
      if (sequence.length > 0) {
        const first = sequence[0]
        if (first.kind === 'lesson') {
          return first.item.slug
            ? `/courses/${slug}/lessons/${first.item.slug}`
            : `/courses/${slug}/lessons/${first.item.id}`
        } else {
          return first.item.slug
            ? `/courses/${slug}/assessments/${first.item.slug}`
            : null
        }
      }
    }
    if (unassignedLessons[0]) {
      const l = unassignedLessons[0]
      return l.slug ? `/courses/${slug}/lessons/${l.slug}` : `/courses/${slug}/lessons/${l.id}`
    }
    return null
  })()

  const lessonHref = (l: typeof lessons[0]) =>
    l.slug ? `/courses/${slug}/lessons/${l.slug}` : `/courses/${slug}/lessons/${l.id}`
  const pageHref = (p: CoursePage) =>
    p.slug ? `/courses/${slug}/pages/${p.slug}` : `/courses/${slug}/pages/${p.id}`
  const assessmentHref = (a: Assessment) =>
    a.slug ? `/courses/${slug}/assessments/${a.slug}` : null

  const sectionHeader: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    padding: '14px 0 6px', borderTop: '1px solid var(--border)',
    marginTop: 4,
  }
  const moduleHeader: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    padding: '10px 0 5px', borderTop: '1px solid var(--border)',
    marginTop: 2, paddingLeft: 4,
  }

  let itemCounter = 0

  return (
    <>
      <SiteNav active="courses" />
      <main className="page" style={{ maxWidth: 720 }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: '1.5rem' }}>
          <Link href="/courses" style={{ color: 'var(--text-3)' }}>Courses</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: 'var(--text-2)' }}>{course.title}</span>
        </div>

        {/* Course header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.75rem' }}>{course.title}</h1>
          {course.description && (
            <p style={{ color: 'var(--text-2)', fontSize: 16, lineHeight: 1.7, margin: 0 }}>
              {course.description}
            </p>
          )}
        </div>

        {/* Enroll CTA */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-serif)', color: 'var(--text)', marginBottom: 2 }}>
              {isFree ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {isEnrolled ? 'You are enrolled' : isFree ? 'Free access' : 'One-time purchase'}
              {' · '}{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
              {assessments.length > 0 && ` · ${assessments.length} assessment${assessments.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!clerkUser && (
              <Link href={`/sign-in?redirect=/courses/${slug}`}>
                <button className="btn btn-outline">Sign in to enroll</button>
              </Link>
            )}
            {clerkUser && !isEnrolled && !isFree && (
              <Link href={`/api/checkout?courseId=${course.id}`}>
                <button className="btn btn-primary">
                  Enroll — ${(course.price_cents / 100).toFixed(2)}
                </button>
              </Link>
            )}
            {canAccess && firstHref && (
              <Link href={firstHref}>
                <button className="btn btn-primary">
                  {isEnrolled ? 'Continue →' : 'Start learning →'}
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Contents */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0 }}>Course contents</h2>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
            {assessments.length > 0 && ` · ${assessments.length} assessment${assessments.length !== 1 ? 's' : ''}`}
            {coursePages.length > 0 && ` · ${coursePages.length} page${coursePages.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Before pages */}
          {beforePages.length > 0 && (
            <>
              <div style={sectionHeader}>Introduction</div>
              {beforePages.map((page) => (
                <ContentRow
                  key={page.id}
                  href={canAccess ? pageHref(page) : undefined}
                  locked={!canAccess}
                  label={PAGE_TYPE_LABELS[page.page_type]}
                  labelColors={PAGE_TYPE_COLORS[page.page_type]}
                  title={page.title}
                />
              ))}
            </>
          )}

          {/* Module groups — interleaved lessons and assessments */}
          {(unassignedLessons.length > 0 || moduleGroups.length > 0) && (
            <div style={sectionHeader}>Lessons</div>
          )}

          {unassignedLessons.map((lesson) => {
            itemCounter++
            return (
              <ContentRow
                key={lesson.id}
                href={canAccess ? lessonHref(lesson) : undefined}
                locked={!canAccess}
                index={itemCounter}
                title={lesson.title}
              />
            )
          })}

          {moduleGroups.map(({ module, sequence }) => {
            itemCounter = 0
            return (
              <div key={module.id}>
                <div style={moduleHeader}>{module.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {sequence.map((entry) => {
                    if (entry.kind === 'lesson') {
                      itemCounter++
                      return (
                        <ContentRow
                          key={entry.item.id}
                          href={canAccess ? lessonHref(entry.item) : undefined}
                          locked={!canAccess}
                          index={itemCounter}
                          title={entry.item.title}
                          indented
                        />
                      )
                    }
                    // Assessment
                    const a = entry.item
                    const href = assessmentHref(a)
                    return (
                      <ContentRow
                        key={a.id}
                        href={canAccess && href ? href : undefined}
                        locked={!canAccess || !href}
                        label={ASSESSMENT_TYPE_LABELS[a.assessment_type]}
                        labelColors={ASSESSMENT_TYPE_COLORS[a.assessment_type]}
                        title={a.title}
                        indented
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* After pages */}
          {afterPages.length > 0 && (
            <>
              <div style={{ ...sectionHeader, marginTop: 8 }}>Conclusion</div>
              {afterPages.map((page) => (
                <ContentRow
                  key={page.id}
                  href={canAccess ? pageHref(page) : undefined}
                  locked={!canAccess}
                  label={PAGE_TYPE_LABELS[page.page_type]}
                  labelColors={PAGE_TYPE_COLORS[page.page_type]}
                  title={page.title}
                />
              ))}
            </>
          )}
        </div>
      </main>
    </>
  )
}
