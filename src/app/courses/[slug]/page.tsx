import outlineStyles from '@/components/CourseOutline.module.css'
import CourseOutline from '@/components/CourseOutline'
import { buildCourseSequence, sequenceItemHref } from '@/lib/courseSequence'
import { createServiceClient } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Course, Lesson, User } from '@/lib/types'
import SiteNav from '@/components/SiteNav'

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
  slug: string | null
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceClient()
  const { data: course } = await supabase.from('courses').select('title, description').eq('slug', slug).eq('is_published', true).single()
  return { title: course?.title ?? 'Course', description: course?.description }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createServiceClient()
  const clerkUser = await currentUser()

  const { data: course } = await supabase
    .from('courses').select('*').eq('slug', slug).eq('is_published', true).single<Course>()
  if (!course) notFound()

  const [lessonsRes, pagesRes, modulesRes, assessmentsRes] = await Promise.all([
    supabase.from('lessons')
      .select('id, slug, title, position, is_published, module_id, placement, is_required, estimated_minutes')
      .eq('course_id', course.id).eq('is_published', true)
      .order('position', { ascending: true })
      .returns<Pick<Lesson, 'id' | 'slug' | 'title' | 'position' | 'is_published' | 'module_id'>[]>(),
    supabase.from('course_pages')
      .select('id, slug, title, page_type, position, module_id, placement, is_required, estimated_minutes')
      .eq('course_id', course.id).eq('is_published', true)
      .order('position', { ascending: true }),
    supabase.from('modules')
      .select('id, title, position, slug')
      .eq('course_id', course.id).order('position', { ascending: true })
      .returns<Module[]>(),
    supabase.from('assessments')
      .select('id, slug, title, assessment_type, is_graded, position, module_id, placement, is_required, estimated_minutes')
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

  const first = buildCourseSequence({ modules, lessons, pages: coursePages, assessments })[0]
  const firstHref = first ? sequenceItemHref(slug, first) : null

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
          <h1 style={{ margin: '0 0 0.75rem', letterSpacing: '0.02em' }}>{course.title}</h1>
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
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0, letterSpacing: '0.025em' }}>Course contents</h2>
          <span className={outlineStyles.overviewMeta} style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
            {assessments.length > 0 && ` · ${assessments.length} assessment${assessments.length !== 1 ? 's' : ''}`}
            {coursePages.length > 0 && ` · ${coursePages.length} page${coursePages.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <CourseOutline courseSlug={slug} modules={modules} lessons={lessons} pages={coursePages} assessments={assessments} canAccess={canAccess} />
      </main>
    </>
  )
}
